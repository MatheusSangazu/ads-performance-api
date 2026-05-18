import { useEffect, useState } from 'react';
import { Key, Loader2, RefreshCw, Save, MessageCircle, QrCode, LogOut } from 'lucide-react';
import { settingsApi, authApi } from '../lib/api';
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
  const [phone, setPhone] = useState('');
  const [whatsappNotify, setWhatsappNotify] = useState(false);
  const [healthCheckTimes, setHealthCheckTimes] = useState<string[]>(['08', '12', '18']);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<{ state: string; instance?: string } | null>(null);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [qrData, setQrData] = useState<{ qrcode?: string; base64?: string; state: string } | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await authApi.me();
        const admin = meRes.data.role === 'admin';
        setIsAdmin(admin);

        const requests: Promise<any>[] = [];
        if (admin) {
          requests.push(
            settingsApi.getGlobalToken().then((r) => {
              setHasToken(!!r.data.globalToken);
              setToken(r.data.globalToken || '');
            }),
            settingsApi.getAutoSync().then((r) => setAutoSyncEnabled(r.data.enabled)),
            settingsApi.getWhatsappStatus().then((r) => setWhatsappStatus(r.data)).catch(() => setWhatsappStatus({ state: 'error' }))
          );
        }

        setPhone(meRes.data.phone || '');
        setWhatsappNotify(meRes.data.whatsappNotify);
        setHealthCheckTimes(meRes.data.healthCheckTimes ? meRes.data.healthCheckTimes.split(',') : []);
        setWeeklySummary(meRes.data.weeklySummary);

        await Promise.all(requests);
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

  const handleSaveWhatsapp = async () => {
    setSavingWhatsapp(true);
    setMessage(null);
    try {
      await authApi.updateProfile({ 
        phone, 
        whatsappNotify,
        healthCheckTimes: healthCheckTimes.join(','),
        weeklySummary
      });
      setMessage({ type: 'success', text: 'Configurações de WhatsApp salvas!' });
    } catch {
      setMessage({ type: 'error', text: 'Erro ao salvar configurações de WhatsApp.' });
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const handleLoadQR = async () => {
    setLoadingQR(true);
    try {
      const res = await settingsApi.getWhatsappQRCode();
      setQrData(res.data);
      const status = await settingsApi.getWhatsappStatus();
      setWhatsappStatus(status.data);
    } catch {
      setMessage({ type: 'error', text: 'Erro ao carregar QR code.' });
    } finally {
      setLoadingQR(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await settingsApi.whatsappLogout();
      setQrData(null);
      setWhatsappStatus({ state: 'close' });
      setMessage({ type: 'success', text: 'Instância desconectada.' });
    } catch {
      setMessage({ type: 'error', text: 'Erro ao desconectar.' });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Configurações</h2>

      {message && <Message type={message.type}>{message.text}</Message>}

      {isAdmin && (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
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
      )}

      {isAdmin && (
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
      )}

      <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600/20">
            <MessageCircle size={20} className="text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Notificações por WhatsApp</h3>
            <p className="text-sm text-gray-400">
              Receba alertas de orçamento e metas direto no WhatsApp.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Conexão:</span>
            {whatsappStatus?.state === 'open' ? (
              <span className="flex items-center gap-1.5 text-sm text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                Conectado{whatsappStatus.instance ? ` (${whatsappStatus.instance})` : ''}
              </span>
            ) : whatsappStatus?.state === 'not_configured' ? (
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <span className="h-2 w-2 rounded-full bg-gray-600" />
                Não configurado
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                Desconectado
              </span>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-400">Número do WhatsApp</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              placeholder="5511999999999"
            />
            <p className="mt-1 text-xs text-gray-500">
              DDI + DDD + número, sem espaços ou traços. Ex: 5511999999999
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setWhatsappNotify(!whatsappNotify)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                whatsappNotify ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  whatsappNotify ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${whatsappNotify ? 'text-green-400' : 'text-gray-400'}`}>
              {whatsappNotify ? 'Notificações ativadas' : 'Notificações desativadas'}
            </span>
          </div>

          {whatsappNotify && (
            <div className="ml-4 space-y-4 border-l border-gray-800 pl-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Checagem de Saúde das Contas</label>
                <p className="mb-3 text-xs text-gray-500">Selecione os horários para receber alertas de status da conta:</p>
                <div className="flex gap-4">
                  {['08', '12', '18'].map((h) => (
                    <label key={h} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={healthCheckTimes.includes(h)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setHealthCheckTimes([...healthCheckTimes, h]);
                          } else {
                            setHealthCheckTimes(healthCheckTimes.filter((t) => t !== h));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-400">{h}:00</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setWeeklySummary(!weeklySummary)}
                  className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                    weeklySummary ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      weeklySummary ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div className="flex flex-col">
                  <span className={`text-sm ${weeklySummary ? 'text-blue-400' : 'text-gray-400'}`}>
                    Resumo Semanal
                  </span>
                  <span className="text-[11px] text-gray-500">Relatório de performance toda segunda-feira às 09:00</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSaveWhatsapp}
              disabled={savingWhatsapp}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {savingWhatsapp ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Salvar
            </button>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-600/20">
              <QrCode size={20} className="text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Conexão WhatsApp (Admin)</h3>
              <p className="text-sm text-gray-400">
                Gerencie a conexão do número da plataforma com WhatsApp.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Status da instância:</span>
              {whatsappStatus?.state === 'open' ? (
                <span className="flex items-center gap-1.5 text-sm text-green-400">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  Conectado e pronto para enviar
                </span>
              ) : whatsappStatus?.state === 'not_configured' ? (
                <span className="text-sm text-gray-500">API não configurada (.env)</span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-yellow-400">
                  <span className="h-2 w-2 rounded-full bg-yellow-400" />
                  Aguardando conexão
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleLoadQR}
                disabled={loadingQR}
                className="flex items-center gap-2 rounded-lg bg-yellow-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:opacity-50"
              >
                {loadingQR ? <Loader2 size={18} className="animate-spin" /> : <QrCode size={18} />}
                {loadingQR ? 'Carregando...' : 'Gerar QR Code'}
              </button>

              {whatsappStatus?.state === 'open' && (
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-2 rounded-lg border border-red-600/50 bg-transparent px-5 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/10 disabled:opacity-50"
                >
                  {loggingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                  Desconectar
                </button>
              )}
            </div>

            {qrData?.base64 && (
              <div className="rounded-lg border border-gray-700 bg-white p-3 inline-block">
                <img
                  src={qrData.base64.startsWith('data:') ? qrData.base64 : `data:image/png;base64,${qrData.base64}`}
                  alt="QR Code WhatsApp"
                  className="h-48 w-48 sm:h-64 sm:w-64"
                />
                <p className="mt-2 text-center text-xs text-gray-600">
                  Escaneie com o WhatsApp para conectar
                </p>
              </div>
            )}

            {qrData?.state === 'open' && !qrData.base64 && (
              <p className="text-sm text-green-400">✓ Instância já está conectada. Nenhum QR code necessário.</p>
            )}

            {qrData?.state === 'error' && (
              <p className="text-sm text-red-400">Erro ao gerar QR code. Verifique se a Evolution API está online e o nome da instância está correto no .env.</p>
            )}

            {qrData?.state === 'unknown' && (
              <p className="text-sm text-yellow-400">Estado desconhecido. Verifique os logs do servidor.</p>
            )}
          </div>
        </div>
      )}

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
