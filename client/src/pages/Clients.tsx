import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { clientApi, syncApi, createProgressStream } from '../lib/api';
import type { SyncFormBreakdowns } from '../components/SyncForm';
import type { LogEntry } from '../components/SyncProgressModal';
import { useClients, useSync, useDownload } from '../hooks/useClients';
import Message from '../components/ui/Message';
import ClientForm from '../components/ClientForm';
import SyncForm from '../components/SyncForm';
import ClientCard from '../components/ClientCard';
import SyncProgressModal from '../components/SyncProgressModal';

export default function Clients() {
  const { clients, loading, message, setMessage, fetchClients } = useClients();
  const { syncing, syncAccount } = useSync();
  const { downloading, downloadReport } = useDownload();
  const [showForm, setShowForm] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMinimized, setModalMinimized] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);

  const closeStreamRef = useRef<(() => void) | null>(null);

  const openModal = () => {
    setLogs([]);
    setProgress(0);
    setIsDone(false);
    setTotalRecords(0);
    setTotalErrors(0);
    setModalOpen(true);
    setModalMinimized(false);

    if (closeStreamRef.current) closeStreamRef.current();

    closeStreamRef.current = createProgressStream((event) => {
      const entry: LogEntry = { ...event, timestamp: new Date() };
      setLogs((prev) => [...prev, entry]);

      if (event.progress !== undefined) setProgress(event.progress);

      if (event.type === 'done') {
        setTotalRecords((prev) => prev + (event.records || 0));
        setTotalErrors((prev) => prev + (event.errors || 0));
      }
    });
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalMinimized(false);
    if (closeStreamRef.current) {
      closeStreamRef.current();
      closeStreamRef.current = null;
    }
  };

  const handleCreate = async (data: {
    name: string;
    act_id: string;
    access_token: string;
    custom_event_id?: string;
  }) => {
    await clientApi.create(data);
    setMessage({ type: 'success', text: 'Cliente cadastrado com sucesso!' });
    setShowForm(false);
    fetchClients();
  };

  const handleSync = async (
    data: { act_id: string; since: string; until: string },
    breakdowns: SyncFormBreakdowns,
  ) => {
    openModal();

    await syncAccount(data.act_id, data.since, data.until).catch(() => {});

    const hasBreakdown = breakdowns.audience || breakdowns.placement || breakdowns.region;
    if (hasBreakdown) {
      const activeBreakdowns = (
        ['audience', 'placement', 'region'] as const
      ).filter((t) => breakdowns[t]);

      if (activeBreakdowns.length === 3) {
        try {
          await syncApi.breakdownAll({
            act_id: data.act_id,
            since: data.since,
            until: data.until,
          });
        } catch { /* errors shown in modal via SSE */ }
      } else {
        for (const type of activeBreakdowns) {
          try {
            await syncApi.breakdown({
              act_id: data.act_id,
              since: data.since,
              until: data.until,
              type,
            });
          } catch { /* errors shown in modal via SSE */ }
        }
      }
    }

    setIsDone(true);
    setProgress(100);
  };

  const handleDownload = (actId: string) => {
    downloadReport(actId, (msg) => setMessage({ type: 'error', text: msg }));
  };

  const handleDelete = async (actId: string) => {
    await clientApi.delete(actId);
    setMessage({ type: 'success', text: 'Cliente removido com sucesso!' });
    fetchClients();
  };

  const form = ClientForm({
    onSubmit: handleCreate,
    onCancel: () => setShowForm(false),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Clientes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      {message && <Message type={message.type}>{message.text}</Message>}

      {form.form(showForm)}

      <SyncForm clients={clients} syncing={syncing} onSubmit={handleSync} />

      <h3 className="mb-4 text-lg font-semibold">Clientes Cadastrados</h3>
      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : clients.length === 0 ? (
        <p className="text-gray-500">Nenhum cliente cadastrado.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <ClientCard
              key={client.actId}
              client={client}
              downloading={downloading}
              onDownload={handleDownload}
              onTokenUpdated={fetchClients}
              onDelete={handleDelete}
              onError={(msg) => setMessage({ type: 'error', text: msg })}
              onSuccess={(msg) => setMessage({ type: 'success', text: msg })}
            />
          ))}
        </div>
      )}

      <SyncProgressModal
        logs={logs}
        progress={progress}
        isOpen={modalOpen}
        isMinimized={modalMinimized}
        onClose={closeModal}
        onMinimize={() => setModalMinimized(true)}
        onRestore={() => setModalMinimized(false)}
        isDone={isDone}
        totalRecords={totalRecords}
        totalErrors={totalErrors}
      />
    </div>
  );
}
