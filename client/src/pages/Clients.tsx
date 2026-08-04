import { useState, useRef, useMemo, useEffect } from 'react';
import { Search, Link2, Loader2 } from 'lucide-react';
import { clientApi, syncApi, createProgressStream, metaApi } from '../lib/api';
import type { PlanLimit } from '../lib/api';
import type { SyncFormBreakdowns } from '../components/SyncForm';
import type { LogEntry } from '../components/SyncProgressModal';
import { useClients, useSync, useDownload } from '../hooks/useClients';
import Message from '../components/ui/Message';
import ClientForm from '../components/ClientForm';
import SyncForm from '../components/SyncForm';
import ClientCard from '../components/ClientCard';
import SyncProgressModal from '../components/SyncProgressModal';
import MetaImportModal from '../components/MetaImportModal';
import ClientHeader from '../components/ClientHeader';
import ClientTable from '../components/ClientTable';
import { SkeletonClientList } from '../components/SkeletonClient';

export default function Clients() {
  const { clients, loading, message, setMessage, fetchClients } = useClients();
  const { syncing, syncAccount } = useSync();
  const { downloading, downloadReport, downloadPdf } = useDownload();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [metaImportModal, setMetaImportModal] = useState<{ setupId: string; accounts: { id: string; name: string }[]; limit: PlanLimit } | null>(null);
  const [metaConnecting, setMetaConnecting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const metaSetup = params.get('meta_setup');
    const metaError = params.get('meta_error');

    if (metaSetup) {
      window.history.replaceState({}, '', window.location.pathname);
      metaApi.getSetup(metaSetup).then(({ data }) => {
        setMetaImportModal({ setupId: data.setupId, accounts: data.accounts, limit: data.limit });
      }).catch(() => {
        setMessage({ type: 'error', text: 'Erro ao carregar contas. Tente novamente.' });
      });
    } else if (metaError) {
      setMessage({ type: 'error', text: `Erro ao conectar Meta: ${metaError}` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleMetaConnect = async () => {
    setMetaConnecting(true);
    try {
      const { data } = await metaApi.getAuthorizeUrl();
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      window.open(
        data.url,
        'meta-oauth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );
    } catch {
      setMessage({ type: 'error', text: 'Erro ao iniciar conexão com Meta.' });
    } finally {
      setMetaConnecting(false);
    }
  };

  // Filtragem derivativa para melhor performance
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          client.actId.includes(searchTerm);
      const matchesStatus = filterStatus === 'all' || client.accountStatus?.toString() === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, filterStatus]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMinimized, setModalMinimized] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const stepsRef = useRef<string[]>([]);
  const currentStepIdxRef = useRef(0);

  const closeStreamRef = useRef<(() => void) | null>(null);

  const openModal = () => {
    setLogs([]);
    setProgress(0);
    setIsDone(false);
    setTotalRecords(0);
    setTotalErrors(0);
    stepsRef.current = [];
    currentStepIdxRef.current = 0;
    setModalOpen(true);
    setModalMinimized(false);

    if (closeStreamRef.current) closeStreamRef.current();

    closeStreamRef.current = createProgressStream((event) => {
      const entry: LogEntry = { ...event, timestamp: new Date() };
      setLogs((prev) => [...prev, entry]);

      if (event.type === 'start' && event.step) {
        if (!stepsRef.current.includes(event.step)) {
          stepsRef.current.push(event.step);
        }
        currentStepIdxRef.current = stepsRef.current.indexOf(event.step);
      }

      if (event.progress !== undefined) {
        const totalSteps = Math.max(stepsRef.current.length, 1);
        const stepIdx = currentStepIdxRef.current;
        const globalProgress = Math.round(((stepIdx + event.progress / 100) / totalSteps) * 100);
        setProgress(Math.min(globalProgress, 100));
      }

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
    try {
      await clientApi.create(data);
      setMessage({ type: 'success', text: 'Cliente cadastrado com sucesso!' });
      setShowForm(false);
      fetchClients();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao cadastrar cliente.';
      setMessage({ type: 'error', text: msg });
    }
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

  const handleDownloadPdf = (actId: string) => {
    downloadPdf(actId, (msg) => setMessage({ type: 'error', text: msg }));
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
    <div className="max-w-[1400px] mx-auto px-2 sm:px-0 pb-20">
      <ClientHeader 
        onSearch={setSearchTerm}
        onFilterChange={setFilterStatus}
        onViewToggle={setViewMode}
        currentView={viewMode}
        onNewClient={() => setShowForm(true)}
        totalClients={clients.length}
      />

      {message && <Message type={message.type}>{message.text}</Message>}

      <div className="mb-4 flex gap-3">
        <button
          onClick={handleMetaConnect}
          disabled={metaConnecting}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          {metaConnecting ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
          Importar do Meta
        </button>
      </div>

      <div className={`transition-all duration-300 ${showForm ? 'mb-8 opacity-100' : 'h-0 overflow-hidden opacity-0'}`}>
        {form.form(showForm)}
      </div>

      <div className="mb-12">
        <SyncForm clients={clients} syncing={syncing} onSubmit={handleSync} />
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Resultados
            <span className="text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full">
              {filteredClients.length}
            </span>
          </h3>
        </div>

        {loading ? (
          <SkeletonClientList />
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500">
               <Search size={32} />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Nenhum cliente encontrado</h4>
            <p className="text-sm text-gray-500 max-w-xs mt-1 dark:text-gray-400">
              Tente ajustar seus filtros ou busque por um termo diferente.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <ClientCard
                key={client.actId}
                client={client}
                downloading={downloading}
                onDownload={handleDownload}
                onDownloadPdf={handleDownloadPdf}
                onTokenUpdated={fetchClients}
                onDelete={handleDelete}
                onError={(msg) => setMessage({ type: 'error', text: msg })}
                onSuccess={(msg) => setMessage({ type: 'success', text: msg })}
              />
            ))}
          </div>
        ) : (
          <ClientTable 
            clients={filteredClients}
            downloading={downloading}
            onDownload={handleDownload}
            onDownloadPdf={handleDownloadPdf}
            onDelete={handleDelete}
            onSync={(actId) => syncAccount(actId, new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0])}
            onEdit={(client) => {
              // Aqui poderíamos abrir o formulário de edição pré-preenchido
              setMessage({ type: 'success', text: `Editando ${client.clientName}` });
            }}
          />
        )}
      </div>

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

      {metaImportModal && (
        <MetaImportModal
          setupId={metaImportModal.setupId}
          accounts={metaImportModal.accounts}
          limit={metaImportModal.limit}
          onClose={() => setMetaImportModal(null)}
          onImported={fetchClients}
        />
      )}
    </div>
  );
}
