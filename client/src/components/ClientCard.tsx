import { useState, useEffect, useRef } from 'react';
import { Download, Key, Loader2, RefreshCw, Trash2, X, ShieldCheck, ShieldAlert, AlertCircle, Pencil, Wallet, Plus, Zap, MessageSquare, CheckCircle, ChevronDown } from 'lucide-react';
import { clientApi, syncApi, createProgressStream, type Client, type CustomConversion } from '../lib/api';
import BudgetCard from './BudgetCard';
import GoalCard from './GoalCard';
import HelpTooltip from './HelpTooltip';

interface ClientCardProps {
  client: Client;
  downloading: string | null;
  onDownload: (actId: string) => void;
  onTokenUpdated: () => void;
  onDelete: (actId: string) => Promise<void>;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

const TYPE_OPTIONS = [
  { value: 'lead_gen', label: 'Leads', icon: '📋' },
  { value: 'ecommerce', label: 'E-commerce', icon: '🛒' },
  { value: 'infoproduct', label: 'Infoproduto', icon: '🎓' },
  { value: 'messaging', label: 'Mensagens', icon: '💬' },
  { value: 'delivery', label: 'Delivery', icon: '🛵' },
];

export default function ClientCard({ client, downloading, onDownload, onTokenUpdated, onDelete, onError, onSuccess }: ClientCardProps) {
  const [showTokenEdit, setShowTokenEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState(client.clientName);
  const [editActId, setEditActId] = useState(client.actId);
  const [editCustomEvent, setEditCustomEvent] = useState(client.customEventId || '');
  const [editLoading, setEditLoading] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [quickSyncing, setQuickSyncing] = useState(false);
  const [syncProgressPct, setSyncProgressPct] = useState(0);
  const [syncDone, setSyncDone] = useState(false);
  const [syncRecordCount, setSyncRecordCount] = useState(0);
  const closeStreamRef = useRef<(() => void) | null>(null);
  const [currentSpend, setCurrentSpend] = useState(0);
  const [currentMetrics, setCurrentMetrics] = useState<Record<string, number>>({});
  const [showBalance, setShowBalance] = useState(false);
  const [isBoleto, setIsBoleto] = useState(client.isBoleto || false);
  const [threshold, setThreshold] = useState(client.balanceThreshold ? String(client.balanceThreshold) : '');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [showConversions, setShowConversions] = useState(false);
  const [customConversions, setCustomConversions] = useState<CustomConversion[]>([]);
  const [newConvEventId, setNewConvEventId] = useState('');
  const [newConvLabel, setNewConvLabel] = useState('');
  const [convLoading, setConvLoading] = useState(false);
  const [summarySending, setSummarySending] = useState(false);
  const [clientType, setClientType] = useState<'lead_gen' | 'ecommerce' | 'infoproduct' | 'messaging' | 'delivery'>(client.clientType ?? 'lead_gen');
  const [typeOpen, setTypeOpen] = useState(false);
  const typeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const today = now.toISOString().split('T')[0];
        const { data } = await clientApi.metrics({ since: monthStart, until: today, clientId: client.actId });
        if (data.clientMetrics && data.clientMetrics.length > 0) {
          const clientMetric = data.clientMetrics[0];
          setCurrentSpend(clientMetric.spend);
          setCurrentMetrics({
            leads: clientMetric.leads,
            roas: clientMetric.roas,
            clicks: data.totalClicks,
            impressions: data.totalImpressions,
            purchases: data.totalPurchases,
            purchase_value: data.totalPurchaseValue,
          });
        }
      } catch {
        // silently fail
      }
    };
    fetchMetrics();
  }, [client.actId]);

  const handleUpdateToken = async () => {
    if (!newToken.trim()) return;
    try {
      await clientApi.updateToken(client.actId, newToken);
      setShowTokenEdit(false);
      setNewToken('');
      onTokenUpdated();
      onSuccess(`Token atualizado para ${client.clientName}.`);
    } catch {
      onError('Erro ao atualizar token.');
    }
  };

  const handleSaveEdit = async () => {
    setEditLoading(true);
    try {
      await clientApi.update(client.actId, {
        name: editName,
        act_id: editActId,
        custom_event_id: editCustomEvent,
      });
      setShowEdit(false);
      onTokenUpdated();
      onSuccess('Cliente atualizado com sucesso!');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erro ao atualizar cliente.';
      onError(msg);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(client.actId);
    } catch {
      onError('Erro ao remover cliente.');
    }
    setShowDeleteConfirm(false);
  };

  const handleSendSummary = async () => {
    setSummarySending(true);
    try {
      const { data } = await clientApi.sendSummary(client.actId);
      onSuccess(data.message || 'Resumo enviado via WhatsApp!');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erro ao enviar resumo. Verifique se o WhatsApp está conectado.';
      onError(msg);
    } finally {
      setSummarySending(false);
    }
  };

  const handleToggleType = async (newType: 'lead_gen' | 'ecommerce' | 'infoproduct' | 'messaging' | 'delivery') => {
    const prevType = clientType;
    setClientType(newType);
    setTypeOpen(false);
    try {
      await clientApi.updateClientType(client.actId, newType);
      const labels: Record<string, string> = {
        lead_gen: 'Geração de Leads', ecommerce: 'E-commerce',
        infoproduct: 'Infoproduto', messaging: 'Mensagens', local: 'Negócio Local',
      };
      onSuccess(`Tipo alterado para ${labels[newType] || newType}`);
    } catch {
      setClientType(prevType);
      onError('Erro ao alterar tipo do cliente.');
    }
  };

  const handleQuickSync = async () => {
    setQuickSyncing(true);
    setSyncProgressPct(0);
    setSyncDone(false);
    setSyncRecordCount(0);

    if (closeStreamRef.current) closeStreamRef.current();
    closeStreamRef.current = createProgressStream((event) => {
      if (event.progress !== undefined) {
        setSyncProgressPct(Math.min(event.progress, 99));
      }
      if (event.type === 'done') {
        setSyncRecordCount((prev) => prev + (event.records || 0));
      }
    });

    try {
      const today = getToday();
      const res = await syncApi.manual({
        act_id: client.actId,
        since: today,
        until: today,
      });
      const breakdownRes = await syncApi.breakdownAll({
        act_id: client.actId,
        since: today,
        until: today,
      }).catch(() => null);
      const mainRecords = res.data.records || 0;
      const breakdownRecords = breakdownRes
        ? Object.values(breakdownRes.data).reduce((sum: number, r: any) => sum + (r.records || 0), 0)
        : 0;
      setSyncProgressPct(100);
      setSyncDone(true);
      setSyncRecordCount(mainRecords + breakdownRecords);
      onSuccess(`${client.clientName}: ${mainRecords + breakdownRecords} registros sincronizados (hoje).`);
      setTimeout(() => {
        setSyncDone(false);
        setSyncProgressPct(0);
      }, 3000);
    } catch {
      onError(`Erro ao sincronizar ${client.clientName}.`);
      setSyncProgressPct(0);
      setSyncDone(false);
    } finally {
      setQuickSyncing(false);
      if (closeStreamRef.current) {
        closeStreamRef.current();
        closeStreamRef.current = null;
      }
    }
  };

  const handleSaveBalance = async () => {
    setBalanceLoading(true);
    try {
      await clientApi.updateBalanceSettings(client.actId, {
        is_boleto: isBoleto,
        ...(threshold ? { balance_threshold: Number(threshold) } : {}),
      });
      setShowBalance(false);
      onSuccess('Configurações de saldo atualizadas!');
    } catch {
      onError('Erro ao salvar configurações de saldo.');
    } finally {
      setBalanceLoading(false);
    }
  };

  const loadConversions = async () => {
    try {
      const res = await clientApi.getCustomConversions(client.actId);
      setCustomConversions(res.data);
    } catch {
      setCustomConversions([]);
    }
  };

  const handleAddConversion = async () => {
    if (!newConvEventId.trim() || !newConvLabel.trim()) return;
    setConvLoading(true);
    try {
      await clientApi.addCustomConversion(client.actId, {
        custom_event_id: newConvEventId.trim(),
        label: newConvLabel.trim(),
      });
      setNewConvEventId('');
      setNewConvLabel('');
      await loadConversions();
      onSuccess('Conversão personalizada adicionada!');
    } catch {
      onError('Erro ao adicionar conversão.');
    } finally {
      setConvLoading(false);
    }
  };

  const handleDeleteConversion = async (id: number) => {
    setConvLoading(true);
    try {
      await clientApi.deleteCustomConversion(client.actId, id);
      await loadConversions();
      onSuccess('Conversão removida.');
    } catch {
      onError('Erro ao remover conversão.');
    } finally {
      setConvLoading(false);
    }
  };

  const renderHealthBadge = () => {
    if (!client.accountStatus) return null;

    const labels: Record<number, string> = {
      1: 'Ativa',
      2: 'Desativada',
      3: 'Pendência de Pagamento',
      7: 'Análise de Risco',
      9: 'Período de Graça',
      100: 'Fechamento Pendente',
      101: 'Fechada',
    };

    const status = client.accountStatus;
    const label = labels[status] || 'Desconhecido';
    
    if (status === 1) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-green-400" title={label}>
          <ShieldCheck size={12} />
          {label}
        </span>
      );
    }

    if ([2, 100, 101].includes(status)) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-red-400" title={label}>
          <ShieldAlert size={12} />
          {label}
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400" title={label}>
        <AlertCircle size={12} />
        {label}
      </span>
    );
  };

  const renderBalanceBadge = () => {
    if (!client.isBoleto) return null;

    const balance = client.currentBalance;
    const thresh = client.balanceThreshold;

    if (balance !== null && thresh !== null && balance < thresh) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-red-400" title={`Saldo baixo: R$ ${Number(balance).toFixed(2)}`}>
          <Wallet size={12} />
          Saldo baixo
        </span>
      );
    }

    if (balance !== null) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-blue-400" title={`Saldo: R$ ${Number(balance).toFixed(2)}`}>
          <Wallet size={12} />
          R$ {Number(balance).toFixed(2)}
        </span>
      );
    }

    return null;
  };

  return (
    <div className="group relative rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 transition-all hover:border-blue-500/30 hover:bg-gray-50 shadow-sm hover:shadow-blue-900/5 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:bg-gray-900 dark:hover:shadow-blue-900/10">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h4 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors dark:text-white dark:group-hover:text-blue-400">{client.clientName}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 dark:bg-gray-950 dark:border-gray-800">
              {client.actId}
            </span>
            <div ref={typeRef} className="relative">
              <button
                type="button"
                onClick={() => setTypeOpen(!typeOpen)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition-all hover:border-blue-500/50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-blue-500/50"
              >
                {TYPE_OPTIONS.find(o => o.value === clientType)?.icon}
                <span>{TYPE_OPTIONS.find(o => o.value === clientType)?.label}</span>
                <ChevronDown size={12} className="text-gray-400" />
              </button>
              {typeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setTypeOpen(false)} />
                  <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[180px] rounded-xl border border-gray-200 bg-white py-1 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                    {TYPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleToggleType(opt.value as any)}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                          clientType === opt.value
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                        {clientType === opt.value && <CheckCircle size={12} className="ml-auto text-blue-500" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {renderHealthBadge()}
            {renderBalanceBadge()}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button
            onClick={() => { setShowEdit(!showEdit); setShowTokenEdit(false); setShowDeleteConfirm(false); }}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors dark:hover:bg-gray-800 dark:hover:text-white"
            title="Editar informações"
          >
            <Pencil size={16} />
          </button>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        <BudgetCard actId={client.actId} currentSpend={currentSpend} />
        <GoalCard actId={client.actId} currentMetrics={currentMetrics} />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={handleQuickSync}
          disabled={quickSyncing}
          className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-green-600/10 px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-green-600 transition-all hover:bg-green-600 hover:text-white disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-600"
        >
          {quickSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Sincronizar
        </button>
        
        <button
          onClick={() => onDownload(client.actId)}
          disabled={downloading === client.actId}
          className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-blue-600/10 px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-blue-600 transition-all hover:bg-blue-600 hover:text-white disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-600"
        >
          {downloading === client.actId ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          Excel
        </button>

        <button
          onClick={() => { setShowTokenEdit(!showTokenEdit); setShowDeleteConfirm(false); setShowEdit(false); setShowBalance(false); }}
          className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-gray-100 px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <Key size={14} />
          Token
        </button>

        <button
          onClick={() => { setShowBalance(!showBalance); setShowTokenEdit(false); setShowDeleteConfirm(false); setShowEdit(false); setShowConversions(false); }}
          className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-purple-600/10 px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-purple-600 transition-all hover:bg-purple-600 hover:text-white dark:text-purple-400 dark:hover:bg-purple-600"
        >
          <Wallet size={14} />
          Saldo
        </button>

        <button
          onClick={() => { setShowConversions(!showConversions); setShowTokenEdit(false); setShowDeleteConfirm(false); setShowEdit(false); setShowBalance(false); if (!showConversions) loadConversions(); }}
          className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-emerald-600/10 px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-emerald-600 transition-all hover:bg-emerald-600 hover:text-white dark:text-emerald-400 dark:hover:bg-emerald-600"
        >
          <Zap size={14} />
          Conv.
        </button>

        <button
          onClick={handleSendSummary}
          disabled={summarySending}
          className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-sky-600/10 px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-sky-600 transition-all hover:bg-sky-600 hover:text-white disabled:opacity-50 dark:text-sky-400 dark:hover:bg-sky-600"
        >
          {summarySending ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
          Resumo
        </button>

        <button
          onClick={() => { setShowDeleteConfirm(!showDeleteConfirm); setShowTokenEdit(false); setShowEdit(false); }}
          className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-red-600/10 px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-red-600 transition-all hover:bg-red-600 hover:text-white dark:text-red-400 dark:hover:bg-red-600"
        >
          <Trash2 size={14} />
          Excluir
        </button>
      </div>

      {/* Modais Inline com animações suaves */}
      <div className="mt-4 overflow-hidden transition-all duration-300">
        {showEdit && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-blue-500/10 pb-2 mb-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider dark:text-blue-400">Editar Cliente</span>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white"><X size={14} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase">Nome Comercial</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 outline-none transition-all dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase">ID da Conta (act_)</label>
                <input
                  value={editActId}
                  onChange={(e) => setEditActId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 outline-none transition-all dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase">Custom Event ID</label>
                <input
                  value={editCustomEvent}
                  onChange={(e) => setEditCustomEvent(e.target.value)}
                  placeholder="Opcional"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 outline-none transition-all dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:placeholder-gray-600"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleSaveEdit} disabled={editLoading} className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50 flex items-center justify-center gap-2">
                  {editLoading && <Loader2 size={14} className="animate-spin" />}
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Token Edit */}
        {showTokenEdit && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-amber-500/10 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider dark:text-amber-400">Token de Acesso</span>
                <HelpTooltip title="Como obter o Token">
                  <p>Acesse o Graph API Explorer, selecione o app e adicione ads_read.</p>
                </HelpTooltip>
              </div>
              <button onClick={() => setShowTokenEdit(false)} className="text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white"><X size={14} /></button>
            </div>
            <input
              type="text"
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-amber-500 outline-none transition-all font-mono tracking-wider dark:border-gray-800 dark:bg-gray-950 dark:text-white selection:bg-amber-500/20"
              placeholder="Cole o novo token aqui"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
            <div className="flex gap-2">
              <button onClick={handleUpdateToken} disabled={!newToken.trim()} className="flex-1 rounded-lg bg-amber-600 py-2 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50">Salvar Token</button>
            </div>
          </div>
        )}

        {/* Balance Settings */}
        {showBalance && (
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-purple-500/10 pb-2 mb-2">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider dark:text-purple-400">Configurações de Saldo (Boleto)</span>
              <button onClick={() => setShowBalance(false)} className="text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white"><X size={14} /></button>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBoleto}
                  onChange={(e) => setIsBoleto(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Conta Boleto</span>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Ativa o monitoramento de saldo com alertas WhatsApp</p>
                </div>
              </label>
              {isBoleto && (
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase">Limite de Alerta (R$)</label>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="Ex: 100.00"
                    step="0.01"
                    min="0"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 outline-none transition-all dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:placeholder-gray-600"
                  />
                  <p className="mt-1 text-[10px] text-gray-400">Alerta enviado quando saldo ficar abaixo deste valor</p>
                </div>
              )}
              {client.currentBalance !== null && (
                <div className="rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Saldo Atual</span>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">R$ {Number(client.currentBalance).toFixed(2)}</p>
                  {client.balanceUpdatedAt && (
                    <p className="text-[10px] text-gray-400">Atualizado: {new Date(client.balanceUpdatedAt).toLocaleString('pt-BR')}</p>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={handleSaveBalance} disabled={balanceLoading} className="flex-1 rounded-lg bg-purple-600 py-2 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-50 flex items-center justify-center gap-2">
                  {balanceLoading && <Loader2 size={14} className="animate-spin" />}
                  Salvar Configurações
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Conversions */}
        {showConversions && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2 mb-2">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider dark:text-emerald-400">Conversões Personalizadas</span>
              <button onClick={() => setShowConversions(false)} className="text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white"><X size={14} /></button>
            </div>

            {client.customEventId && (
              <div className="rounded-lg bg-amber-500/10 px-3 py-2">
                <span className="text-[10px] font-bold text-amber-500 uppercase">Conversão Principal (legado)</span>
                <p className="text-sm font-mono text-gray-900 dark:text-white">{client.customEventId}</p>
                <p className="text-[10px] text-gray-400">Configurada no campo custom_event_id do cliente</p>
              </div>
            )}

            {customConversions.length > 0 && (
              <div className="space-y-2">
                {customConversions.map((conv) => (
                  <div key={conv.id} className="flex items-center justify-between rounded-lg bg-white dark:bg-gray-800 px-3 py-2 border border-gray-100 dark:border-gray-700">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{conv.label}</p>
                      <p className="text-[10px] font-mono text-gray-400 truncate">{conv.customEventId}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteConversion(conv.id)}
                      disabled={convLoading}
                      className="ml-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-emerald-500/10 pt-3 space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Adicionar Nova Conversão</p>
              <input
                type="text"
                value={newConvLabel}
                onChange={(e) => setNewConvLabel(e.target.value)}
                placeholder="Nome (ex: Compra Premium)"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 outline-none transition-all dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:placeholder-gray-600"
              />
              <input
                type="text"
                value={newConvEventId}
                onChange={(e) => setNewConvEventId(e.target.value)}
                placeholder="Event ID (ex: offsite_conversion.123456)"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono text-gray-900 focus:border-emerald-500 outline-none transition-all dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:placeholder-gray-600"
              />
              <button
                onClick={handleAddConversion}
                disabled={convLoading || !newConvEventId.trim() || !newConvLabel.trim()}
                className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {convLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Adicionar Conversão
              </button>
            </div>
          </div>
        )}

        {/* Confirmação de Exclusão */}
        {showDeleteConfirm && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 animate-in fade-in zoom-in-95">
             <div className="flex items-center gap-2 text-red-600 mb-2 dark:text-red-400">
               <AlertCircle size={16} />
               <span className="text-xs font-bold uppercase tracking-wider">Atenção</span>
             </div>
             <p className="text-xs text-gray-500 leading-relaxed mb-4 dark:text-gray-400">
               Você está prestes a remover <strong>{client.clientName}</strong>. Todos os dados históricos serão apagados permanentemente.
             </p>
             <div className="flex gap-2">
               <button onClick={handleDelete} className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-500">Confirmar Exclusão</button>
               <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-lg bg-gray-100 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Manter Cliente</button>
             </div>
          </div>
        )}
      </div>

      {(quickSyncing || syncDone) && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-2xl transition-all duration-300 dark:border-gray-700 dark:bg-gray-900 ${
          syncDone ? 'animate-in fade-in slide-in-from-bottom-2' : ''
        }`}>
          {syncDone ? (
            <CheckCircle size={18} className="text-green-500 dark:text-green-400" />
          ) : (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          )}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              {syncDone
                ? `${client.clientName}: ${syncRecordCount} registros`
                : `${client.clientName}: ${syncProgressPct}%`}
            </span>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  syncDone ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${syncDone ? 100 : syncProgressPct}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
