import express from 'express';
import dotenv from 'dotenv';
import syncRoutes from './routes/syncRoutes.js';
import clientRoutes from './routes/clientRoutes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (req, res) => res.send('🚀 API Growth Ads Online!'));
app.use('/sync', syncRoutes);
app.use('/clients', clientRoutes);

app.listen(port, () => {
  console.log(`✅ Servidor rodando em http://localhost:${port}`);
});