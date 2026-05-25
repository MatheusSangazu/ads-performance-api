import axios from 'axios';
import type { MetaApiResponse, MetaPreviewResponse } from '../types/index.js';
import { retry } from '../utils/retry.js';

const META_API_BASE = 'https://graph.facebook.com/v25.0';

export async function validateAccount(
  actId: string,
  accessToken: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    await axios.get(`${META_API_BASE}/${actId}`, {
      params: {
        access_token: accessToken,
        fields: 'account_status,name',
      },
    });
    return { valid: true };
  } catch (err: any) {
    const metaMsg = err?.response?.data?.error?.message || err.message;
    return { valid: false, error: metaMsg };
  }
}

export async function fetchAllInsights(
  actId: string,
  accessToken: string,
  since: string,
  until: string,
  breakdowns?: string[],
): Promise<{ data: import('../types/index.js').MetaInsight[] }> {
  const allInsights: import('../types/index.js').MetaInsight[] = [];

  let url: string | null = `${META_API_BASE}/${actId}/insights`;
  let params: Record<string, string> = {
    access_token: accessToken,
    level: 'ad',
    fields: 'ad_name,ad_id,campaign_name,campaign_id,actions,action_values,spend,reach,impressions,date_start,ctr',
    time_range: JSON.stringify({ since, until }),
    time_increment: '1',
    action_report_time: 'conversion',
    limit: '500',
  };

  if (breakdowns && breakdowns.length > 0) {
    params.breakdowns = breakdowns.join(',');
  }

  let page = 1;

  while (url) {
    const response = await retry(() =>
      axios.get<MetaApiResponse>(url!, { params }).catch((err) => {
        if (err.response) {
          console.error(`   [ERROR] Meta API ${err.response.status}:`, JSON.stringify(err.response.data, null, 2));
        }
        throw err;
      }),
    );

    const insights = response.data.data || [];
    allInsights.push(...insights);

    console.log(`   📄 Página ${page}: +${insights.length} registros (total: ${allInsights.length})`);

    const nextUrl = response.data.paging?.next;
    if (nextUrl) {
      url = nextUrl;
      params = {};
      page++;
    } else {
      url = null;
    }
  }

  return { data: allInsights };
}

interface AdStatusData {
  previewLink: string;
  adStatus: string;
  campaignId: string;
}

interface MetaAdStatusResponse {
  preview_shareable_link?: string;
  effective_status?: string;
  campaign?: { effective_status?: string };
}

export async function fetchPreviewLink(
  adId: string,
  accessToken: string,
): Promise<string> {
  try {
    const res = await retry(() =>
      axios.get<MetaPreviewResponse>(`${META_API_BASE}/${adId}`, {
        params: {
          access_token: accessToken,
          fields: 'preview_shareable_link',
        },
      }),
    );
    return res.data.preview_shareable_link || '';
  } catch {
    return '';
  }
}

export async function fetchAdStatus(
  adId: string,
  accessToken: string,
): Promise<AdStatusData> {
  try {
    const res = await retry(() =>
      axios.get<MetaAdStatusResponse>(`${META_API_BASE}/${adId}`, {
        params: {
          access_token: accessToken,
          fields: 'preview_shareable_link,effective_status,campaign_id',
        },
      }),
    );

    return {
      previewLink: res.data.preview_shareable_link || '',
      adStatus: res.data.effective_status || 'UNKNOWN',
      campaignId: (res.data as any).campaign_id || '',
    };
  } catch (err) {
    console.error(`   [STATUS] Erro ao buscar status do ad ${adId}:`, err instanceof Error ? err.message : String(err));
    return { previewLink: '', adStatus: 'UNKNOWN', campaignId: '' };
  }
}

export async function fetchCampaignStatus(
  campaignId: string,
  accessToken: string,
): Promise<string> {
  try {
    const res = await retry(() =>
      axios.get(`${META_API_BASE}/${campaignId}`, {
        params: {
          access_token: accessToken,
          fields: 'effective_status',
        },
      }),
    );
    return res.data?.effective_status || 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}

interface CreativeThumbnail {
  adId: string;
  thumbnailUrl: string;
}

export async function fetchCreativeThumbnails(
  actId: string,
  accessToken: string,
  adIds: string[],
): Promise<CreativeThumbnail[]> {
  if (adIds.length === 0) return [];

  const uniqueAdIds = [...new Set(adIds)];
  const results: CreativeThumbnail[] = [];

  const batchSize = 50;
  for (let i = 0; i < uniqueAdIds.length; i += batchSize) {
    const batch = uniqueAdIds.slice(i, i + batchSize);
    const ids = batch.join(',');

    try {
      const res = await retry(() =>
        axios.get(`${META_API_BASE}`, {
          params: {
            access_token: accessToken,
            ids,
            fields: 'creative{id,thumbnail_url}',
          },
        }),
      );

      const data = res.data;
      for (const adId of batch) {
        const adData = data[adId];
        if (adData?.creative?.thumbnail_url) {
          results.push({
            adId,
            thumbnailUrl: adData.creative.thumbnail_url,
          });
        }
      }
    } catch (err: any) {
      console.warn(`[CREATIVE] Failed to fetch batch: ${err?.response?.status || err.message}`);
    }
  }

  return results;
}

export interface AdMedia {
  adId: string;
  type: 'image' | 'video';
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl: string;
}

function extractVideoIds(creative: any): string[] {
  const ids: string[] = [];
  if (creative.video_id) ids.push(creative.video_id);
  const oss = creative.object_story_spec;
  if (oss?.video_data?.video_id) ids.push(oss.video_data.video_id);
  if (oss?.link_data?.video_id) ids.push(oss.link_data.video_id);
  if (oss?.template_data?.video_id) ids.push(oss.template_data.video_id);
  const afs = creative.asset_feed_spec;
  if (afs?.videos) {
    for (const v of afs.videos) {
      if (v.video_id) ids.push(v.video_id);
    }
  }
  if (afs?.ad_formats) {
    for (const f of afs.ad_formats) {
      if (f.video_id) ids.push(f.video_id);
    }
  }
  return ids;
}

function extractImageUrls(creative: any): string[] {
  const urls: string[] = [];
  if (creative.image_url) urls.push(creative.image_url);
  const oss = creative.object_story_spec;
  if (oss?.photo_data?.url) urls.push(oss.photo_data.url);
  if (oss?.link_data?.image) urls.push(oss.link_data.image);
  if (oss?.link_data?.picture) urls.push(oss.link_data.picture);
  if (oss?.template_data?.image) urls.push(oss.template_data.image);
  const afs = creative.asset_feed_spec;
  if (afs?.images) {
    for (const img of afs.images) {
      if (img.url) urls.push(img.url);
    }
  }
  return urls.filter(Boolean);
}

function extractImageHashes(creative: any): string[] {
  const hashes: string[] = [];
  if (creative.image_hash) hashes.push(creative.image_hash);
  const oss = creative.object_story_spec;
  if (oss?.photo_data?.image_hash) hashes.push(oss.photo_data.image_hash);
  if (oss?.link_data?.image_hash) hashes.push(oss.link_data.image_hash);
  if (oss?.template_data?.image_hash) hashes.push(oss.template_data.image_hash);
  const afs = creative.asset_feed_spec;
  if (afs?.images) {
    for (const img of afs.images) {
      if (img.hash) hashes.push(img.hash);
    }
  }
  return hashes.filter(Boolean);
}

function extractPhotoIds(creative: any): string[] {
  const ids: string[] = [];
  const oss = creative.object_story_spec;
  if (oss?.photo_data?.photo_id) ids.push(oss.photo_data.photo_id);
  if (oss?.attachment_style === 'photo' && oss?.photo_id) ids.push(oss.photo_id);
  return ids;
}

function enlargeThumbnailUrl(url: string): string {
  if (!url) return url;
  return url
    .replace(/s\d{2,4}x\d{2,4}/g, 's1200x1200')
    .replace(/\/p\d{2,4}x\d{2,4}\//g, '/p1200x1200/')
    .replace(/w=128&h=128/g, 'w=1080&h=1080')
    .replace(/w=64&h=64/g, 'w=1080&h=1080')
    .replace(/w=256&h=256/g, 'w=1080&h=1080')
    .replace(/_s\.(jpg|png|jpeg)/gi, '.$1')
    .replace(/\/s\d+\//g, '/s1080/');
}

export async function fetchAdMedia(
  actId: string,
  accessToken: string,
  adIds: string[],
): Promise<AdMedia[]> {
  if (adIds.length === 0) return [];

  const uniqueAdIds = [...new Set(adIds)];
  const results: AdMedia[] = [];
  const batchSize = 50;

  for (let i = 0; i < uniqueAdIds.length; i += batchSize) {
    const batch = uniqueAdIds.slice(i, i + batchSize);
    const ids = batch.join(',');

    try {
      const adRes = await retry(() =>
        axios.get(`${META_API_BASE}`, {
          params: { access_token: accessToken, ids, fields: 'creative{id,thumbnail_url}' },
        }),
      );

      const adMap = adRes.data;
      const adToCreative = new Map<string, { creativeId: string; thumbnailUrl: string }>();
      const creativeIds: string[] = [];

      for (const adId of batch) {
        const adData = adMap[adId];
        if (adData?.creative?.id) {
          adToCreative.set(adId, {
            creativeId: adData.creative.id,
            thumbnailUrl: adData.creative.thumbnail_url || '',
          });
          creativeIds.push(adData.creative.id);
        }
      }

      if (creativeIds.length === 0) continue;

      const creativeDetails = new Map<string, any>();
      const cIds = creativeIds.join(',');
      try {
        const cRes = await retry(() =>
          axios.get(`${META_API_BASE}`, {
            params: {
              access_token: accessToken,
              ids: cIds,
              fields: 'id,object_type,image_url,image_hash,video_id,thumbnail_url,object_story_spec,asset_feed_spec',
            },
          }),
        );
        for (const [, val] of Object.entries(cRes.data)) {
          const c = val as any;
          if (c?.id) creativeDetails.set(c.id, c);
        }
      } catch (err: any) {
        console.warn(`[CREATIVE] Creative details failed: ${err?.response?.status || err.message}`);
      }

      const allVideoIds = new Set<string>();
      for (const [, c] of creativeDetails) {
        for (const vid of extractVideoIds(c)) allVideoIds.add(vid);
      }

      const videoSourceMap = new Map<string, string>();
      if (allVideoIds.size > 0) {
        const vIds = [...allVideoIds].join(',');
        try {
          const vRes = await retry(() =>
            axios.get(`${META_API_BASE}`, {
              params: { access_token: accessToken, ids: vIds, fields: 'id,source,thumbnails{uri}' },
            }),
          );
          for (const [, v] of Object.entries(vRes.data)) {
            const vd = v as any;
            if (vd?.id && vd?.source) videoSourceMap.set(vd.id, vd.source);
          }
        } catch (err: any) {
          console.warn(`[CREATIVE] Video source failed: ${err?.response?.status || err.message}`);
        }
      }

      const photoIdsToFetch: string[] = [];
      const photoIdToCreative = new Map<string, string>();
      for (const [cId, c] of creativeDetails) {
        for (const pid of extractPhotoIds(c)) {
          if (!pid.startsWith('hash:')) {
            photoIdsToFetch.push(pid);
            photoIdToCreative.set(pid, cId);
          }
        }
      }

      const fullSizeImageMap = new Map<string, string>();
      if (photoIdsToFetch.length > 0) {
        const pIds = photoIdsToFetch.join(',');
        try {
          const pRes = await retry(() =>
            axios.get(`${META_API_BASE}`, {
              params: { access_token: accessToken, ids: pIds, fields: 'id,images' },
            }),
          );
          for (const [, p] of Object.entries(pRes.data)) {
            const pd = p as any;
            if (pd?.id && pd?.images?.length > 0) {
              const largest = pd.images.reduce((a: any, b: any) =>
                (b.width * b.height) > (a.width * a.height) ? b : a,
              );
              fullSizeImageMap.set(pd.id, largest.source);
            }
          }
        } catch (err: any) {
          console.warn(`[CREATIVE] Full-size image failed: ${err?.response?.status || err.message}`);
        }
      }

      const allHashes = new Map<string, string[]>();
      for (const [cId, c] of creativeDetails) {
        const hashes = extractImageHashes(c);
        if (hashes.length > 0) allHashes.set(cId, hashes);
      }

      const hashToFullUrl = new Map<string, string>();
      const uniqueHashes = [...new Set([...allHashes.values()].flat())];
      for (let h = 0; h < uniqueHashes.length; h += 50) {
        const hashBatch = uniqueHashes.slice(h, h + 50);
        try {
          const hRes = await retry(() =>
            axios.get(`${META_API_BASE}/${actId}/adimages`, {
              params: {
                access_token: accessToken,
                hashes: hashBatch.join(','),
                fields: 'hash,url',
              },
            }),
          );
          const imgs = hRes.data?.data;
          if (Array.isArray(imgs)) {
            for (const img of imgs) {
              if (img?.hash && img?.url) hashToFullUrl.set(img.hash, img.url);
            }
          }
        } catch (err: any) {
          console.warn(`[CREATIVE] Adimages hash lookup failed: ${err?.response?.status || err.message}`);
        }
      }

      for (const adId of batch) {
        const mapping = adToCreative.get(adId);
        if (!mapping) continue;

        const cDetail = creativeDetails.get(mapping.creativeId);
        if (!cDetail) {
          if (mapping.thumbnailUrl) {
            results.push({ adId, type: 'image', imageUrl: enlargeThumbnailUrl(mapping.thumbnailUrl), thumbnailUrl: mapping.thumbnailUrl });
          }
          continue;
        }

        const thumbnailUrl = mapping.thumbnailUrl || cDetail.thumbnail_url || '';
        const videoIds = extractVideoIds(cDetail);
        const imageUrls = extractImageUrls(cDetail);
        const hashes = allHashes.get(mapping.creativeId) || [];

        let resolved = false;

        for (const vid of videoIds) {
          if (videoSourceMap.has(vid)) {
            results.push({ adId, type: 'video', videoUrl: videoSourceMap.get(vid)!, thumbnailUrl });
            resolved = true;
            break;
          }
        }
        if (resolved) continue;

        for (const pid of extractPhotoIds(cDetail)) {
          if (fullSizeImageMap.has(pid)) {
            results.push({ adId, type: 'image', imageUrl: fullSizeImageMap.get(pid)!, thumbnailUrl });
            resolved = true;
            break;
          }
        }
        if (resolved) continue;

        for (const hash of hashes) {
          if (hashToFullUrl.has(hash)) {
            results.push({ adId, type: 'image', imageUrl: hashToFullUrl.get(hash)!, thumbnailUrl });
            resolved = true;
            break;
          }
        }
        if (resolved) continue;

        if (imageUrls.length > 0) {
          results.push({ adId, type: 'image', imageUrl: imageUrls[0], thumbnailUrl });
          continue;
        }

        if (thumbnailUrl) {
          results.push({ adId, type: 'image', imageUrl: enlargeThumbnailUrl(thumbnailUrl), thumbnailUrl });
        }
      }
    } catch (err: any) {
      console.warn(`[CREATIVE] Media batch failed: ${err?.response?.status || err.message}`);
    }
  }

  console.log(`[CREATIVE] Resolved ${results.length}/${uniqueAdIds.length} ads media`);
  const videos = results.filter(r => r.type === 'video').length;
  const images = results.filter(r => r.type === 'image').length;
  console.log(`[CREATIVE] Breakdown: ${videos} videos, ${images} images`);

  return results;
}

export interface AccountBalance {
  spendCap: number | null;
  balance: number | null;
  currency: string;
}

export async function fetchAccountBalance(
  actId: string,
  accessToken: string,
): Promise<AccountBalance | null> {
  try {
    const res = await retry(() =>
      axios.get(`${META_API_BASE}/${actId}`, {
        params: {
          access_token: accessToken,
          fields: 'spend_cap,balance,currency,amount_spent',
        },
      }),
    );

    const rawBalance = res.data.balance != null ? Number(res.data.balance) : null;
    const amountSpent = res.data.amount_spent != null ? Number(res.data.amount_spent) : 0;
    const spendCap = res.data.spend_cap != null ? Number(res.data.spend_cap) : null;

    let effectiveBalance: number | null = rawBalance;

    if (spendCap !== null && amountSpent > 0) {
      effectiveBalance = spendCap - amountSpent;
    } else if (rawBalance !== null && amountSpent > 0) {
      effectiveBalance = rawBalance - amountSpent;
    }

    console.log(`[BALANCE] ${actId}: spend_cap=${spendCap}, balance=${rawBalance}, amount_spent=${amountSpent} → available=${effectiveBalance}`);

    return {
      spendCap,
      balance: effectiveBalance,
      currency: res.data.currency || 'BRL',
    };
  } catch (err: any) {
    console.error(`[BALANCE] Erro ao buscar saldo de ${actId}:`, err?.response?.data?.error?.message || err.message);
    return null;
  }
}
