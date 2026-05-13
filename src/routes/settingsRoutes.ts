import { Router } from 'express';
import { z } from 'zod';
import settingsController from '../controllers/settingsController.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const setTokenSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
});

router.get('/global-token', (req, res, next) => {
  settingsController.getGlobalToken(req, res).catch(next);
});

router.put('/global-token', validate(setTokenSchema), (req, res, next) => {
  settingsController.setGlobalToken(req, res).catch(next);
});

export default router;
