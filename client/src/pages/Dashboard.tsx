import { useEffect, useState, useCallback } from 'react';
import { Users, DollarSign, Target, TrendingUp, MousePointerClick, Eye, BarChart3, Loader2, Calendar as CalendarIcon, Filter, CheckCircle2, AlertCircle, ExternalLink, MapPin, Monitor, UserCircle, X, Play } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';
import { clientApi, type DashboardMetrics, type Client } from '../lib/api';
import DatePicker from '../components/DatePicker';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '');

function mediaUrl(url?: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

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
  purchaseValue: 'Valor de Venda',
  purchase_value: 'Valor de Venda',
  spend: 'Investimento',
  totalConversionValue: 'Valor de Conversão',
  linkClicks: 'Cliques no Link',
};

const CURRENCY_METRICS = new Set(['spend', 'purchaseValue', 'totalConversionValue', 'purchase_value']);

function isCurrencyMetric(metric: string) {
  return CURRENCY_METRICS.has(metric);
}

function fmtBreakdownValue(metric: string, value: number) {
  return isCurrencyMetric(metric) ? fmtCurrency(value) : fmtNumber(value);
}

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
  const [topAdsMetric, setTopAdsMetric] = useState<string>('roas');
  const [breakdownMetric, setBreakdownMetric] = useState<string>('spend');
  const [mediaViewer, setMediaViewer] = useState<{ url: string; type: string; name: string } | null>(null);

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
          <p className="text-xs text-gray-500">Análise de performance em tempo real (v1.0.1)</p>
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

          <div className="h-6 w-px bg-gray-800 hidden sm:block" />

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

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900 p-3 sm:p-4 transition-all hover:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500">
              <card.icon size={14} />
              <span className="text-[10px] font-medium uppercase tracking-wider">{card.label}</span>
            </div>
            <p className={`mt-2 text-lg font-bold sm:text-xl ${card.color}`}>
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
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
          <h3 className="mb-4 sm:mb-6 text-sm font-semibold text-gray-400 flex items-center gap-2">
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

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
          <h3 className="mb-4 sm:mb-6 text-sm font-semibold text-gray-400 flex items-center gap-2">
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
        <div className="border-b border-gray-800 bg-gray-900/50 px-4 sm:px-6 py-4">
          <h3 className="text-sm font-semibold text-white">Ranking de Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[600px]">
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

      {data.topAds.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="border-b border-gray-800 bg-gray-900/50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp size={16} /> Top Anúncios
            </h3>
            <select
              value={topAdsMetric}
              onChange={(e) => setTopAdsMetric(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="roas">ROAS</option>
              <option value="leads">Leads</option>
              <option value="spend">Investimento</option>
              <option value="cpl">CPL</option>
              <option value="ctr">CTR</option>
              <option value="purchases">Vendas</option>
              <option value="totalConversionValue">Valor de Conversão</option>
            </select>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...data.topAds]
              .sort((a, b) => {
                const aVal = topAdsMetric === 'cpl' ? -a[topAdsMetric as keyof typeof a] : a[topAdsMetric as keyof typeof a];
                const bVal = topAdsMetric === 'cpl' ? -b[topAdsMetric as keyof typeof b] : b[topAdsMetric as keyof typeof b];
                return Number(bVal) - Number(aVal);
              })
              .slice(0, 8)
              .map((ad, idx) => {
                const metricVal = ad[topAdsMetric as keyof typeof ad];
                return (
                  <div key={ad.adId} className="rounded-lg border border-gray-800 bg-gray-950 overflow-hidden">
                    {ad.creativeUrl ? (
                      <div
                        className="relative w-full cursor-pointer bg-gray-800 group"
                        onClick={() => setMediaViewer({ url: mediaUrl(ad.creativeUrl) || '', type: ad.creativeType || 'image', name: ad.adName })}
                      >
                        {ad.creativeType === 'video' ? (
                          <>
                            <video
                              src={mediaUrl(ad.creativeUrl)}
                              className="h-48 w-full object-cover"
                              muted
                              preload="metadata"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Play size={18} className="text-white ml-0.5" fill="white" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <img
                            src={mediaUrl(ad.creativeUrl)}
                            alt={ad.adName}
                            className="h-48 w-full object-cover transition-opacity group-hover:opacity-80"
                            loading="lazy"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="flex h-48 items-center justify-center bg-gray-800">
                        <Eye size={24} className="text-gray-600" />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                          {idx + 1}
                        </span>
                        <p className="truncate text-xs font-semibold text-white">{ad.adName}</p>
                      </div>
                      <p className="mb-2 truncate text-[10px] text-gray-500">{ad.campaignName}</p>
                      <div className="flex items-center justify-between">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          topAdsMetric === 'roas' ? (Number(metricVal) >= 2 ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-800 text-gray-400') :
                          topAdsMetric === 'ctr' ? 'bg-teal-500/10 text-teal-400' :
                          topAdsMetric === 'cpl' ? 'bg-orange-500/10 text-orange-400' :
                          'bg-green-500/10 text-green-400'
                        }`}>
                          {topAdsMetric === 'roas' ? `${Number(metricVal).toFixed(2)}x` :
                           topAdsMetric === 'ctr' ? `${Number(metricVal).toFixed(2)}%` :
                           isCurrencyMetric(topAdsMetric) ? fmtCurrency(Number(metricVal)) :
                           fmtNumber(Number(metricVal))}
                          {' '}{METRIC_LABELS[topAdsMetric] || topAdsMetric}
                        </span>
                        {ad.previewLink && (
                          <a href={ad.previewLink} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-400">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {(data.audienceData.length > 0 || data.placementData.length > 0 || data.regionData.length > 0) && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Segmentação</h3>
            <select
              value={breakdownMetric}
              onChange={(e) => setBreakdownMetric(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="spend">Investimento</option>
              <option value="leads">Leads</option>
              <option value="purchases">Vendas</option>
              <option value="purchaseValue">Valor de Venda</option>
              <option value="totalConversionValue">Valor de Conversão</option>
              <option value="linkClicks">Cliques no Link</option>
              <option value="impressions">Impressões</option>
            </select>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {data.placementData.length > 0 && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
                <h3 className="mb-4 text-sm font-semibold text-gray-400 flex items-center gap-2">
                  <Monitor size={16} /> Plataformas
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.placementData.map(p => ({ name: p.platform, value: Number(p[breakdownMetric as keyof typeof p] || 0) }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {data.placementData.map((_, i) => (
                        <Cell key={i} fill={['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B'][i % 4]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
                      formatter={(value) => [fmtBreakdownValue(breakdownMetric, Number(value)), METRIC_LABELS[breakdownMetric] || breakdownMetric]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(val) => <span className="text-xs text-gray-400">{val}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {data.placementData.map(p => (
                    <div key={p.platform} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{p.platform}</span>
                      <span className="text-gray-300">
                        {fmtBreakdownValue(breakdownMetric, Number(p[breakdownMetric as keyof typeof p] || 0))} · {fmtNumber(p.leads)} leads
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.audienceData.length > 0 && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
                <h3 className="mb-4 text-sm font-semibold text-gray-400 flex items-center gap-2">
                  <UserCircle size={16} /> Público (Sexo × Idade)
                </h3>
                {(() => {
                  const ageRanges = [...new Set(data.audienceData.map(a => a.ageRange))];
                  const maleMap = new Map(data.audienceData.filter(a => a.gender === 'male').map(a => [a.ageRange, Number(a[breakdownMetric as keyof typeof a] || 0)]));
                  const femaleMap = new Map(data.audienceData.filter(a => a.gender === 'female').map(a => [a.ageRange, Number(a[breakdownMetric as keyof typeof a] || 0)]));
                  const chartData = ageRanges.map(age => ({
                    age,
                    Masculino: maleMap.get(age) || 0,
                    Feminino: femaleMap.get(age) || 0,
                  }));
                  return (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="age" stroke="#4B5563" tick={{ fontSize: 9 }} />
                        <YAxis stroke="#4B5563" tick={{ fontSize: 9 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
                          formatter={(value) => [fmtBreakdownValue(breakdownMetric, Number(value)), '']}
                        />
                        <Bar dataKey="Masculino" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={16} />
                        <Bar dataKey="Feminino" fill="#EC4899" radius={[4, 4, 0, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> Masculino</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-pink-500" /> Feminino</span>
                </div>
                <div className="mt-2 space-y-1">
                  {[...data.audienceData]
                    .sort((a, b) => Number(b[breakdownMetric as keyof typeof b] || 0) - Number(a[breakdownMetric as keyof typeof a] || 0))
                    .slice(0, 6)
                    .map((a, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{a.gender === 'male' ? '♂' : '♀'} {a.ageRange}</span>
                        <span className="text-gray-300">
                          {fmtBreakdownValue(breakdownMetric, Number(a[breakdownMetric as keyof typeof a] || 0))} · {fmtNumber(a.leads)} leads
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {data.regionData.length > 0 && (() => {
              const sortedRegions = [...data.regionData].sort((a, b) =>
                Number(b[breakdownMetric as keyof typeof b] || 0) - Number(a[breakdownMetric as keyof typeof a] || 0)
              );
              return (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
                <h3 className="mb-4 text-sm font-semibold text-gray-400 flex items-center gap-2">
                  <MapPin size={16} /> Top Regiões
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sortedRegions} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                    <XAxis type="number" stroke="#4B5563" tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="region" stroke="#4B5563" tick={{ fontSize: 9 }} width={100} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
                      formatter={(value) => [fmtBreakdownValue(breakdownMetric, Number(value)), METRIC_LABELS[breakdownMetric] || breakdownMetric]}
                    />
                    <Bar dataKey={breakdownMetric} fill="#F59E0B" name={METRIC_LABELS[breakdownMetric] || breakdownMetric} radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {sortedRegions.slice(0, 6).map((r) => (
                    <div key={r.region} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{r.region}</span>
                      <span className="text-gray-300">
                        {fmtBreakdownValue(breakdownMetric, Number(r[breakdownMetric as keyof typeof r] || 0))} · {fmtNumber(r.leads)} leads
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              );
            })()}
          </div>
        </div>
      )}

      {mediaViewer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setMediaViewer(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl w-full rounded-2xl bg-gray-900 border border-gray-700 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <p className="truncate text-sm font-medium text-white pr-4">{mediaViewer.name}</p>
              <button
                onClick={() => setMediaViewer(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center justify-center bg-black p-2" style={{ maxHeight: 'calc(90vh - 56px)' }}>
              {mediaViewer.type === 'video' ? (
                <video
                  src={mediaViewer.url}
                  controls
                  autoPlay
                  className="max-h-[calc(90vh-72px)] w-auto rounded-lg"
                  style={{ maxWidth: '100%' }}
                />
              ) : (
                <img
                  src={mediaViewer.url}
                  alt={mediaViewer.name}
                  className="max-h-[calc(90vh-72px)] w-auto rounded-lg object-contain"
                  style={{ maxWidth: '100%' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
