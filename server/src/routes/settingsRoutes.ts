import { Router } from 'express';
import { z } from 'zod';
import settingsController from '../controllers/settingsController.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

const setTokenSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
});

const setAutoSyncSchema = z.object({
  enabled: z.boolean(),
});

router.get('/global-token', authMiddleware, (req, res, next) => {
  settingsController.getGlobalToken(req, res).catch(next);
});

router.put('/global-token', authMiddleware, adminOnly, validate(setTokenSchema), (req, res, next) => {
  settingsController.setGlobalToken(req, res).catch(next);
});

router.get('/auto-sync', authMiddleware, adminOnly, (req, res, next) => {
  settingsController.getAutoSync(req, res).catch(next);
});

router.put('/auto-sync', authMiddleware, adminOnly, validate(setAutoSyncSchema), (req, res, next) => {
  settingsController.setAutoSync(req, res).catch(next);
});

router.post('/sync-all', authMiddleware, adminOnly, (req, res, next) => {
  settingsController.triggerSyncAll(req, res).catch(next);
});

export default router;
