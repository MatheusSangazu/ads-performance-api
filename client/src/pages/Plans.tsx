import { useState, useEffect } from 'react';
import { Check, X, Crown, Zap, Building2 } from 'lucide-react';
import { planApi, type PlanInfo, type CurrentPlan, type BillingInfo } from '../lib/api';

const planIcons: Record<string, typeof Zap> = {
  starter: Zap,
  pro: Crown,
  agency: Building2,
};

const planColors: Record<string, string> = {
  starter: 'from-blue-500 to-blue-700',
  pro: 'from-purple-500 to-purple-700',
  agency: 'from-amber-500 to-amber-700',
};

const planBorders: Record<string, string> = {
  starter: 'border-blue-500/30',
  pro: 'border-purple-500/30',
  agency: 'border-amber-500/30',
};

const featureLabels: Record<string, string> = {
  autoSync: 'Sincronização automática',
  budgetGoals: 'Orçamento e metas',
  whatsapp: 'Notificações WhatsApp',
  exportExcel: 'Exportação Excel',
  weeklySummary: 'Resumo semanal',
  consolidatedDashboard: 'Dashboard consolidado',
  teamManagement: 'Gestão de equipe',
  healthCheck: 'Health check',
};

export default function Plans() {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [current, setCurrent] = useState<CurrentPlan | null>(null);
  const [billing, setBilling] = useState<Record<string, BillingInfo>>({});
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [plansRes, currentRes] = await Promise.all([
        planApi.list(),
        planApi.current(),
      ]);
      setPlans(plansRes.data.plans);
      setBilling(plansRes.data.billing as any);
      setCurrent(currentRes.data);
    } catch { } finally {
      setLoading(false);
    }
  }

  async function handleChange(planId: string) {
    setChanging(planId);
    try {
      await planApi.change(planId, selectedPeriod);
      await loadData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao trocar de plano.';
      alert(msg);
    } finally {
      setChanging(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Planos</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {current ? `Plano atual: ${current.plan.name}` : 'Carregando...'}
            {current?.usage && (
              <span className="ml-2 text-gray-400 dark:text-gray-500">
                ({current.usage.clients} clientes, {current.usage.tasks === Infinity ? '∞' : current.usage.tasks} tarefas)
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {Object.entries(billing).map(([key, info]) => (
            <button
              key={key}
              onClick={() => setSelectedPeriod(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedPeriod === key
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-blue-600 dark:text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {info.label}
              {info.discount > 0 && (
                <span className="ml-1 text-green-600 dark:text-green-400">-{(info.discount * 100).toFixed(0)}%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const Icon = planIcons[plan.id] || Zap;
          const isCurrent = current?.plan.id === plan.id;
          const price = plan.prices[selectedPeriod] || plan.prices.monthly;

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border bg-white p-6 transition-all hover:shadow-xl dark:bg-gray-900 ${
                isCurrent ? `${planBorders[plan.id]} shadow-lg ring-1 ring-blue-500/20` : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 right-4 rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white">
                  Plano atual
                </div>
              )}

              <div className={`mb-4 inline-flex rounded-lg bg-gradient-to-r p-3 ${planColors[plan.id]}`}>
                <Icon size={24} className="text-white" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>

              <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  R$ {price.toLocaleString('pt-BR')}
                </span>
                {selectedPeriod !== 'monthly' && billing[selectedPeriod] && (
                  <span className="ml-1 text-sm text-gray-400 dark:text-gray-500">
                    /{billing[selectedPeriod].months} meses
                  </span>
                )}
                {selectedPeriod === 'monthly' && (
                  <span className="ml-1 text-sm text-gray-400 dark:text-gray-500">/mês</span>
                )}
              </div>

              <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Até {plan.maxClients === Infinity ? '∞' : plan.maxClients} clientes
                {plan.maxSeats > 1 && ` · Até ${plan.maxSeats} gestores`}
              </div>

              <ul className="mt-6 space-y-3">
                {Object.entries(plan.features).map(([key, enabled]) => (
                  <li key={key} className="flex items-center gap-2 text-sm">
                    {enabled ? (
                      <Check size={16} className="shrink-0 text-green-500 dark:text-green-400" />
                    ) : (
                      <X size={16} className="shrink-0 text-gray-300 dark:text-gray-600" />
                    )}
                    <span className={enabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}>
                      {featureLabels[key] || key}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleChange(plan.id)}
                disabled={isCurrent || changing !== null}
                className={`mt-6 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                  isCurrent
                    ? 'cursor-default bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                    : changing === plan.id
                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-400'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isCurrent ? 'Plano atual' : changing === plan.id ? 'Alterando...' : 'Selecionar plano'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
  
}
