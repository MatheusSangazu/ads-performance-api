import { useState, useEffect } from 'react';
import { TrendingUp, Target, Calendar, Info, Loader2 } from 'lucide-react';
import { clientApi, type GoalProjection as GoalProjectionData } from '../lib/api';
import BurndownChart from './BurndownChart';

const METRIC_LABELS: Record<string, string> = {
  leads: 'Leads',
  cpl: 'CPL',
  roas: 'ROAS',
  ctr: 'CTR',
  clicks: 'Cliques',
  impressions: 'Impressões',
  purchases: 'Compras',
  purchase_value: 'Valor de Compra',
};

const WINDOWS = [
  { value: 7, label: '7d' },
  { value: 14, label: '14d' },
  { value: 30, label: '30d' },
];

interface GoalProjectionProps {
  actId: string;
}

export default function GoalProjection({ actId }: GoalProjectionProps) {
  const [data, setData] = useState<GoalProjectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [window_, setWindow] = useState(14);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await clientApi.getGoalProjection(actId, window_);
        setData(res.data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [actId, window_]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data || data.goals.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
          <Target size={16} />
          <span className="text-xs">Defina uma meta mensal para ver a projeção</span>
        </div>
      </div>
    );
  }

  const primaryGoal = data.goals[0];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/50 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-500" />
          <span className="text-sm font-bold text-gray-900 dark:text-white">Projeção de Meta</span>
          <span className="text-[10px] text-gray-400">
            ({METRIC_LABELS[primaryGoal.metric] || primaryGoal.metric})
          </span>
        </div>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              onClick={() => setWindow(w.value)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                window_ === w.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ProjectionCard
          label="Ritmo Atual"
          value={primaryGoal.projected}
          metric={primaryGoal.metric}
          onTrack={primaryGoal.onTrack}
          info={`Projeção de ${Math.round(primaryGoal.projected)} ${METRIC_LABELS[primaryGoal.metric] || ''}/mês neste ritmo`}
        />
        <ProjectionCard
          label="Atual"
          value={primaryGoal.current}
          metric={primaryGoal.metric}
          target={primaryGoal.target}
        />
        <ProjectionCard
          label="Necessário/Dia"
          value={primaryGoal.neededDaily}
          metric={primaryGoal.metric}
          critical={primaryGoal.neededDaily > primaryGoal.avgDaily}
          info={`Média atual: ${primaryGoal.avgDaily.toFixed(1)}/dia`}
        />
      </div>

      <div className="flex items-center gap-2 text-[10px] text-gray-400">
        <Calendar size={10} />
        <span>{data.daysRemaining} dias restantes no mês</span>
        <span className="mx-1">•</span>
        <Info size={10} />
        <span>Baseado na média dos últimos {data.window} dias</span>
      </div>

      <BurndownChart data={data.burndown} />
    </div>
  );
}

function ProjectionCard({
  label,
  value,
  metric,
  onTrack,
  target,
  critical,
  info,
}: {
  label: string;
  value: number;
  metric: string;
  onTrack?: boolean;
  target?: number;
  critical?: boolean;
  info?: string;
}) {
  const formatVal = (v: number) => {
    if (metric === 'roas' || metric === 'ctr' || metric === 'cpl') return v.toFixed(2);
    return Math.round(v).toLocaleString('pt-BR');
  };

  let colorClass = 'text-gray-900 dark:text-white';
  if (onTrack !== undefined) {
    colorClass = onTrack ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  }
  if (critical !== undefined && critical) {
    colorClass = 'text-amber-600 dark:text-amber-400';
  }

  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
      <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${colorClass}`}>
        {formatVal(value)}
      </p>
      {target && (
        <p className="text-[10px] text-gray-400">
          Meta: {formatVal(target)}
        </p>
      )}
      {info && (
        <p className="text-[10px] text-gray-400 mt-0.5" title={info}>
          {info}
        </p>
      )}
    </div>
  );
}
