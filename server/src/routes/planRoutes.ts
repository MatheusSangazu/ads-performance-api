import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { PLANS, BILLING_DISCOUNTS, getPlan, type PlanId, type BillingPeriod } from '../config/plans.js';
import prisma from '../config/db.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', (_req, res) => {
  const plans = Object.values(PLANS).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    maxClients: p.maxClients,
    maxTasks: p.maxTasks,
    maxSeats: p.maxSeats,
    pricePerSeatExtra: p.pricePerSeatExtra,
    features: p.features,
    prices: p.prices,
  }));

  const billing = BILLING_DISCOUNTS;

  res.json({ plans, billing });
});

router.get('/current', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const manager = await prisma.manager.findUnique({
      where: { id: req.manager!.id },
      select: {
        plan: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        billingPeriod: true,
        maxClients: true,
        managerClients: { select: { clientId: true } },
        tasks: { select: { id: true } },
        agencyMembers: { select: { id: true } },
      },
    });

    if (!manager) {
      res.status(404).json({ error: 'Gestor não encontrado.' });
      return;
    }

    const plan = getPlan(manager.plan);

    res.json({
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        maxClients: plan.maxClients,
        maxTasks: plan.maxTasks,
        maxSeats: plan.maxSeats,
        features: plan.features,
        prices: plan.prices,
      },
      usage: {
        clients: manager.managerClients.length,
        tasks: manager.tasks.length,
        seats: manager.agencyMembers.length,
      },
      subscription: {
        status: manager.subscriptionStatus,
        endsAt: manager.subscriptionEndsAt,
        billingPeriod: manager.billingPeriod,
      },
    });
  } catch (err) {
    next(err);
  }
});

const changePlanSchema = z.object({
  planId: z.enum(['starter', 'pro', 'agency']),
  billingPeriod: z.enum(['monthly', 'quarterly', 'semiannual', 'annual']).optional(),
});

router.post('/change', authMiddleware, validate(changePlanSchema), async (req: AuthRequest, res, next) => {
  try {
    const { planId, billingPeriod } = req.body as { planId: PlanId; billingPeriod?: BillingPeriod };
    const plan = getPlan(planId);

    const manager = await prisma.manager.findUnique({
      where: { id: req.manager!.id },
      select: {
        managerClients: { select: { clientId: true } },
        tasks: { select: { id: true } },
        agencyMembers: { select: { id: true } },
      },
    });

    if (!manager) {
      res.status(404).json({ error: 'Gestor não encontrado.' });
      return;
    }

    if (manager.managerClients.length > plan.maxClients) {
      res.status(400).json({
        error: `Você tem ${manager.managerClients.length} clientes, mas o plano ${plan.name} suporta no máximo ${plan.maxClients}.`,
        code: 'DOWNGRADE_BLOCKED',
      });
      return;
    }

    if (manager.tasks.length > plan.maxTasks) {
      res.status(400).json({
        error: `Você tem ${manager.tasks.length} tarefas, mas o plano ${plan.name} suporta no máximo ${plan.maxTasks}.`,
        code: 'DOWNGRADE_BLOCKED',
      });
      return;
    }

    if (manager.agencyMembers.length > plan.maxSeats) {
      res.status(400).json({
        error: `Você tem ${manager.agencyMembers.length} gestores na equipe, mas o plano ${plan.name} suporta no máximo ${plan.maxSeats}.`,
        code: 'DOWNGRADE_BLOCKED',
      });
      return;
    }

    const now = new Date();
    const endDate = new Date(now);
    if (billingPeriod === 'quarterly') endDate.setMonth(endDate.getMonth() + 3);
    else if (billingPeriod === 'semiannual') endDate.setMonth(endDate.getMonth() + 6);
    else if (billingPeriod === 'annual') endDate.setMonth(endDate.getMonth() + 12);
    else endDate.setMonth(endDate.getMonth() + 1);

    await prisma.manager.update({
      where: { id: req.manager!.id },
      data: {
        plan: planId,
        maxClients: plan.maxClients === Infinity ? null : plan.maxClients,
        billingPeriod: billingPeriod || 'monthly',
        subscriptionEndsAt: endDate,
        subscriptionStatus: 'active',
      },
    });

    res.json({
      success: true,
      plan: planId,
      billingPeriod: billingPeriod || 'monthly',
      endsAt: endDate,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
