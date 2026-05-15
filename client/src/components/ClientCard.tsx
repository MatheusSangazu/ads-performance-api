import { useState, useEffect } from 'react';
import { Download, Key, Loader2, RefreshCw, Trash2, X, Globe, ShieldCheck, ShieldAlert, AlertCircle, Pencil } from 'lucide-react';
import { clientApi, syncApi, type Client } from '../lib/api';
import BudgetCard from './BudgetCard';
import GoalCard from './GoalCard';

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
        const { data } = await clientApi.metrics();
        const clientMetric = data.clientMetrics.find((c) => c.actId === client.actId);
        if (clientMetric) {
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
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-1 flex items-center justify-between">
        <h4 className="font-semibold text-white">{client.clientName}</h4>
        <span className="rounded bg-gray-800 px-2 py-1 text-[10px] text-gray-400">
          {client.actId}
        </span>
      </div>
      <div className="mb-3 flex items-center justify-between">
        {renderHealthBadge()}
        {client.customEventId && (
          <p className="text-[10px] text-gray-500">Event: {client.customEventId}</p>
        )}
      </div>

      <div className="mb-3 space-y-2">
        <BudgetCard actId={client.actId} currentSpend={currentSpend} />
        <GoalCard actId={client.actId} currentMetrics={currentMetrics} />
      </div>

      {showEdit && (
        <div className="mb-3 rounded-lg border border-blue-800/50 bg-gray-800 p-3 space-y-2">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Nome</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              placeholder="Nome do cliente"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Act ID</label>
            <input
              value={editActId}
              onChange={(e) => setEditActId(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              placeholder="act_123456789"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Custom Event ID</label>
            <input
              value={editCustomEvent}
              onChange={(e) => setEditCustomEvent(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              placeholder="Opcional"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSaveEdit}
              disabled={editLoading || !editName.trim() || !editActId.trim()}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {editLoading ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
              Salvar
            </button>
            <button
              onClick={() => { setShowEdit(false); setEditName(client.clientName); setEditActId(client.actId); setEditCustomEvent(client.customEventId || ''); }}
              className="flex items-center gap-1 rounded-lg bg-gray-600 px-3 py-1 text-xs font-medium text-white hover:bg-gray-500"
            >
              <X size={12} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showTokenEdit && (
        <div className="mb-3 rounded-lg border border-gray-700 bg-gray-800 p-3">
          <label className="mb-1 block text-xs text-gray-400">Novo Token</label>
          <input
            type="password"
            value={newToken}
            onChange={(e) => setNewToken(e.target.value)}
            className="mb-2 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            placeholder="Cole o novo token"
          />
          <div className="flex gap-2">
            <button
              onClick={handleUpdateToken}
              disabled={!newToken.trim()}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Salvar
            </button>
            <button
              onClick={handleClearToken}
              className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
            >
              <Globe size={12} />
              Usar global
            </button>
            <button
              onClick={() => { setShowTokenEdit(false); setNewToken(''); }}
              className="flex items-center gap-1 rounded-lg bg-gray-600 px-3 py-1 text-xs font-medium text-white hover:bg-gray-500"
            >
              <X size={12} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="mb-3 rounded-lg border border-red-900/50 bg-red-950/30 p-3">
          <p className="mb-2 text-xs text-red-300">
            Tem certeza? Todos os dados de performance também serão removidos. Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
            >
              <Trash2 size={12} />
              Confirmar
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-lg bg-gray-600 px-3 py-1 text-xs font-medium text-white hover:bg-gray-500"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleQuickSync}
          disabled={quickSyncing}
          className="flex items-center gap-1 rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
        >
          {quickSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {quickSyncing ? 'Syncing...' : 'Sync'}
        </button>
        <button
          onClick={() => { setShowTokenEdit(!showTokenEdit); setShowDeleteConfirm(false); setShowEdit(false); }}
          className="flex items-center gap-1 rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-600"
        >
          <Key size={14} />
          Token
        </button>
        <button
          onClick={() => { setShowEdit(!showEdit); setShowTokenEdit(false); setShowDeleteConfirm(false); }}
          className="flex items-center gap-1 rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-600"
        >
          <Pencil size={14} />
          Editar
        </button>
        <button
          onClick={() => onDownload(client.actId)}
          disabled={downloading === client.actId}
          className="flex items-center gap-1 rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-600 disabled:opacity-50"
        >
          {downloading === client.actId ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          Excel
        </button>
        <button
          onClick={() => { setShowDeleteConfirm(!showDeleteConfirm); setShowTokenEdit(false); setShowEdit(false); }}
          className="flex items-center gap-1 rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/30 hover:text-red-300"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
