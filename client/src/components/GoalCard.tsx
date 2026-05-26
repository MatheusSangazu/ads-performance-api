import { useState, useEffect, useRef } from 'react';
import { Target, Loader2, Trash2, Plus, X, CheckCircle, ChevronDown } from 'lucide-react';
import { clientApi, type Goal } from '../lib/api';
import { METRIC_LABELS } from './BudgetCard';

const METRICS = Object.entries(METRIC_LABELS);

interface GoalCardProps {
  actId: string;
  currentMetrics: Record<string, number>;
}

export default function GoalCard({ actId, currentMetrics }: GoalCardProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formMetric, setFormMetric] = useState('leads');
  const [formValue, setFormValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [metricOpen, setMetricOpen] = useState(false);
  const metricRef = useRef<HTMLDivElement>(null);

  const fetchGoals = async () => {
    try {
      const { data } = await clientApi.getGoals(actId);
      setGoals(data);
    } catch {
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [actId]);

  const handleSave = async () => {
    const targetValue = parseFloat(formValue.replace(',', '.'));
    if (isNaN(targetValue) || targetValue <= 0) return;
    setSaving(true);
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await clientApi.setGoal(actId, formMetric, targetValue, month);
      fetchGoals();
      setShowForm(false);
      setFormValue('');
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await clientApi.deleteGoal(actId, id);
      fetchGoals();
    } catch {
      // silently fail
    }
  };

  const getStatusColor = (metric: string, target: number) => {
    const current = currentMetrics[metric] ?? 0;
    if (current === 0) return 'gray';

    const isInverse = metric === 'cpl';
    const percent = isInverse
      ? target > 0 ? (target / current) * 100 : 0
      : target > 0 ? (current / target) * 100 : 0;

    if (percent >= 100) return 'green';
    if (percent >= 60) return 'yellow';
    return 'red';
  };

  const colorMap = {
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
    gray: 'text-gray-400 dark:text-gray-500',
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
        <Loader2 size="14" className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          <Target size={14} />
          Metas
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800 dark:hover:text-blue-400"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>

      {showForm && (
        <div className="mb-3 space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-2 dark:border-blue-900/30 dark:bg-blue-950/20">
          <div className="flex gap-2">
            <div ref={metricRef} className="relative flex-1">
              <button
                type="button"
                onClick={() => setMetricOpen(!metricOpen)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900 transition-all hover:border-blue-500/50 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:hover:border-blue-500/50"
              >
                <span>{METRICS.find(([v]) => v === formMetric)?.[1] ?? 'Selecione'}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>
              {metricOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMetricOpen(false)} />
                  <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[180px] rounded-xl border border-gray-200 bg-white py-1 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                    {METRICS.map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => { setFormMetric(val); setMetricOpen(false); }}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                          formMetric === val
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span>{label}</span>
                        {formMetric === val && <CheckCircle size={12} className="ml-auto text-blue-500" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <input
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              className="w-20 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition-all hover:border-blue-500/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              placeholder="Valor"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !formValue}
            className="w-full rounded-md bg-blue-600 py-1.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="mx-auto animate-spin" /> : 'Definir Meta'}
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {goals.map((goal) => {
          const color = getStatusColor(goal.metric, Number(goal.targetValue));
          return (
            <div key={goal.id} className="group flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">{METRIC_LABELS[goal.metric] || goal.metric}</span>
                <span className={`text-xs font-bold ${colorMap[color as keyof typeof colorMap]}`}>
                  {currentMetrics[goal.metric] ?? 0} / {goal.targetValue}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {color === 'green' && <CheckCircle size={12} className="text-green-500" />}
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && !showForm && (
          <p className="text-center text-[10px] italic text-gray-400 dark:text-gray-500">Nenhuma meta definida</p>
        )}
      </div>
    </div>
  );
}
