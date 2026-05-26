import { Router } from 'express';
import { z } from 'zod';
import settingsController from '../controllers/settingsController.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import evoService from '../services/evoService.js';

const router = Router();

const setAutoSyncSchema = z.object({
  enabled: z.boolean(),
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

router.get('/whatsapp/status', authMiddleware, async (_req, res) => {
  const status = await evoService.getConnectionState();
  res.json(status);
});

router.get('/whatsapp/qrcode', authMiddleware, async (_req, res) => {
  const qr = await evoService.getQRCode();
  res.json(qr);
});

router.post('/whatsapp/logout', authMiddleware, async (_req, res) => {
  const ok = await evoService.logout();
  res.json({ success: ok });
});

export default router;
