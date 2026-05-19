import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Users, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { agencyApi, type AgencyMember, type AgencyConsolidated } from '../lib/api';

export default function Agency() {
  const [members, setMembers] = useState<AgencyMember[]>([]);
  const [consolidated, setConsolidated] = useState<AgencyConsolidated[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [m, c] = await Promise.all([agencyApi.members(), agencyApi.consolidated()]);
      setMembers(m.data);
      setConsolidated(c.data);
    } catch {} finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    try {
      await agencyApi.invite(form);
      setForm({ name: '', email: '', password: '' });
      setShowInvite(false);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao convidar gestor.');
    }
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Remover ${name} da equipe?`)) return;
    try {
      await agencyApi.remove(id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao remover.');
    }
  }

  if (loading && members.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Equipe</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {members.length} gestor{members.length !== 1 ? 'es' : ''} na equipe
          </p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
        >
          <UserPlus size={18} />
          Convidar Gestor
        </button>
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Novo Gestor</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Senha temporária</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Criar e Convidar
            </button>
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {members.map(m => (
          <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600/10 text-amber-600 dark:bg-amber-600/20 dark:text-amber-400">
                  <Users size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{m.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{m.email} · {m.managerClients.length} clientes</p>
                </div>
              </div>
              <button
                onClick={() => handleRemove(m.id, m.name)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 size={14} />
                Remover
              </button>
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <Users size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum gestor na equipe ainda.</p>
            <p className="text-sm text-gray-400 dark:text-gray-600">Clique em "Convidar Gestor" para adicionar.</p>
          </div>
        )}
      </div>

      {consolidated.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <BarChart3 size={20} />
            Visão Consolidada
          </h3>
          {consolidated.map(c => (
            <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <button
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="flex w-full items-center justify-between group"
              >
                <div className="text-left">
                  <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors dark:text-white dark:group-hover:text-blue-400">{c.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{c.clientCount} clientes</p>
                </div>
                {expanded === c.id ? (
                  <ChevronUp size={18} className="text-gray-400" />
                ) : (
                  <ChevronDown size={18} className="text-gray-400" />
                )}
              </button>
              {expanded === c.id && c.clients.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 dark:text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                        <th className="pb-2">Cliente</th>
                        <th className="pb-2">Act ID</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {c.clients.map(cl => (
                        <tr key={cl.actId}>
                          <td className="py-2 text-gray-700 dark:text-gray-300 font-medium">{cl.clientName}</td>
                          <td className="py-2 font-mono text-[10px] text-gray-400 dark:text-gray-500">{cl.actId}</td>
                          <td className="py-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              cl.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-600/20 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {cl.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
