import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { fileURLToPath } from 'url';
import syncRoutes from './routes/syncRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import inviteRoutes from './routes/inviteRoutes.js';
import managerRoutes from './routes/managerRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import planRoutes from './routes/planRoutes.js';
import agencyRoutes from './routes/agencyRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import schedulerService from './services/schedulerService.js';
import settingsRepository from './repositories/settingsRepository.js';
import seedService from './services/seedService.js';
import prisma from './config/db.js';
import './config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3001;

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin.includes(',') ? corsOrigin.split(',').map(s => s.trim()) : corsOrigin,
  credentials: true,
}));
app.use(express.json());

const uploadsDir = path.join(__dirname, '..', 'uploads');
const creativesDir = path.join(uploadsDir, 'creatives');
if (!fs.existsSync(creativesDir)) fs.mkdirSync(creativesDir, { recursive: true });
app.use('/creatives', express.static(creativesDir));

app.get('/creatives/:filename', async (req, res, next) => {
  const filePath = path.join(creativesDir, req.params.filename);
  if (fs.existsSync(filePath)) return next();

  const adId = req.params.filename.replace(/\.\w+$/, '').split('_').pop();
  if (!adId) return res.status(404).send('Not found');

  try {
    const row = await prisma.adPerformance.findFirst({
      where: { adId },
      select: { clientId: true, creativeUrl: true },
    });
    if (!row) return res.status(404).send('Not found');

    const { resolveToken } = await import('./utils/tokenUtils.js');
    const { fetchAdMedia } = await import('./integrations/metaApi.js');
    const { accessToken } = await resolveToken(row.clientId);
    const mediaList = await fetchAdMedia(row.clientId, accessToken, [adId]);

    for (const media of mediaList) {
      const sourceUrl = media.imageUrl || media.thumbnailUrl;
      if (!sourceUrl) continue;

      const resp = await axios.get(sourceUrl, { responseType: 'arraybuffer', timeout: 15000 });
      const ct = resp.headers['content-type'] || '';
      let ext = 'jpg';
      if (ct.includes('png')) ext = 'png';
      else if (ct.includes('webp')) ext = 'webp';
      else if (ct.includes('mp4')) ext = 'mp4';

      const finalName = `${row.clientId}_${adId}.${ext}`;
      fs.writeFileSync(path.join(creativesDir, finalName), resp.data);
      await prisma.adPerformance.updateMany({
        where: { adId },
        data: { creativeUrl: `/creatives/${finalName}` },
      });
      return res.redirect(`/creatives/${finalName}`);
    }
  } catch (err) {
    console.warn(`[CREATIVE] Falha ao baixar sob demanda ${adId}:`, (err as Error).message);
  }

  res.status(404).send('Not found');
});

app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/agency', agencyRoutes);

app.get('/', (_req, res) => res.send('[GROWTH-ADS] API Online!'));

app.use(errorHandler);

app.listen(port, async () => {
  console.log(`[SERVER] Servidor rodando em http://localhost:${port}`);

  await seedService.seedAdmin();

  const autoSync = await settingsRepository.get('auto_sync_enabled');
  if (autoSync === 'true') {
    schedulerService.start();
  }
});
