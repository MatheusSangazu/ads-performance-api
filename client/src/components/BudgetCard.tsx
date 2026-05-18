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
      <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
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
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          <Wallet size={14} />
          Orçamento
        </div>
        <button
          onClick={() => {
            setEditing(true);
            setValue(budget ? String(budgetAmount) : '');
          }}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800 dark:hover:text-blue-400"
        >
          <Pencil size={12} />
        </button>
      </div>

      {editing ? (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 focus:border-blue-500 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="0,00"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-blue-600 px-2 py-1 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : 'Salvar'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-[10px] text-gray-500 hover:underline dark:text-gray-400"
          >
            Sair
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(currentSpend)}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                de {budgetAmount > 0 ? formatCurrency(budgetAmount) : 'não definido'}
              </p>
            </div>
            {budgetAmount > 0 && (
              <span className={`text-xs font-bold ${isOverBudget ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                {percent.toFixed(0)}%
              </span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className={`h-full transition-all duration-500 ${barColor}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export { METRIC_LABELS };
