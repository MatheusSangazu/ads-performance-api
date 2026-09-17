import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react';
import axios from 'axios';
import { clientApi } from '../lib/api';

interface BulkTokenModalProps {
  accountCount: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export default function BulkTokenModal({
  accountCount,
  onClose,
  onSuccess,
  onError,
}: BulkTokenModalProps) {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token.trim() || saving) return;

    setSaving(true);
    setErrorMessage('');
    try {
      const { data } = await clientApi.updateTokenForAll(token.trim());
      onSuccess(data.message);
      setToken('');
      onClose();
    } catch (error: unknown) {
      const message = axios.isAxiosError<{ error?: string }>(error)
        ? error.response?.data?.error || 'Erro ao atualizar o token das contas.'
        : 'Erro ao atualizar o token das contas.';
      setErrorMessage(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-token-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 id="bulk-token-title" className="font-bold text-gray-900 dark:text-white">
                Atualizar token de todas as contas
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                O novo token substituirá o atual em {accountCount}{' '}
                {accountCount === 1 ? 'conta acessível' : 'contas acessíveis'}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6">
          <label htmlFor="bulk-meta-token" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Novo token da Meta
          </label>
          <div className="relative">
            <input
              id="bulk-meta-token"
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              autoFocus
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              placeholder="Cole o novo token aqui"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 font-mono text-sm text-gray-900 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowToken((current) => !current)}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white"
              aria-label={showToken ? 'Ocultar token' : 'Exibir token'}
            >
              {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            Esta ação altera todas as contas acima de uma só vez e não pode ser desfeita automaticamente.
          </p>
          {errorMessage && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!token.trim() || saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving
              ? 'Atualizando...'
              : `Atualizar ${accountCount} ${accountCount === 1 ? 'conta' : 'contas'}`}
          </button>
        </div>
      </form>
    </div>
  );
}
