import { useEffect, useState, useCallback } from 'react';
import { clientApi, syncApi, type Client } from '../lib/api';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clientApi.list();
      setClients(res.data);
    } catch {
      setMessage({ type: 'error', text: 'Erro ao carregar clientes.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const clearMessage = () => setMessage(null);

  return { clients, loading, message, setMessage, fetchClients, clearMessage };
}

export function useSync() {
  const [syncing, setSyncing] = useState<string | null>(null);

  const syncAccount = async (actId: string, since: string, until: string) => {
    setSyncing(actId);
    try {
      const res = await syncApi.manual({ act_id: actId, since, until });
      return res.data;
    } finally {
      setSyncing(null);
    }
  };

  return { syncing, syncAccount };
}

export function useDownload() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadReport = async (actId: string, onError: (msg: string) => void) => {
    setDownloading(actId);
    try {
      const res = await clientApi.downloadReport(actId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_${actId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      onError('Erro ao baixar relatório.');
    } finally {
      setDownloading(null);
    }
  };

  return { downloading, downloadReport };
}
