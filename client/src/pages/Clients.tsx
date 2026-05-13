import { useState } from 'react';
import { Plus } from 'lucide-react';
import { clientApi } from '../lib/api';
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

  const handleSync = async (data: { act_id: string; since: string; until: string }) => {
    await syncAccount(
      data.act_id,
      data.since,
      data.until,
      (msg) => setMessage({ type: 'success', text: msg }),
      (msg) => setMessage({ type: 'error', text: msg }),
    );
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
              onDownload={handleDownload}
              onTokenUpdated={fetchClients}
              onDelete={handleDelete}
              onError={(msg) => setMessage({ type: 'error', text: msg })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
