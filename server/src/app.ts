import express from 'express';
import cors from 'cors';
import path from 'path';
import fsSync from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import metaRoutes from './routes/metaRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import schedulerService from './services/schedulerService.js';
import settingsRepository from './repositories/settingsRepository.js';
import seedService from './services/seedService.js';
import { getCreativesDir, downloadCreativeOnDemand } from './services/creativeDownloadService.js';
import './config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

const corsOrigin = process.env.CORS_ORIGIN;
if (isProduction && !corsOrigin) {
  console.warn('[SECURITY] CORS_ORIGIN não definido em produção. Rejeitando todas as origens.');
}
const origin = isProduction
  ? (corsOrigin ? (corsOrigin.includes(',') ? corsOrigin.split(',').map(s => s.trim()) : corsOrigin) : false)
  : (corsOrigin || '*');
app.use(cors({ origin, credentials: true }));
app.use(express.json());

app.use('/api', apiLimiter);

const creativesDir = getCreativesDir();
const resolvedCreativesDir = path.resolve(creativesDir);

app.get('/creatives/:filename', async (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  const filename = req.params.filename;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(403).send('Forbidden');
  }

  const filePath = path.resolve(creativesDir, filename);
  if (!filePath.startsWith(resolvedCreativesDir + path.sep) && filePath !== resolvedCreativesDir) {
    return res.status(403).send('Forbidden');
  }

  if (fsSync.existsSync(filePath)) {
    const stat = fsSync.statSync(filePath);
    // Reduzimos o limite para 2KB para evitar deletar thumbnails válidas pequenas
    if (stat.size > 2000) return next();
    try { fsSync.unlinkSync(filePath); } catch {}
  }

  const adId = filename.replace(/_thumb\.\w+$/, '').replace(/\.\w+$/, '').split('_').pop();
  if (!adId) return res.status(404).send('Not found');

  try {
    const result = await downloadCreativeOnDemand(adId);
    if (!result) return res.status(404).send('Not found');

    // Caso o download local tenha falhado, redirecionamos para a URL original da Meta (fresh)
    if (!result.data && result.sourceUrl) {
      return res.redirect(result.sourceUrl);
    }

    if (!result.data) return res.status(404).send('Not found');

    // Se o arquivo solicitado for o thumbnail e acabamos de baixar o vídeo
    if (filename.includes('_thumb') && result.creativeType === 'video') {
      const thumbPath = path.join(creativesDir, `${result.clientId}_${adId}_thumb.jpg`);
      if (fsSync.existsSync(thumbPath)) {
        const thumbData = await fsSync.promises.readFile(thumbPath);
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.end(thumbData);
      }
    }

    const ct = result.contentType || 'image/jpeg';
    res.setHeader('Content-Type', ct);
    res.setHeader('Content-Length', result.data.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.end(result.data);
  } catch (err) {
    console.warn(`[CREATIVE] Falha ao baixar sob demanda ${adId}:`, (err as Error).message);
  }

  res.status(404).send('Not found');
});

app.use('/creatives', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(creativesDir));

app.use('/api/auth/login', loginLimiter);
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
app.use('/api/meta', metaRoutes);

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
