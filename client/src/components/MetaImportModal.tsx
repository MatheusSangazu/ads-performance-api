import { useState } from 'react';
import { X, CheckCircle, Circle, Loader2, AlertTriangle } from 'lucide-react';
import { metaApi } from '../lib/api';
import type { PlanLimit } from '../lib/api';

interface Account {
  id: string;
  name: string;
}

interface MetaImportModalProps {
  setupId: string;
  accounts: Account[];
  limit: PlanLimit;
  onClose: () => void;
  onImported: () => void;
}

export default function MetaImportModal({ setupId, accounts, limit, onClose, onImported }: MetaImportModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ imported: number; skipped: number; errorMessage?: string } | null>(null);

  const isUnlimited = limit.maxClients === null || limit.maxClients === -1 || limit.remaining === null;
  const slotsLeft = isUnlimited ? Infinity : (limit.remaining ?? 0);
  const overLimit = !isUnlimited && selected.size > slotsLeft;

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === accounts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(accounts.map(a => a.id)));
    }
  };

  const handleImport = async () => {
    if (selected.size === 0 || overLimit) return;
    setLoading(true);
    try {
      const { data } = await metaApi.importAccounts(setupId, Array.from(selected));
      setDone(data);
      onImported();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erro ao importar contas.';
      setDone({ imported: -1, skipped: 0, errorMessage: msg });
    } finally {
      setLoading(false);
    }
  };

  if (done && done.imported >= 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 dark:bg-black/60">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle size={48} className="text-green-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Importação concluída!</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-green-600">{done.imported}</span> conta{done.imported !== 1 ? 's' : ''} importada{done.imported !== 1 ? 's' : ''}
              {done.skipped > 0 && (
                <> e <span className="font-semibold text-blue-600">{done.skipped}</span> token{done.skipped !== 1 ? 's' : ''} atualizado{done.skipped !== 1 ? 's' : ''}</>
              )}
            </p>
            <button
              onClick={onClose}
              className="mt-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 dark:bg-black/60">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Selecionar Contas de Anúncio</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2">
          <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
            overLimit
              ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              : slotsLeft <= 3 && !isUnlimited
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
          }`}>
            {overLimit ? (
              <>
                <AlertTriangle size={16} className="shrink-0" />
                <span className="font-semibold">
                  Limite excedido! Selecione no máximo {slotsLeft} conta{slotsLeft !== 1 ? 's' : ''}
                </span>
              </>
            ) : (
              <>
                <span className="font-medium">
                  Plano {limit.planName}: {limit.currentClients}/{isUnlimited ? '∞' : limit.maxClients} contas
                  {!isUnlimited && ` — restam ${slotsLeft} vaga${slotsLeft !== 1 ? 's' : ''}`}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-3">
          <button
            onClick={toggleAll}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
          >
            {selected.size === accounts.length ? 'Desmarcar todas' : 'Selecionar todas'}
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto px-6 pb-4">
          {accounts.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Nenhuma conta de anúncio encontrada.</p>
          ) : (
            <div className="space-y-2">
              {accounts.map(account => (
                <button
                  key={account.id}
                  onClick={() => toggle(account.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    selected.has(account.id)
                      ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/30'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500'
                  }`}
                >
                  {selected.has(account.id) ? (
                    <CheckCircle size={20} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Circle size={20} className="shrink-0 text-gray-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{account.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{account.id}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {done && done.imported < 0 && done.errorMessage && (
          <div className="mx-6 mb-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {done.errorMessage}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {selected.size} de {accounts.length} selecionada{selected.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleImport}
            disabled={selected.size === 0 || loading || overLimit}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Importar ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}
