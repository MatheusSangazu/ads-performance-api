import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import type { PlanConfig } from '../config/plans.js';
import { canUseFeature, canAddClient, canAddTask, getPlan, canAddSeat } from '../config/plans.js';
import prisma from '../config/db.js';

type FeatureGate = keyof PlanConfig['features'];

export function requireFeature(feature: FeatureGate) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.manager) {
      res.status(401).json({ error: 'Não autenticado.' });
      return;
    }

    const manager = await prisma.manager.findUnique({
      where: { id: req.manager.id },
      select: { plan: true },
    });

    if (!manager) {
      res.status(404).json({ error: 'Gestor não encontrado.' });
      return;
    }

    if (!canUseFeature(manager.plan, feature)) {
      res.status(403).json({
        error: 'Funcionalidade não disponível no seu plano.',
        code: 'PLAN_LIMIT',
        feature,
        currentPlan: manager.plan,
      });
      return;
    }

    next();
  };
}

export async function checkClientLimit(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.manager) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  const manager = await prisma.manager.findUnique({
    where: { id: req.manager.id },
    select: { plan: true, managerClients: { select: { clientId: true } } },
  });

  if (!manager) {
    res.status(404).json({ error: 'Gestor não encontrado.' });
    return;
  }

  const plan = getPlan(manager.plan);
  if (!canAddClient(manager.plan, manager.managerClients.length)) {
    res.status(403).json({
      error: `Limite de clientes atingido (${plan.maxClients}). Faça upgrade do seu plano.`,
      code: 'CLIENT_LIMIT',
      currentPlan: manager.plan,
      maxClients: plan.maxClients,
      currentClients: manager.managerClients.length,
    });
    return;
  }

  next();
}

export async function checkTaskLimit(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.manager) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  const manager = await prisma.manager.findUnique({
    where: { id: req.manager.id },
    select: { plan: true, tasks: { select: { id: true } } },
  });

  if (!manager) {
    res.status(404).json({ error: 'Gestor não encontrado.' });
    return;
  }

  const plan = getPlan(manager.plan);
  if (!canAddTask(manager.plan, manager.tasks.length)) {
    res.status(403).json({
      error: `Limite de tarefas atingido (${plan.maxTasks}). Faça upgrade do seu plano.`,
      code: 'TASK_LIMIT',
      currentPlan: manager.plan,
      maxTasks: plan.maxTasks,
      currentTasks: manager.tasks.length,
    });
    return;
  }

  next();
}

export async function checkSeatLimit(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.manager) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  const manager = await prisma.manager.findUnique({
    where: { id: req.manager.id },
    select: { plan: true, agencyMembers: { select: { id: true } } },
  });

  if (!manager) {
    res.status(404).json({ error: 'Gestor não encontrado.' });
    return;
  }

  const plan = getPlan(manager.plan);
  if (!canAddSeat(manager.plan, manager.agencyMembers.length)) {
    res.status(403).json({
      error: `Limite de gestores atingido (${plan.maxSeats}).`,
      code: 'SEAT_LIMIT',
      currentPlan: manager.plan,
      maxSeats: plan.maxSeats,
      currentSeats: manager.agencyMembers.length,
    });
    return;
  }

  next();
}

export function requireAgencyRole(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.manager) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  if (req.manager.role !== 'agency' && req.manager.role !== 'admin') {
    res.status(403).json({
      error: 'Apenas agências podem gerenciar equipe.',
      code: 'AGENCY_ONLY',
    });
    return;
  }

  next();
}
