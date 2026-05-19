import { Download, RefreshCw, Trash2, Pencil, ShieldCheck, ShieldAlert, AlertCircle } from 'lucide-react';
import type { Client } from '../lib/api';

interface ClientTableProps {
  clients: Client[];
  downloading: string | null;
  onDownload: (actId: string) => void;
  onDelete: (actId: string) => void;
  onEdit: (client: Client) => void;
  onSync: (actId: string) => void;
}

export default function ClientTable({
  clients,
  downloading,
  onDownload,
  onDelete,
  onEdit,
  onSync
}: ClientTableProps) {
  const renderStatus = (status: number) => {
    const labels: Record<number, string> = {
      1: 'Ativa',
      2: 'Desativada',
      3: 'Pendência',
      7: 'Análise',
      101: 'Fechada',
    };
    const label = labels[status] || 'Desconhecido';

    if (status === 1) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400">
          <ShieldCheck size={14} />
          {label}
        </span>
      );
    }
    if ([2, 101].includes(status)) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
          <ShieldAlert size={14} />
          {label}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
        <AlertCircle size={14} />
        {label}
      </span>
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/50">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/80">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Cliente</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Act ID</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {clients.map((client) => (
              <tr key={client.actId} className="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 dark:text-white">{client.clientName}</div>
                  {client.customEventId && (
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">Event: {client.customEventId}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-mono text-gray-500 dark:text-gray-400">
                  {client.actId}
                </td>
                <td className="px-6 py-4">
                  {renderStatus(client.accountStatus || 0)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onSync(client.actId)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400 transition-all"
                      title="Sincronizar"
                    >
                      <RefreshCw size={18} />
                    </button>
                    <button
                      onClick={() => onDownload(client.actId)}
                      disabled={downloading === client.actId}
                      className="rounded-lg p-2 text-gray-400 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-all disabled:opacity-30"
                      title="Download Excel"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      onClick={() => onEdit(client)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 transition-all"
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(client.actId)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
