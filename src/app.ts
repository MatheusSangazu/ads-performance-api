import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import syncRoutes from './routes/syncRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import './config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.use('/api/sync', syncRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/settings', settingsRoutes);

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => res.send('🚀 API Growth Ads Online!'));
}

app.use(errorHandler);

app.listen(port, () => {
  console.log(`✅ Servidor rodando em http://localhost:${port}`);
});
