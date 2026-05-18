import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { requireAgencyRole, checkSeatLimit } from '../middleware/planMiddleware.js';
import agencyService from '../services/agencyService.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authMiddleware);

router.get('/members', requireAgencyRole, async (req: AuthRequest, res, next) => {
  try {
    const members = await agencyService.getAgencyMembers(req.manager!.id);
    res.json(members);
  } catch (err) {
    next(err);
  }
});

const inviteSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

router.post('/members', requireAgencyRole, checkSeatLimit, validate(inviteSchema), async (req: AuthRequest, res, next) => {
  try {
    const member = await agencyService.inviteMember(
      req.manager!.id,
      req.body.name,
      req.body.email,
      req.body.password,
    );
    res.status(201).json(member);
  } catch (err: any) {
    if (err.message === 'EMAIL_EXISTS') {
      res.status(409).json({ error: 'Este email já está cadastrado.' });
      return;
    }
    if (err.message === 'SEAT_LIMIT') {
      res.status(403).json({ error: 'Limite de gestores atingido.', code: 'SEAT_LIMIT' });
      return;
    }
    next(err);
  }
});

router.delete('/members/:memberId', requireAgencyRole, async (req: AuthRequest, res, next) => {
  try {
    await agencyService.removeMember(req.manager!.id, req.params.memberId);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message === 'MEMBER_NOT_FOUND') {
      res.status(404).json({ error: 'Gestor não encontrado nesta agência.' });
      return;
    }
    next(err);
  }
});

router.get('/consolidated', requireAgencyRole, async (req: AuthRequest, res, next) => {
  try {
    const data = await agencyService.getAgencyConsolidated(req.manager!.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
