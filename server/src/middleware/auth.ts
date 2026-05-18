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
  let header = req.headers.authorization;

  // Workaround temporário: permitir token na URL apenas para o progresso de sincronização
  // enquanto o frontend não atualiza para a nova versão com headers.
  if (!header?.startsWith('Bearer ') && req.path.includes('/progress') && req.query.token) {
    const token = (req.query.token as string).replace(/ /g, '+');
    header = `Bearer ${token}`;
  }

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não fornecido ou formato inválido.' });
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

  const actId = req.params.actId;
  if (!actId) {
    return next();
  }

  if (req.manager.role === 'agency') {
    const agencyClientIds = await managerRepository.getAgencyClientIds(req.manager.id);
    if (agencyClientIds.includes(actId)) {
      return next();
    }
    res.status(403).json({ error: 'Você não tem acesso a este cliente.' });
    return;
  }

  const hasAccess = await managerRepository.hasAccess(req.manager.id, actId);
  if (!hasAccess) {
    res.status(403).json({ error: 'Você não tem acesso a este cliente.' });
    return;
  }

  next();
}
