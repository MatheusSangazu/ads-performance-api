import { useState } from 'react';
import { Plus } from 'lucide-react';
import { clientApi, syncApi } from '../lib/api';
import type { SyncFormBreakdowns } from '../components/SyncForm';
import { useClients, useSync, useDownload } from '../hooks/useClients';
import Message from '../components/ui/Message';
import ClientForm from '../components/ClientForm';
import SyncForm from '../components/SyncForm';
import ClientCard from '../components/ClientCard';

export default function Clients() {
  const { clients, loading, message, setMessage, fetchClients } = useClients();
  const { syncing, syncAccount } = useSync();
  const { downloading, downloadReport } = useDownload();
  const [showForm, setShowForm] = useState(false);

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
    await syncAccount(
      data.act_id,
      data.since,
      data.until,
      (msg) => setMessage({ type: 'success', text: msg }),
      (msg) => setMessage({ type: 'error', text: msg }),
    );

    const hasBreakdown = breakdowns.audience || breakdowns.placement || breakdowns.region;
    if (!hasBreakdown) return;

    const activeBreakdowns = (
      ['audience', 'placement', 'region'] as const
    ).filter((t) => breakdowns[t]);

    if (activeBreakdowns.length === 3) {
      try {
        const res = await syncApi.breakdownAll({
          act_id: data.act_id,
          since: data.since,
          until: data.until,
        });
        const results = res.data as Record<string, { records: number; errors: number }>;
        const total = Object.values(results).reduce((s, r) => s + r.records, 0);
        setMessage({ type: 'success', text: `Segmentações: ${total} registros sincronizados.` });
      } catch {
        setMessage({ type: 'error', text: 'Erro ao sincronizar segmentações.' });
      }
    } else {
      for (const type of activeBreakdowns) {
        try {
          const res = await syncApi.breakdown({
            act_id: data.act_id,
            since: data.since,
            until: data.until,
            type,
          });
          setMessage({
            type: 'success',
            text: `Segmentação ${type}: ${res.data.records} registros sincronizados.`,
          });
        } catch {
          setMessage({ type: 'error', text: `Erro ao sincronizar segmentação ${type}.` });
        }
      }
    }
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

      {message && (
        <Message type={message.type}>
          {message.text}
        </Message>
      )}

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
              syncing={syncing}
              onDownload={handleDownload}
              onTokenUpdated={fetchClients}
              onDelete={handleDelete}
              onSync={async () => {}}
              onError={(msg) => setMessage({ type: 'error', text: msg })}
              onSuccess={(msg) => setMessage({ type: 'success', text: msg })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
