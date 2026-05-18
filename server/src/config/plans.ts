export type PlanId = 'starter' | 'pro' | 'agency';
export type BillingPeriod = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  maxClients: number;
  maxTasks: number;
  maxSeats: number;
  pricePerSeatExtra: number | null;
  features: {
    autoSync: boolean;
    budgetGoals: boolean;
    whatsapp: boolean;
    exportExcel: boolean;
    weeklySummary: boolean;
    consolidatedDashboard: boolean;
    teamManagement: boolean;
    healthCheck: boolean;
  };
  prices: Record<BillingPeriod, number>;
}

export const BILLING_DISCOUNTS: Record<BillingPeriod, { label: string; discount: number; months: number }> = {
  monthly: { label: 'Mensal', discount: 0, months: 1 },
  quarterly: { label: 'Trimestral', discount: 0.05, months: 3 },
  semiannual: { label: 'Semestral', discount: 0.10, months: 6 },
  annual: { label: 'Anual', discount: 0.15, months: 12 },
};

export const PLANS: Record<PlanId, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Para gestores que estão começando',
    maxClients: 3,
    maxTasks: 20,
    maxSeats: 1,
    pricePerSeatExtra: null,
    features: {
      autoSync: false,
      budgetGoals: false,
      whatsapp: false,
      exportExcel: false,
      weeklySummary: false,
      consolidatedDashboard: false,
      teamManagement: false,
      healthCheck: true,
    },
    prices: {
      monthly: 97,
      quarterly: 277,
      semiannual: 524,
      annual: 989,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Para gestores estabelecidos',
    maxClients: 10,
    maxTasks: Infinity,
    maxSeats: 1,
    pricePerSeatExtra: null,
    features: {
      autoSync: true,
      budgetGoals: true,
      whatsapp: true,
      exportExcel: true,
      weeklySummary: true,
      consolidatedDashboard: false,
      teamManagement: false,
      healthCheck: true,
    },
    prices: {
      monthly: 197,
      quarterly: 562,
      semiannual: 1064,
      annual: 2007,
    },
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    description: 'Para agências com equipe',
    maxClients: Infinity,
    maxTasks: Infinity,
    maxSeats: 5,
    pricePerSeatExtra: 49,
    features: {
      autoSync: true,
      budgetGoals: true,
      whatsapp: true,
      exportExcel: true,
      weeklySummary: true,
      consolidatedDashboard: true,
      teamManagement: true,
      healthCheck: true,
    },
    prices: {
      monthly: 397,
      quarterly: 1132,
      semiannual: 2144,
      annual: 4047,
    },
  },
};

export function getPlan(planId: string): PlanConfig {
  return PLANS[planId as PlanId] || PLANS.starter;
}

export function canUseFeature(planId: string, feature: keyof PlanConfig['features']): boolean {
  const plan = getPlan(planId);
  return plan.features[feature];
}

export function canAddClient(planId: string, currentClientCount: number): boolean {
  const plan = getPlan(planId);
  return currentClientCount < plan.maxClients;
}

export function canAddTask(planId: string, currentTaskCount: number): boolean {
  const plan = getPlan(planId);
  return currentTaskCount < plan.maxTasks;
}

export function canAddSeat(planId: string, currentSeatCount: number): boolean {
  const plan = getPlan(planId);
  if (!plan.features.teamManagement) return false;
  return currentSeatCount < plan.maxSeats;
}

export function getRemainingClients(planId: string, currentClientCount: number): number {
  const plan = getPlan(planId);
  if (plan.maxClients === Infinity) return Infinity;
  return Math.max(0, plan.maxClients - currentClientCount);
}
