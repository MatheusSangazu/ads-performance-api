import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import syncRoutes from './routes/syncRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import inviteRoutes from './routes/inviteRoutes.js';
import managerRoutes from './routes/managerRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import schedulerService from './services/schedulerService.js';
import settingsRepository from './repositories/settingsRepository.js';
import seedService from './services/seedService.js';
import './config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/creatives', express.static(path.join(uploadsDir, 'creatives')));

app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/tasks', taskRoutes);

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => res.send('[GROWTH-ADS] API Online!'));
}

app.use(errorHandler);

app.listen(port, async () => {
  console.log(`[SERVER] Servidor rodando em http://localhost:${port}`);

  await seedService.seedAdmin();

  const autoSync = await settingsRepository.get('auto_sync_enabled');
  if (autoSync === 'true') {
    schedulerService.start();
  }
});
