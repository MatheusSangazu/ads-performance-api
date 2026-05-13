import { useEffect, useState } from 'react';
import { Key, Loader2, RefreshCw, Save } from 'lucide-react';
import { settingsApi } from '../lib/api';
import Message from '../components/ui/Message';

export default function Settings() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncResult, setSyncResult] = useState<string[] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tokenRes, syncRes] = await Promise.all([
          settingsApi.getGlobalToken(),
          settingsApi.getAutoSync(),
        ]);
        const current = tokenRes.data.globalToken;
        setHasToken(!!current);
        setToken(current || '');
        setAutoSyncEnabled(syncRes.data.enabled);
      } catch {
        setMessage({ type: 'error', text: 'Erro ao carregar configurações.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await settingsApi.setGlobalToken(token);
      setHasToken(!!token);
      setMessage({ type: 'success', text: 'Token global salvo com sucesso!' });
    } catch {
      setMessage({ type: 'error', text: 'Erro ao salvar token global.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAutoSync = async () => {
    const newVal = !autoSyncEnabled;
    try {
      await settingsApi.setAutoSync(newVal);
      setAutoSyncEnabled(newVal);
      setMessage({ type: 'success', text: newVal ? 'Auto-sync ativado!' : 'Auto-sync desativado.' });
    } catch {
      setMessage({ type: 'error', text: 'Erro ao alterar auto-sync.' });
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    setSyncResult(null);
    setMessage(null);
    try {
      const res = await settingsApi.syncAll();
      const data = res.data;
      setMessage({
        type: data.failed > 0 ? 'error' : 'success',
        text: `Sync concluído: ${data.success} OK, ${data.failed} falhas de ${data.total} clientes.`,
      });
      setSyncResult(data.details);
    } catch {
      setMessage({ type: 'error', text: 'Erro ao sincronizar todos os clientes.' });
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Configurações</h2>

      {message && <Message type={message.type}>{message.text}</Message>}

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20">
            <Key size={20} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Token Global</h3>
            <p className="text-sm text-gray-400">
              Fallback para clientes sem token próprio.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 size={18} className="animate-spin" />
            Carregando...
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="mb-1 block text-sm text-gray-400">Access Token do Meta</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="Cole aqui o token do Meta Ads"
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Salvar Token
              </button>

              {hasToken ? (
                <span className="flex items-center gap-1 text-sm text-green-400">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  Token configurado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-gray-600" />
                  Nenhum token
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20">
            <RefreshCw size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Auto-Sync Diário</h3>
            <p className="text-sm text-gray-400">
              Sincroniza automaticamente todos os clientes todo dia às 02:00, puxando os dados do dia anterior.
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-4">
          <button
            onClick={handleToggleAutoSync}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              autoSyncEnabled ? 'bg-green-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm ${autoSyncEnabled ? 'text-green-400' : 'text-gray-400'}`}>
            {autoSyncEnabled ? 'Ativado' : 'Desativado'}
          </span>
        </div>

        <div className="border-t border-gray-800 pt-4">
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            {syncingAll ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {syncingAll ? 'Sincronizando...' : 'Sincronizar Todos Agora'}
          </button>
          <p className="mt-2 text-xs text-gray-500">
            Executa o sync do dia anterior para todos os clientes imediatamente.
          </p>
        </div>

        {syncResult && (
          <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800 p-3">
            <p className="mb-2 text-xs font-semibold text-gray-300">Resultado:</p>
            <div className="space-y-1">
              {syncResult.map((line, i) => (
                <p key={i} className="font-mono text-xs text-gray-400">
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="mb-3 text-lg font-semibold">Como funciona?</h3>
        <div className="space-y-3 text-sm text-gray-400">
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-blue-400">1</span>
            <p><strong className="text-gray-200">Token por cliente:</strong> Cada cliente pode ter seu próprio token, cadastrado na criação ou editado pelo botão no card.</p>
          </div>
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-blue-400">2</span>
            <p><strong className="text-gray-200">Token global:</strong> Se um cliente não tiver token próprio, o sistema usa o token global automaticamente.</p>
          </div>
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600/20 text-xs font-bold text-purple-400">3</span>
            <p><strong className="text-gray-200">Auto-sync:</strong> Às 02:00 de cada dia, o sistema puxa os dados do dia anterior de todos os clientes automaticamente.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
