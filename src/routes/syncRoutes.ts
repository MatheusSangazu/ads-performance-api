import { Router } from 'express';
import { z } from 'zod';
import syncController from '../controllers/syncController.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const syncSchema = z.object({
  act_id: z.string().min(1, 'Act ID é obrigatório'),
  since: z.string().min(1, 'Data início é obrigatória'),
  until: z.string().min(1, 'Data fim é obrigatória'),
});

router.post('/manual', validate(syncSchema), (req, res, next) => {
  syncController.manualSync(req, res).catch(next);
});

export default router;
