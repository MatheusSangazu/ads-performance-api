import { Router } from 'express';
import alertController from '../controllers/alertController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, (req, res, next) => {
  alertController.list(req, res).catch(next);
});

router.get('/unread-count', authMiddleware, (req, res, next) => {
  alertController.countUnread(req, res).catch(next);
});

router.patch('/:id/read', authMiddleware, (req, res, next) => {
  alertController.markRead(req, res).catch(next);
});

router.post('/mark-all-read', authMiddleware, (req, res, next) => {
  alertController.markAllRead(req, res).catch(next);
});

router.delete('/:id', authMiddleware, (req, res, next) => {
  alertController.dismiss(req, res).catch(next);
});

export default router;
