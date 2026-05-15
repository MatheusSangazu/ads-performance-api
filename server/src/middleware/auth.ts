import type { Request, Response, NextFunction } from 'express';
import type { ManagerRole } from '../generated/prisma/client.js';
import authService from '../services/authService.js';
import managerRepository from '../repositories/managerRepository.js';

export interface AuthRequest extends Request {
  manager?: {
    id: string;
    role: ManagerRole;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não fornecido.' });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = authService.verifyAccessToken(token);
    req.manager = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.manager?.role !== 'admin') {
    res.status(403).json({ error: 'Acesso restrito a administradores.' });
    return;
  }
  next();
}

export async function clientAccess(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.manager) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  if (req.manager.role === 'admin') {
    return next();
  }

  const actId = req.params.actId;
  if (!actId) {
    return next();
  }

  const hasAccess = await managerRepository.hasAccess(req.manager.id, actId);
  if (!hasAccess) {
    res.status(403).json({ error: 'Você não tem acesso a este cliente.' });
    return;
  }

  next();
}
