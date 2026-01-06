import { Router } from 'express';
import syncService from '../services/syncService.js';

const router = Router();

router.post('/manual', async (req, res) => {
  const { act_id, since, until } = req.body;
  try {
    const result = await syncService.syncAccount(act_id, since, until);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;