import { useState, useEffect } from 'react';
import { Wallet, Loader2, Pencil } from 'lucide-react';
import { clientApi, type Budget } from '../lib/api';

const METRIC_LABELS: Record<string, string> = {
  leads: 'Leads',
  cpl: 'CPL',
  roas: 'ROAS',
  ctr: 'CTR',
  clicks: 'Cliques',
  impressions: 'Impressões',
  purchases: 'Compras',
  purchase_value: 'Valor de Compras',
};

interface BudgetCardProps {
  actId: string;
  currentSpend: number;
}

export default function BudgetCard({ actId, currentSpend }: BudgetCardProps) {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchBudget = async () => {
    try {
      const { data } = await clientApi.getBudget(actId);
      setBudget(data);
    } catch {
      setBudget(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudget();
  }, [actId]);

  const handleSave = async () => {
    const amount = parseFloat(value.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;
    setSaving(true);
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await clientApi.setBudget(actId, month, amount);
      fetchBudget();
      setEditing(false);
      setValue('');
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 size={14} className="animate-spin" />
      </div>
    );
  }

  const budgetAmount = budget ? Number(budget.budgetAmount) : 0;
  const percent = budgetAmount > 0 ? Math.min((currentSpend / budgetAmount) * 100, 100) : 0;
  const isOverBudget = budgetAmount > 0 && currentSpend > budgetAmount;
  const barColor = isOverBudget
    ? 'bg-red-500'
    : percent >= 80
    ? 'bg-amber-500'
    : 'bg-green-500';

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
          <Wallet size={14} />
          Orçamento
        </div>
        <button
          onClick={() => {
            setEditing(true);
            setValue(budget ? String(budgetAmount) : '');
          }}
          className="text-gray-500 transition-colors hover:text-white"
        >
          <Pencil size={12} />
        </button>
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">R$</span>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-800 py-1 pl-7 pr-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              placeholder="5.000"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : 'OK'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
          >
            X
          </button>
        </div>
      ) : budgetAmount > 0 ? (
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-white">{formatCurrency(currentSpend)}</span>
            <span className="text-xs text-gray-400">de {formatCurrency(budgetAmount)}</span>
          </div>
          <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className={isOverBudget ? 'text-red-400' : 'text-gray-400'}>
              {percent.toFixed(0)}% investido
            </span>
            <span className={isOverBudget ? 'text-red-400 font-semibold' : 'text-green-400'}>
              {formatCurrency(Math.abs(budgetAmount - currentSpend))}
              {isOverBudget ? ' excedido' : ' restante'}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-600">Nenhum orçamento definido</p>
      )}
    </div>
  );
}

export { METRIC_LABELS };
