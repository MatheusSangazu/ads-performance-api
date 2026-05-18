import { Router } from 'express';
import { z } from 'zod';
import managerController from '../controllers/managerController.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const updateManagerSchema = z.object({
  body: z.object({
    plan: z.string().optional(),
    maxClients: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
    role: z.enum(['admin', 'agency', 'manager']).optional(),
  }),
});

router.get('/', authMiddleware, adminOnly, (req, res) => managerController.list(req, res));
router.get('/:id', authMiddleware, adminOnly, (req, res) => managerController.getById(req, res));
router.put('/:id', authMiddleware, adminOnly, validate(updateManagerSchema), (req, res) => managerController.update(req, res));
router.delete('/:id', authMiddleware, adminOnly, (req, res) => managerController.deactivate(req, res));
router.post('/:id/clients/:actId', authMiddleware, adminOnly, (req, res) => managerController.linkClient(req, res));
router.delete('/:id/clients/:actId', authMiddleware, adminOnly, (req, res) => managerController.unlinkClient(req, res));

export default router;
