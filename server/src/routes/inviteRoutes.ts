import { Router } from 'express';
import inviteController from '../controllers/inviteController.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/verify/:token', (req, res) => inviteController.verify(req, res));
router.post('/', authMiddleware, adminOnly, (req, res) => inviteController.create(req, res));
router.get('/', authMiddleware, adminOnly, (req, res) => inviteController.list(req, res));
router.delete('/:id', authMiddleware, adminOnly, (req, res) => inviteController.revoke(req, res));

export default router;
