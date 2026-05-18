import { Router } from 'express';
import { z } from 'zod';
import authController from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[^a-zA-Z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  company: z.string().optional(),
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[^a-zA-Z0-9]/, 'Senha deve conter pelo menos um caractere especial')
    .optional(),
  phone: z.string().optional().nullable(),
  whatsappNotify: z.boolean().optional(),
  healthCheckTimes: z.string().optional(),
  weeklySummary: z.boolean().optional(),
});

const router = Router();

router.post('/login', (req, res) => authController.login(req, res));
router.post('/register/:token', validate(registerSchema), (req, res) => authController.register(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/me', authMiddleware, (req, res) => authController.me(req, res));
router.put('/me', authMiddleware, validate(updateProfileSchema), (req, res) => authController.updateProfile(req, res));

export default router;
