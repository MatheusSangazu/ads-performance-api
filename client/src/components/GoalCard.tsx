import { useState, useEffect } from 'react';
import { Target, Loader2, Pencil, Trash2, Plus, X, CheckCircle } from 'lucide-react';
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
    green: 'text-green-400',
    yellow: 'text-amber-400',
    red: 'text-red-400',
    gray: 'text-gray-500',
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 size={14} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
          <Target size={14} />
          Metas
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-gray-500 transition-colors hover:text-white"
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
        </button>
      </div>

      {showForm && (
        <div className="mb-2 space-y-2 rounded border border-gray-700 bg-gray-800 p-2">
          <select
            value={formMetric}
            onChange={(e) => setFormMetric(e.target.value)}
            className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            {METRICS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="text"
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              className="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              placeholder="Valor da meta"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : 'OK'}
            </button>
          </div>
        </div>
      )}

      {goals.length === 0 && !showForm ? (
        <p className="text-xs text-gray-600">Nenhuma meta definida</p>
      ) : (
        <div className="space-y-1.5">
          {goals.map((goal) => {
            const current = currentMetrics[goal.metric] ?? 0;
            const target = Number(goal.targetValue);
            const status = getStatusColor(goal.metric, target);
            const percent = target > 0
              ? goal.metric === 'cpl'
                ? Math.min((target / Math.max(current, 0.01)) * 100, 100)
                : Math.min((current / target) * 100, 100)
              : 0;

            return (
              <div
                key={goal.id}
                className="flex items-center justify-between rounded bg-gray-800/50 px-2 py-1"
              >
                <div className="flex items-center gap-2">
                  {percent >= 100 ? (
                    <CheckCircle size={12} className="text-green-400" />
                  ) : (
                    <Target size={12} className={colorMap[status]} />
                  )}
                  <div>
                    <span className="text-xs font-medium text-white">
                      {METRIC_LABELS[goal.metric] || goal.metric}
                    </span>
                    <div className="flex items-center gap-1 text-xs">
                      <span className={colorMap[status]}>
                        {goal.metric === 'roas' || goal.metric === 'ctr'
                          ? current.toFixed(2)
                          : current.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-gray-600">/</span>
                      <span className="text-gray-400">
                        {goal.metric === 'roas' || goal.metric === 'ctr'
                          ? target.toFixed(2)
                          : target.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-gray-600">({percent.toFixed(0)}%)</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="text-gray-600 transition-colors hover:text-red-400"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
