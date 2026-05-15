import { Router } from 'express';
import authController from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => authController.login(req, res));
router.post('/register/:token', (req, res) => authController.register(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/me', authMiddleware, (req, res) => authController.me(req, res));
router.put('/me', authMiddleware, (req, res) => authController.updateProfile(req, res));

export default router;
