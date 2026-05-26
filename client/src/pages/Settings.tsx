import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Save, MessageCircle, QrCode, LogOut } from 'lucide-react';
import { settingsApi, authApi } from '../lib/api';
import Message from '../components/ui/Message';

export default function Settings() {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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
      }
    };
    fetchData();
  }, []);

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
        weeklySummary,
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
      <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Configurações</h2>

      {message && <Message type={message.type}>{message.text}</Message>}

      {isAdmin && (
      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/10 dark:bg-purple-600/20">
            <RefreshCw size={20} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Auto-Sync Diário</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sincroniza automaticamente todos os clientes todo dia às 02:00, puxando os dados do dia anterior.
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-4">
          <button
            onClick={handleToggleAutoSync}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              autoSyncEnabled ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm ${autoSyncEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {autoSyncEnabled ? 'Ativado' : 'Desativado'}
          </span>
        </div>

        <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            {syncingAll ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {syncingAll ? 'Sincronizando...' : 'Sincronizar Todos Agora'}
          </button>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Executa o sync do dia anterior para todos os clientes imediatamente.
          </p>
        </div>

        {syncResult && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Resultado:</p>
            <div className="space-y-1">
              {syncResult.map((line, i) => (
                <p key={i} className="font-mono text-xs text-gray-500 dark:text-gray-400">
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600/10 dark:bg-green-600/20">
            <MessageCircle size={20} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notificações por WhatsApp</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Receba alertas de orçamento e metas direto no WhatsApp.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Conexão:</span>
            {whatsappStatus?.state === 'open' ? (
              <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-500 dark:bg-green-400" />
                Conectado{whatsappStatus.instance ? ` (${whatsappStatus.instance})` : ''}
              </span>
            ) : whatsappStatus?.state === 'not_configured' ? (
              <span className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
                <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                Não configurado
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-500 dark:bg-red-400" />
                Desconectado
              </span>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">Número do WhatsApp</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              placeholder="5511999999999"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              DDI + DDD + número, sem espaços ou traços. Ex: 5511999999999
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setWhatsappNotify(!whatsappNotify)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                whatsappNotify ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  whatsappNotify ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${whatsappNotify ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {whatsappNotify ? 'Notificações ativadas' : 'Notificações desativadas'}
            </span>
          </div>

          {whatsappNotify && (
            <div className="ml-4 space-y-4 border-l border-gray-100 pl-4 dark:border-gray-800">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Checagem de Saúde das Contas</label>
                <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">Selecione os horários para receber alertas de status da conta:</p>
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
                        className="h-4 w-4 rounded border-gray-200 bg-white text-blue-600 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
                      />
                      <span className="text-sm text-gray-500 dark:text-gray-400">{h}:00</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setWeeklySummary(!weeklySummary)}
                  className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                    weeklySummary ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      weeklySummary ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div className="flex flex-col">
                  <span className={`text-sm ${weeklySummary ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    Resumo Semanal
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">Relatório de performance toda segunda-feira às 09:00</span>
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
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-600/10 dark:bg-yellow-600/20">
              <QrCode size={20} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Conexão WhatsApp (Admin)</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Gerencie a conexão do número da plataforma com WhatsApp.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">Status da instância:</span>
              {whatsappStatus?.state === 'open' ? (
                <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                  <span className="h-2 w-2 rounded-full bg-green-500 dark:bg-green-400" />
                  Conectado e pronto para enviar
                </span>
              ) : whatsappStatus?.state === 'not_configured' ? (
                <span className="text-sm text-gray-400 dark:text-gray-500">API não configurada (.env)</span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-yellow-600 dark:text-yellow-400">
                  <span className="h-2 w-2 rounded-full bg-yellow-500 dark:bg-yellow-400" />
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
                  className="flex items-center gap-2 rounded-lg border border-red-200 bg-transparent px-5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-600/50 dark:text-red-400 dark:hover:bg-red-600/10 disabled:opacity-50"
                >
                  {loggingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                  Desconectar
                </button>
              )}
            </div>

            {qrData?.base64 && (
              <div className="rounded-lg border border-gray-200 bg-white p-3 inline-block dark:border-gray-700">
                <img
                  src={qrData.base64.startsWith('data:') ? qrData.base64 : `data:image/png;base64,${qrData.base64}`}
                  alt="QR Code WhatsApp"
                  className="h-48 w-48 sm:h-64 sm:w-64"
                />
                <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                  Escaneie com o WhatsApp para conectar
                </p>
              </div>
            )}

            {qrData?.state === 'open' && !qrData.base64 && (
              <p className="text-sm text-green-600 dark:text-green-400">✓ Instância já está conectada. Nenhum QR code necessário.</p>
            )}

            {qrData?.state === 'error' && (
              <p className="text-sm text-red-600 dark:text-red-400">Erro ao gerar QR code. Verifique se a Evolution API está online e o nome da instância está correto no .env.</p>
            )}

            {qrData?.state === 'unknown' && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">Estado desconhecido. Verifique os logs do servidor.</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Como funciona?</h3>
        <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-xs font-bold text-blue-600 dark:bg-blue-600/20 dark:text-blue-400">1</span>
            <p><strong className="text-gray-700 dark:text-gray-200">Token por cliente:</strong> Cada cliente precisa ter seu próprio token cadastrado. Você pode informar na criação do cliente ou editar pelo botão de token no card.</p>
          </div>
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600/10 text-xs font-bold text-purple-600 dark:bg-purple-600/20 dark:text-purple-400">2</span>
            <p><strong className="text-gray-700 dark:text-gray-200">Auto-sync:</strong> Às 02:00 de cada dia, o sistema puxa os dados do dia anterior de todos os clientes automaticamente.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
