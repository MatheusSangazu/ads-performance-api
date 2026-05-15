import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, AlertTriangle, Info, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { alertApi, type AlertItem } from '../lib/api';

const severityConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  critical: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
};

export default function AlertDropdown() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      const [alertsRes, countRes] = await Promise.all([
        alertApi.list(),
        alertApi.countUnread(),
      ]);
      setAlerts(alertsRes.data);
      setUnread(countRes.data.count);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    await alertApi.markRead(id);
    fetchData();
  };

  const handleMarkAllRead = async () => {
    await alertApi.markAllRead();
    fetchData();
  };

  const handleDismiss = async (id: string) => {
    await alertApi.dismiss(id);
    fetchData();
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) fetchData();
        }}
        className="relative flex items-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Notificacoes</h3>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                <CheckCheck size={14} />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-gray-500" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                Nenhuma notificacao
              </div>
            ) : (
              alerts.map((alert) => {
                const config = severityConfig[alert.severity] || severityConfig.info;
                const Icon = config.icon;

                return (
                  <div
                    key={alert.id}
                    className={`flex gap-3 border-b border-gray-800/50 px-4 py-3 transition-colors hover:bg-gray-800/50 ${
                      !alert.read ? config.bg : ''
                    }`}
                  >
                    <div className="mt-0.5">
                      <Icon size={16} className={config.color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!alert.read ? 'font-semibold text-white' : 'text-gray-300'}`}>
                          {alert.title}
                        </p>
                        <span className="shrink-0 text-xs text-gray-500">{formatDate(alert.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">{alert.message}</p>
                      <div className="mt-1.5 flex gap-2">
                        {!alert.read && (
                          <button
                            onClick={() => handleMarkRead(alert.id)}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Marcar como lida
                          </button>
                        )}
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="text-xs text-gray-500 hover:text-red-400"
                        >
                          Descartar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
