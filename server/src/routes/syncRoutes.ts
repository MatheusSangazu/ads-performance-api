import { Router } from 'express';
import { z } from 'zod';
import syncController from '../controllers/syncController.js';
import syncProgress from '../services/syncProgress.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const syncSchema = z.object({
  act_id: z.string().min(1, 'Act ID é obrigatório'),
  since: z.string().min(1, 'Data início é obrigatória'),
  until: z.string().min(1, 'Data fim é obrigatória'),
});

const breakdownSchema = syncSchema.extend({
  type: z.enum(['audience', 'placement', 'region']),
});

router.get('/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const unsubscribe = syncProgress.onProgress((event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

router.post('/manual', authMiddleware, validate(syncSchema), (req, res, next) => {
  syncController.manualSync(req, res).catch(next);
});

router.post('/breakdown', authMiddleware, validate(breakdownSchema), (req, res, next) => {
  syncController.syncBreakdown(req, res).catch(next);
});

router.post('/breakdown/all', authMiddleware, validate(syncSchema), (req, res, next) => {
  syncController.syncAllBreakdowns(req, res).catch(next);
});

export default router;
