import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, DollarSign, Target, TrendingUp, MousePointerClick, Eye, BarChart3, Loader2, Calendar as CalendarIcon, Filter, CheckCircle2, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { clientApi, type DashboardMetrics, type Client } from '../lib/api';
import DatePicker from '../components/DatePicker';

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtNumber(v: number) {
  return v.toLocaleString('pt-BR');
}

const METRIC_LABELS: Record<string, string> = {
  leads: 'Leads',
  cpl: 'CPL',
  roas: 'ROAS',
  ctr: 'CTR',
  clicks: 'Cliques',
  impressions: 'Impressões',
  purchases: 'Vendas',
  purchase_value: 'Valor de Venda',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [since, setSince] = useState(thirtyDaysAgo);
  const [until, setUntil] = useState(today);
  const [selectedClient, setSelectedClient] = useState<string>('');

  const fetchMetrics = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await clientApi.metrics({
        since,
        until,
        clientId: selectedClient || undefined,
      });
      setData(res.data);
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [since, until, selectedClient]);

  useEffect(() => {
    fetchMetrics(true);
  }, [fetchMetrics]);

  useEffect(() => {
    clientApi.list().then(res => setClients(res.data)).catch(() => {});
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
          <button onClick={() => fetchMetrics(true)} className="mt-4 inline-block text-sm text-blue-400 hover:underline">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const cards = [
    { icon: DollarSign, label: 'Investimento', value: data.totalSpend, fmt: fmtCurrency, color: 'text-yellow-400' },
    { icon: Target, label: 'Leads', value: data.totalLeads, fmt: fmtNumber, color: 'text-green-400' },
    { icon: DollarSign, label: 'CPL Médio', value: data.avgCpl, fmt: fmtCurrency, color: 'text-orange-400' },
    { icon: TrendingUp, label: 'ROAS Médio', value: data.avgRoas, fmt: (v: number) => v.toFixed(2) + 'x', color: 'text-purple-400' },
    { icon: DollarSign, label: 'Valor de Conversão', value: data.totalConversionValue, fmt: fmtCurrency, color: 'text-emerald-400' },
    { icon: MousePointerClick, label: 'Cliques', value: data.totalClicks, fmt: fmtNumber, color: 'text-cyan-400' },
    { icon: BarChart3, label: 'CTR Médio', value: data.avgCtr, fmt: (v: number) => v.toFixed(2) + '%', color: 'text-teal-400' },
    { icon: Eye, label: 'Impressões', value: data.totalImpressions, fmt: fmtNumber, color: 'text-pink-400' },
  ];

  const getGoalCurrentValue = (metric: string): number => {
    switch (metric) {
      case 'leads': return data.totalLeads;
      case 'cpl': return data.avgCpl;
      case 'roas': return data.avgRoas;
      case 'ctr': return data.avgCtr;
      case 'clicks': return data.totalClicks;
      case 'impressions': return data.totalImpressions;
      case 'purchases': return data.totalPurchases;
      case 'purchase_value': return data.totalConversionValue;
      default: return 0;
    }
  };

  const barChartData = selectedClient
    ? data.dailyMetrics.map(d => ({ 
        label: d.date, 
        spend: d.spend, 
        leads: d.leads 
      }))
    : data.clientMetrics.map(c => ({ 
        label: c.name, 
        spend: c.spend, 
        leads: c.leads 
      }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-xs text-gray-500">Análise de performance em tempo real</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/50 p-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-500" />
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos os Clientes</option>
              {clients.map(c => (
                <option key={c.actId} value={c.actId}>{c.clientName}</option>
              ))}
            </select>
          </div>

          <div className="h-6 w-px bg-gray-800 hidden md:block" />

          <div className="flex items-center gap-2">
            <CalendarIcon size={14} className="text-gray-500" />
            <div className="flex items-center gap-1">
              <DatePicker value={since} onChange={setSince} />
              <span className="text-gray-600 text-xs">até</span>
              <DatePicker value={until} onChange={setUntil} />
            </div>
          </div>

          {refreshing && <Loader2 size={16} className="animate-spin text-blue-500" />}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900 p-4 transition-all hover:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500">
              <card.icon size={14} />
              <span className="text-[10px] font-medium uppercase tracking-wider">{card.label}</span>
            </div>
            <p className={`mt-2 text-xl font-bold ${card.color}`}>
              {card.fmt(card.value)}
            </p>
            <div className={`absolute bottom-0 left-0 h-1 w-0 transition-all group-hover:w-full ${card.color.replace('text-', 'bg-')}`} />
          </div>
        ))}
      </div>

      {data.goals.length > 0 && selectedClient && (
        <div className="grid gap-4 md:grid-cols-3">
          {data.goals.map((goal) => {
            const currentVal = getGoalCurrentValue(goal.metric);
            // Handle CPL separately (lower is better)
            const isInverse = goal.metric === 'cpl';
            const progress = isInverse 
              ? (Number(currentVal) <= Number(goal.targetValue) ? 100 : Math.max(0, 100 - ((Number(currentVal) - Number(goal.targetValue)) / Number(goal.targetValue) * 100)))
              : (Number(currentVal) / Number(goal.targetValue)) * 100;
            
            const isAtingida = isInverse ? Number(currentVal) <= Number(goal.targetValue) : Number(currentVal) >= Number(goal.targetValue);

            return (
              <div key={goal.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-400">{METRIC_LABELS[goal.metric] || goal.metric}</span>
                  {isAtingida ? (
                    <CheckCircle2 size={14} className="text-green-500" />
                  ) : (
                    <AlertCircle size={14} className="text-amber-500" />
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-lg font-bold text-white">
                    {goal.metric === 'spend' || goal.metric === 'cpl' || goal.metric === 'purchase_value' 
                      ? fmtCurrency(Number(currentVal)) 
                      : fmtNumber(Number(currentVal))}
                  </p>
                  <p className="text-[10px] text-gray-500">Meta: {goal.targetValue}</p>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                  <div 
                    className={`h-full transition-all duration-500 ${isAtingida ? 'bg-green-500' : 'bg-amber-500'}`} 
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h3 className="mb-6 text-sm font-semibold text-gray-400 flex items-center gap-2">
            <BarChart3 size={16} /> Tendência de Investimento e Leads
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.dailyMetrics}>
              <defs>
                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="date" stroke="#4B5563" tick={{ fontSize: 10 }} tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')} />
              <YAxis stroke="#4B5563" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
                itemStyle={{ fontSize: '12px' }}
                formatter={(value, name) => {
                  const v = Number(value);
                  if (name === 'spend') return [fmtCurrency(v), 'Investimento'];
                  return [fmtNumber(v), name === 'leads' ? 'Leads' : name];
                }}
              />
              <Area type="monotone" dataKey="spend" stroke="#F59E0B" fillOpacity={1} fill="url(#colorSpend)" strokeWidth={2} />
              <Area type="monotone" dataKey="leads" stroke="#10B981" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h3 className="mb-6 text-sm font-semibold text-gray-400 flex items-center gap-2">
            <Users size={16} /> {selectedClient ? 'Performance Diária' : 'Comparativo entre Clientes'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="label" stroke="#4B5563" tick={{ fontSize: 10 }} />
              <YAxis stroke="#4B5563" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
                itemStyle={{ fontSize: '12px' }}
                formatter={(value) => {
                  const v = Number(value);
                  return [fmtNumber(v), ''];
                }}
              />
              <Bar dataKey="spend" name="Investimento" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="leads" name="Leads" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        <div className="border-b border-gray-800 bg-gray-900/50 px-6 py-4">
          <h3 className="text-sm font-semibold text-white">Ranking de Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900/80 text-gray-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4 text-right">Investimento</th>
                <th className="px-6 py-4 text-right">Leads</th>
                <th className="px-6 py-4 text-right">CPL</th>
                <th className="px-6 py-4 text-right">Conversão (R$)</th>
                <th className="px-6 py-4 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {(selectedClient ? data.clientMetrics.filter(c => c.actId === selectedClient) : data.clientMetrics)
                .sort((a, b) => b.spend - a.spend)
                .map((c) => (
                  <tr key={c.actId} className="bg-gray-950 transition-colors hover:bg-gray-900/80">
                    <td className="px-6 py-4 font-semibold text-white">{c.name}</td>
                    <td className="px-6 py-4 text-right text-yellow-400">{fmtCurrency(c.spend)}</td>
                    <td className="px-6 py-4 text-right text-green-400">{fmtNumber(c.leads)}</td>
                    <td className="px-6 py-4 text-right text-orange-400">
                      {Number(c.leads) > 0 ? fmtCurrency(Number(c.spend) / Number(c.leads)) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-400">{fmtCurrency(c.conversionValue)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`rounded-full px-2 py-0.5 font-bold ${Number(c.roas) >= 2 ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-800 text-gray-400'}`}>
                        {Number(c.roas).toFixed(2)}x
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
