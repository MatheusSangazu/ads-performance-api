import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import prisma from '../config/db.js';
import { fetchAdMedia } from '../integrations/metaApi.js';
import type { AdMedia } from '../integrations/metaApi.js';

export interface DownloadResult {
  adId: string;
  clientId: string;
  filename: string;
  relativeUrl: string;
  creativeType: string;
  contentType: string;
  data: Buffer;
}

const downloadLocks = new Map<string, Promise<DownloadResult | null>>();

export function getCreativesDir(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dir = path.resolve(__dirname, '../../uploads/creatives');
  if (!fsSync.existsSync(dir)) fsSync.mkdirSync(dir, { recursive: true });
  return dir;
}

export function extensionFromContentType(ct: string): string {
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('mp4')) return 'mp4';
  return 'jpg';
}

async function downloadSingleMedia(
  media: AdMedia,
  clientId: string,
  dir: string,
): Promise<DownloadResult | null> {
  let sourceUrl: string;

  if (media.type === 'video' && media.videoUrl) {
    sourceUrl = media.videoUrl;
  } else if (media.imageUrl) {
    sourceUrl = media.imageUrl;
  } else {
    return null;
  }

  const resp = await axios.get(sourceUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
    maxContentLength: 50 * 1024 * 1024,
  });

  const ct = resp.headers['content-type'] || '';
  const ext = extensionFromContentType(ct);
  const isVideo = media.type === 'video' || ct.includes('mp4');
  const creativeType = isVideo ? 'video' : 'image';

  const filename = `${clientId}_${media.adId}.${ext}`;
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, resp.data);

  if (isVideo && media.thumbnailUrl) {
    try {
      const thumbRes = await axios.get(media.thumbnailUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      await fs.writeFile(
        path.join(dir, `${clientId}_${media.adId}_thumb.jpg`),
        thumbRes.data,
      );
    } catch (err: any) {
      console.warn(
        `[CREATIVE] Thumbnail failed for ${media.adId}: ${err.message}`,
      );
    }
  }

  return {
    adId: media.adId,
    clientId,
    filename,
    relativeUrl: `/creatives/${filename}`,
    creativeType,
    contentType: ct,
    data: resp.data,
  };
}

async function persistResult(result: DownloadResult): Promise<void> {
  await prisma.adPerformance.updateMany({
    where: { adId: result.adId },
    data: {
      creativeUrl: result.relativeUrl,
      creativeType: result.creativeType,
    },
  });
}

export async function downloadCreativeOnDemand(
  adId: string,
): Promise<DownloadResult | null> {
  const existing = downloadLocks.get(adId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const row = await prisma.adPerformance.findFirst({
        where: { adId },
        select: { clientId: true },
      });
      if (!row) return null;

      const { resolveToken } = await import('../utils/tokenUtils.js');
      const { accessToken } = await resolveToken(row.clientId);
      const mediaList = await fetchAdMedia(row.clientId, accessToken, [adId]);

      if (mediaList.length === 0) return null;

      const dir = getCreativesDir();
      const result = await downloadSingleMedia(mediaList[0], row.clientId, dir);

      if (result) {
        await persistResult(result);
      }

      return result;
    } catch (err: any) {
      console.warn(
        `[CREATIVE] Falha ao baixar sob demanda ${adId}: ${err.message}`,
      );
      return null;
    } finally {
      downloadLocks.delete(adId);
    }
  })();

  downloadLocks.set(adId, promise);
  return promise;
}

export async function downloadCreativesBatch(
  clientId: string,
  accessToken: string,
  adIds: string[],
  concurrency: number = 5,
  onProgress?: (downloaded: number, total: number) => void,
): Promise<number> {
  if (adIds.length === 0) return 0;

  const uniqueAdIds = [...new Set(adIds)];
  const mediaList = await fetchAdMedia(clientId, accessToken, uniqueAdIds);
  if (mediaList.length === 0) return 0;

  const dir = getCreativesDir();
  let downloaded = 0;

  for (let i = 0; i < mediaList.length; i += concurrency) {
    const chunk = mediaList.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      chunk.map((media) => downloadSingleMedia(media, clientId, dir)),
    );

    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled' && r.value) {
        await persistResult(r.value);
        downloaded++;
      } else if (r.status === 'rejected') {
        const failedAdId = chunk[j]?.adId || 'unknown';
        console.warn(
          `[CREATIVE] Failed to download ${failedAdId}: ${r.reason?.message || r.reason}`,
        );
      }
    }

    onProgress?.(downloaded, mediaList.length);
  }

  return downloaded;
}
