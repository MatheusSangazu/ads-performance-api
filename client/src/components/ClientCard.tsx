import { useState } from 'react';
import { Download, Key, Loader2, Trash2, X } from 'lucide-react';
import { clientApi, type Client } from '../lib/api';

interface ClientCardProps {
  client: Client;
  downloading: string | null;
  onDownload: (actId: string) => void;
  onTokenUpdated: () => void;
  onDelete: (actId: string) => Promise<void>;
  onError: (msg: string) => void;
}

export default function ClientCard({ client, downloading, onDownload, onTokenUpdated, onDelete, onError }: ClientCardProps) {
  const [showTokenEdit, setShowTokenEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpdateToken = async () => {
    if (!newToken.trim()) return;
    setSaving(true);
    try {
      await clientApi.updateToken(client.actId, newToken);
      setShowTokenEdit(false);
      setNewToken('');
      onTokenUpdated();
    } catch {
      onError('Erro ao atualizar token.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(client.actId);
    } catch {
      onError('Erro ao remover cliente.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-semibold text-white">{client.clientName}</h4>
        <span className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-400">
          {client.actId}
        </span>
      </div>
      {client.customEventId && (
        <p className="mb-3 text-xs text-gray-500">Custom Event: {client.customEventId}</p>
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
              disabled={saving || !newToken.trim()}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : null}
              Salvar
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
              disabled={deleting}
              className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
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
          onClick={() => { setShowTokenEdit(false); setShowDeleteConfirm(false); }}
          className="flex items-center gap-1 rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-600"
        >
          <Key size={14} />
          Token
        </button>
        <button
          onClick={() => onDownload(client.actId)}
          disabled={!!downloading}
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
          onClick={() => { setShowDeleteConfirm(!showDeleteConfirm); setShowTokenEdit(false); }}
          className="flex items-center gap-1 rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/30 hover:text-red-300"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
