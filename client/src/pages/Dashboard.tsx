import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, DollarSign, Target, TrendingUp, MousePointerClick, Eye, BarChart3, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { clientApi, type DashboardMetrics } from '../lib/api';

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtNumber(v: number) {
  return v.toLocaleString('pt-BR');
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientApi.metrics()
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h2 className="mb-6 text-2xl font-bold">Dashboard</h2>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-gray-400">Erro ao carregar métricas.</p>
          <Link to="/clients" className="mt-4 inline-block text-sm text-blue-400 hover:underline">
            Ir para clientes →
          </Link>
        </div>
      </div>
    );
  }

  const cards = [
    { icon: Users, label: 'Clientes', value: data.totalClients, fmt: fmtNumber, color: 'text-blue-400' },
    { icon: DollarSign, label: 'Investimento Total', value: data.totalSpend, fmt: fmtCurrency, color: 'text-yellow-400' },
    { icon: Target, label: 'Leads', value: data.totalLeads, fmt: fmtNumber, color: 'text-green-400' },
    { icon: TrendingUp, label: 'ROAS Médio', value: data.avgRoas, fmt: (v: number) => v.toFixed(2) + 'x', color: 'text-purple-400' },
    { icon: DollarSign, label: 'CPL Médio', value: data.avgCpl, fmt: fmtCurrency, color: 'text-orange-400' },
    { icon: MousePointerClick, label: 'Cliques', value: data.totalClicks, fmt: fmtNumber, color: 'text-cyan-400' },
    { icon: Eye, label: 'Impressões', value: data.totalImpressions, fmt: fmtNumber, color: 'text-pink-400' },
    { icon: BarChart3, label: 'CTR Médio', value: data.avgCtr, fmt: (v: number) => v.toFixed(2) + '%', color: 'text-teal-400' },
  ];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <span className="text-xs text-gray-500">
          Período: {data.period.since} → {data.period.until}
        </span>
      </div>
      <p className="mb-6 text-xs text-gray-600">Últimos 30 dias</p>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center gap-2 text-gray-500">
              <card.icon size={16} />
              <span className="text-xs">{card.label}</span>
            </div>
            <p className={`mt-2 text-xl font-bold ${card.color}`}>
              {card.fmt(card.value)}
            </p>
          </div>
        ))}
      </div>

      {data.dailyMetrics.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 text-lg font-semibold">Investimento e Leads por Dia</h3>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.dailyMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#9CA3AF' }}
                  formatter={(value, name) => {
                    const v = Number(value);
                    if (name === 'spend') return [fmtCurrency(v), 'Investimento'];
                    return [fmtNumber(v), name === 'leads' ? 'Leads' : name];
                  }}
                />
                <Area type="monotone" dataKey="spend" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="leads" stroke="#10B981" fill="#10B981" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.clientMetrics.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 text-lg font-semibold">Performance por Cliente</h3>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.clientMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#9CA3AF' }}
                  formatter={(value, name) => {
                    const v = Number(value);
                    if (name === 'spend') return [fmtCurrency(v), 'Investimento'];
                    if (name === 'roas') return [v.toFixed(2) + 'x', 'ROAS'];
                    return [fmtNumber(v), 'Leads'];
                  }}
                />
                <Bar dataKey="spend" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="leads" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.clientMetrics.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 text-lg font-semibold">Clientes — Ranking</h3>
          <div className="overflow-hidden rounded-xl border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 text-right">Investimento</th>
                  <th className="px-4 py-3 text-right">Leads</th>
                  <th className="px-4 py-3 text-right">CPL</th>
                  <th className="px-4 py-3 text-right">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.clientMetrics
                  .sort((a, b) => b.spend - a.spend)
                  .map((c) => (
                    <tr key={c.actId} className="bg-gray-950 hover:bg-gray-900">
                      <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                      <td className="px-4 py-3 text-right text-yellow-400">{fmtCurrency(c.spend)}</td>
                      <td className="px-4 py-3 text-right text-green-400">{fmtNumber(c.leads)}</td>
                      <td className="px-4 py-3 text-right text-orange-400">
                        {c.leads > 0 ? fmtCurrency(c.spend / c.leads) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-purple-400">{c.roas.toFixed(2)}x</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
