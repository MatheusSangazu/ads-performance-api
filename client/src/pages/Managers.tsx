import { useEffect, useState } from 'react';
import { Shield, Loader2, UserX, Link2 } from 'lucide-react';
import { managerApi, clientApi } from '../lib/api';
import Message from '../components/ui/Message';

interface Manager {
  id: string;
  name: string;
  email: string;
  company: string | null;
  role: 'admin' | 'manager';
  plan: string;
  maxClients: number | null;
  active: boolean;
  createdAt: string;
  _count?: { managerClients: number };
}

export default function Managers() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [clients, setClients] = useState<{ clientName: string; actId: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editMax, setEditMax] = useState('');
  const [saving, setSaving] = useState(false);
  const [linkManagerId, setLinkManagerId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState('');

  const fetchData = async () => {
    try {
      const [manRes, cliRes] = await Promise.all([managerApi.list(), clientApi.list()]);
      setManagers(manRes.data);
      setClients(cliRes.data);
    } catch {
      setMessage({ type: 'error', text: 'Erro ao carregar gestores.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (id: string) => {
    setSaving(true);
    setMessage(null);
    try {
      await managerApi.update(id, {
        plan: editPlan || undefined,
        maxClients: editMax ? parseInt(editMax) : undefined,
      });
      setMessage({ type: 'success', text: 'Gestor atualizado!' });
      setEditId(null);
      fetchData();
    } catch {
      setMessage({ type: 'error', text: 'Erro ao atualizar gestor.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Desativar este gestor?')) return;
    try {
      await managerApi.deactivate(id);
      setMessage({ type: 'success', text: 'Gestor desativado.' });
      fetchData();
    } catch {
      setMessage({ type: 'error', text: 'Erro ao desativar gestor.' });
    }
  };

  const handleLink = async () => {
    if (!linkManagerId || !selectedClient) return;
    try {
      await managerApi.linkClient(linkManagerId, selectedClient);
      setMessage({ type: 'success', text: 'Cliente vinculado!' });
      setLinkManagerId(null);
      setSelectedClient('');
      fetchData();
    } catch {
      setMessage({ type: 'error', text: 'Erro ao vincular cliente.' });
    }
  };


  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 size={18} className="animate-spin" />
        Carregando...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/10 dark:bg-purple-600/20">
          <Shield size={20} className="text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestores</h2>
      </div>

      {message && <Message type={message.type}>{message.text}</Message>}

      <div className="space-y-4">
        {managers.map((m) => (
          <div
            key={m.id}
            className={`rounded-xl border bg-white p-5 transition-all dark:bg-gray-900 ${
              m.active ? 'border-gray-200 dark:border-gray-800 shadow-sm' : 'border-red-200 opacity-60 dark:border-red-900/40'
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{m.name}</h3>
                  {m.role === 'admin' && (
                    <span className="rounded-full bg-purple-600/10 px-2 py-0.5 text-xs font-semibold text-purple-600 dark:bg-purple-600/20 dark:text-purple-400">
                      Admin
                    </span>
                  )}
                  {!m.active && (
                    <span className="rounded-full bg-red-600/10 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-600/20 dark:text-red-400">
                      Inativo
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{m.email}</p>
                <div className="mt-1 flex gap-3 text-xs text-gray-400 dark:text-gray-500">
                  <span>Plano: {m.plan}</span>
                  <span>Max clientes: {m.maxClients ?? 'Ilimitado'}</span>
                  <span>Vinculados: {m._count?.managerClients ?? 0}</span>
                  {m.company && <span>Empresa: {m.company}</span>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {m.role !== 'admin' && (
                  <>
                    <button
                      onClick={() => handleDeactivate(m.id)}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                      title="Desativar"
                    >
                      <UserX size={14} />
                      Desativar
                    </button>
                    <button
                      onClick={() => {
                        setEditId(m.id);
                        setEditPlan(m.plan);
                        setEditMax(m.maxClients?.toString() ?? '');
                      }}
                      className="rounded-lg px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setLinkManagerId(m.id);
                        setSelectedClient('');
                      }}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                    >
                      <Link2 size={14} />
                      Vincular
                    </button>
                  </>
                )}
              </div>
            </div>

            {editId === m.id && (
              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Plano</label>
                  <input
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Max Clientes</label>
                  <input
                    type="number"
                    value={editMax}
                    onChange={(e) => setEditMax(e.target.value)}
                    placeholder="Ilimitado"
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  />
                </div>
                <button
                  onClick={() => handleSave(m.id)}
                  disabled={saving}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Salvar
                </button>
                <button
                  onClick={() => setEditId(null)}
                  className="rounded-lg px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
              </div>
            )}

            {linkManagerId === m.id && (
              <div className="mt-4 flex items-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Selecionar cliente</label>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Selecione...</option>
                    {clients.map((c) => (
                      <option key={c.actId} value={c.actId}>
                        {c.clientName} ({c.actId})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleLink}
                  disabled={!selectedClient}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Link2 size={14} />
                  Vincular
                </button>
                <button
                  onClick={() => setLinkManagerId(null)}
                  className="rounded-lg px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
