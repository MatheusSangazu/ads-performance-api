import { useEffect, useState } from 'react';
import { Key, Loader2, Save } from 'lucide-react';
import { settingsApi } from '../lib/api';
import Message from '../components/ui/Message';

export default function Settings() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await settingsApi.getGlobalToken();
        const current = res.data.globalToken;
        setHasToken(!!current);
        setToken(current || '');
      } catch {
        setMessage({ type: 'error', text: 'Erro ao carregar token global.' });
      } finally {
        setLoading(false);
      }
    };
    fetchToken();
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
              Um único token para acessar todas as contas de anúncio. Será usado como fallback
              quando um cliente não tiver token próprio.
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

              {hasToken && (
                <span className="flex items-center gap-1 text-sm text-green-400">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  Token configurado
                </span>
              )}
              {!hasToken && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-gray-600" />
                  Nenhum token configurado
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
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
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-blue-400">3</span>
            <p><strong className="text-gray-200">Cenário típico:</strong> Se você gerencia todas as contas com um único token, configure apenas o token global. Caso cada cliente tenha seu próprio token, cadastre individualmente.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
