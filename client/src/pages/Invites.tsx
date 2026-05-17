import { useEffect, useState } from 'react';
import { MailPlus, Loader2, Copy, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { inviteApi } from '../lib/api';
import Message from '../components/ui/Message';

interface Invite {
  id: string;
  token: string;
  email: string | null;
  plan: string;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
  usedBy: { name: string; email: string } | null;
  createdBy: { name: string } | null;
}

export default function Invites() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('pro');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchInvites = async () => {
    try {
      const { data } = await inviteApi.list();
      setInvites(data);
    } catch {
      setMessage({ type: 'error', text: 'Erro ao carregar convites.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      await inviteApi.create({ email: email || undefined, plan });
      setMessage({ type: 'success', text: 'Convite criado!' });
      setEmail('');
      fetchInvites();
    } catch {
      setMessage({ type: 'error', text: 'Erro ao criar convite.' });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revogar este convite?')) return;
    try {
      await inviteApi.revoke(id);
      setMessage({ type: 'success', text: 'Convite revogado.' });
      fetchInvites();
    } catch {
      setMessage({ type: 'error', text: 'Erro ao revogar convite.' });
    }
  };

  const copyLink = (token: string, id: string) => {
    const link = `${window.location.origin}/register/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');
  const isExpired = (d: string) => new Date(d) < new Date();

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
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600/20">
          <MailPlus size={20} className="text-green-400" />
        </div>
        <h2 className="text-2xl font-bold">Convites</h2>
      </div>

      {message && <Message type={message.type}>{message.text}</Message>}

      <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold">Novo Convite</h3>
        <form onSubmit={handleCreate} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm text-gray-400">Email (opcional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              placeholder="gestor@email.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Plano</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="pro">Pro</option>
              <option value="basic">Basic</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <MailPlus size={16} />}
            Criar Convite
          </button>
        </form>
      </div>

      <h3 className="mb-4 text-lg font-semibold">Todos os Convites</h3>

      {invites.length === 0 ? (
        <p className="text-gray-500">Nenhum convite criado ainda.</p>
      ) : (
        <div className="space-y-3">
          {invites.map((inv) => {
            const used = !!inv.usedAt;
            const expired = !used && isExpired(inv.expiresAt);
            const active = !used && !expired;

            return (
              <div
                key={inv.id}
                className={`rounded-xl border bg-gray-900 p-4 ${
                  used
                    ? 'border-green-900/30'
                    : expired
                    ? 'border-red-900/30 opacity-60'
                    : 'border-gray-800'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {used ? (
                      <CheckCircle size={18} className="text-green-400" />
                    ) : expired ? (
                      <XCircle size={18} className="text-red-400" />
                    ) : (
                      <Clock size={18} className="text-yellow-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {inv.email || 'Email nao definido'}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>Plano: {inv.plan}</span>
                        <span>Criado: {formatDate(inv.createdAt)}</span>
                        <span>Expira: {formatDate(inv.expiresAt)}</span>
                        {inv.createdBy && <span>Por: {inv.createdBy.name}</span>}
                      </div>
                      {used && inv.usedBy && (
                        <p className="mt-1 text-xs text-green-400">
                          Usado por {inv.usedBy.name} ({inv.usedBy.email})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {active && (
                      <>
                        <button
                          onClick={() => copyLink(inv.token, inv.id)}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-blue-400 transition-colors hover:bg-blue-900/30"
                          title="Copiar link"
                        >
                          {copiedId === inv.id ? (
                            <>
                              <CheckCircle size={14} />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              Copiar Link
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleRevoke(inv.id)}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-900/30"
                        >
                          <Trash2 size={14} />
                          Revogar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
