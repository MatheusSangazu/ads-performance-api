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

router.get('/whatsapp/groups', authMiddleware, async (_req, res, next) => {
  try {
    const [groups, syncedAt] = await Promise.all([
      evoService.listGroups(),
      evoService.getLastSyncedAt(),
    ]);
    res.json({ groups, syncedAt });
  } catch (error) {
    next(error);
  }
});

// A listagem na Evolution API pode demorar ~1 min: o refresh roda em background
// e o frontend faz polling no GET até o syncedAt mudar.
router.post('/whatsapp/groups/refresh', authMiddleware, async (_req, res, next) => {
  try {
    const started = await evoService.refreshGroups();
    res.json({ started });
  } catch (error) {
    next(error);
  }
});

export default router;
