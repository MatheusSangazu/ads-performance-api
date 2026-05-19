import { useState, useEffect } from 'react';
import { Download, Key, Loader2, RefreshCw, Trash2, X, Globe, ShieldCheck, ShieldAlert, AlertCircle, Pencil } from 'lucide-react';
import { clientApi, syncApi, type Client } from '../lib/api';
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
  const [currentSpend, setCurrentSpend] = useState(0);
  const [currentMetrics, setCurrentMetrics] = useState<Record<string, number>>({});

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
    } catch {
      onError('Erro ao atualizar token.');
    }
  };

  const handleClearToken = async () => {
    try {
      await clientApi.updateToken(client.actId, '');
      setShowTokenEdit(false);
      setNewToken('');
      onTokenUpdated();
      onSuccess(`Token individual removido. ${client.clientName} usará o token global.`);
    } catch {
      onError('Erro ao remover token.');
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

  const handleQuickSync = async () => {
    setQuickSyncing(true);
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
      onSuccess(`${client.clientName}: ${mainRecords + breakdownRecords} registros sincronizados (hoje).`);
    } catch {
      onError(`Erro ao sincronizar ${client.clientName}.`);
    } finally {
      setQuickSyncing(false);
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

  return (
    <div className="group relative rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 transition-all hover:border-blue-500/30 hover:bg-gray-50 shadow-sm hover:shadow-blue-900/5 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:bg-gray-900 dark:hover:shadow-blue-900/10">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h4 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors dark:text-white dark:group-hover:text-blue-400">{client.clientName}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 dark:bg-gray-950 dark:border-gray-800">
              {client.actId}
            </span>
            {renderHealthBadge()}
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

      <div className="grid grid-cols-2 gap-2">
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
          onClick={() => { setShowTokenEdit(!showTokenEdit); setShowDeleteConfirm(false); setShowEdit(false); }}
          className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-gray-100 px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <Key size={14} />
          Token
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
              <div className="flex gap-2 pt-2">
                <button onClick={handleSaveEdit} className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-500">Salvar Alterações</button>
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
              type="password"
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-amber-500 outline-none transition-all dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              placeholder="Cole o novo token aqui"
            />
            <div className="flex gap-2">
              <button onClick={handleUpdateToken} disabled={!newToken.trim()} className="flex-1 rounded-lg bg-amber-600 py-2 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50">Salvar Token</button>
              <button onClick={handleClearToken} className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Usar Global</button>
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
    </div>
  );
}
