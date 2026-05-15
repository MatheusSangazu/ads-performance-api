import { Router } from 'express';
import managerController from '../controllers/managerController.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, adminOnly, (req, res) => managerController.list(req, res));
router.get('/:id', authMiddleware, adminOnly, (req, res) => managerController.getById(req, res));
router.put('/:id', authMiddleware, adminOnly, (req, res) => managerController.update(req, res));
router.delete('/:id', authMiddleware, adminOnly, (req, res) => managerController.deactivate(req, res));
router.post('/:id/clients/:actId', authMiddleware, adminOnly, (req, res) => managerController.linkClient(req, res));
router.delete('/:id/clients/:actId', authMiddleware, adminOnly, (req, res) => managerController.unlinkClient(req, res));

export default router;
