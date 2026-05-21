import { useEffect, useState, useCallback } from 'react';
import { Users, DollarSign, Target, TrendingUp, MousePointerClick, Eye, BarChart3, Loader2, Calendar as CalendarIcon, Filter, CheckCircle2, ExternalLink, MapPin, Monitor, UserCircle, X, Play, MessageCircle, Info, ArrowUpRight, ArrowDownRight, Heart } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { clientApi, syncApi, type DashboardMetrics, type Client } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import DatePicker from '../components/DatePicker';
import ClientSelector from '../components/ClientSelector';

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
  messaging: 'Mensagens',
  cpmsg: 'Custo por Msg',
};

const CURRENCY_METRICS = new Set(['spend', 'purchaseValue', 'totalConversionValue', 'purchase_value', 'cpl', 'avgCpl', 'avgCpmsg', 'cpmsg']);

function isCurrencyMetric(metric: string) {
  return CURRENCY_METRICS.has(metric);
}

function fmtBreakdownValue(metric: string, value: number) {
  return isCurrencyMetric(metric) ? fmtCurrency(value) : fmtNumber(value);
}

export default function Dashboard() {
  const { theme } = useTheme();
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
  const [refreshedMedia, setRefreshedMedia] = useState<Record<string, string>>({});

  const handleMediaError = async (adId: string) => {
    if (refreshedMedia[adId]) return;

    try {
      const { data } = await syncApi.refreshCreative(adId);
      if (data.success && data.url) {
        setRefreshedMedia(prev => ({ ...prev, [adId]: data.url }));
      }
    } catch (err) {
      console.warn(`[CREATIVE] Falha ao atualizar mídia ${adId}`);
    }
  };

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
        <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">Erro ao carregar métricas.</p>
          <button onClick={() => fetchMetrics(true)} className="mt-4 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const cards = [
    { icon: DollarSign, label: 'Investimento', value: data.totalSpend, fmt: fmtCurrency, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-600 dark:bg-yellow-400' },
    { icon: Target, label: 'Leads', value: data.totalLeads, fmt: fmtNumber, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-600 dark:bg-green-400' },
    { icon: DollarSign, label: 'CPL Médio', value: data.avgCpl, fmt: fmtCurrency, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-600 dark:bg-orange-400' },
    { icon: TrendingUp, label: 'ROAS Médio', value: data.avgRoas, fmt: (v: number) => v.toFixed(2) + 'x', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-600 dark:bg-purple-400' },
    { icon: MessageCircle, label: 'Mensagens', value: data.totalMessaging, fmt: fmtNumber, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-600 dark:bg-blue-400' },
    { icon: DollarSign, label: 'CPMsg Médio', value: data.avgCpmsg, fmt: fmtCurrency, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-600 dark:bg-indigo-400' },
    { icon: Heart, label: 'Curtidas na Página', value: data.totalPageLikes, fmt: fmtNumber, color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-600 dark:bg-rose-400' },
    { icon: DollarSign, label: 'Valor de Conversão', value: data.totalConversionValue, fmt: fmtCurrency, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-600 dark:bg-emerald-400' },
    { icon: MousePointerClick, label: 'Cliques', value: data.totalClicks, fmt: fmtNumber, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-600 dark:bg-cyan-400' },
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
      case 'messaging': return data.totalMessaging;
      case 'cpmsg': return data.avgCpmsg;
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
    <div className="max-w-[1600px] mx-auto px-2 sm:px-0 space-y-6 sm:space-y-10 pb-20">
      {/* Header com Contexto */}
      <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between border-b border-gray-200 dark:border-gray-800 pb-6 sm:pb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Análise de Performance</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
            Monitoramento de tráfego pago em tempo real
            <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-400/20">
              v2.0.0
            </span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 px-3 py-0 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
            <Filter size={16} className="text-blue-500 shrink-0" />
            <ClientSelector
              clients={clients}
              selectedId={selectedClient}
              onChange={setSelectedClient}
              placeholder="Todos os Clientes"
              showIcon={false}
              variant="ghost"
              className="!space-y-0 min-w-0 sm:min-w-[180px]"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
            <CalendarIcon size={16} className="text-purple-500 shrink-0" />
            <div className="flex flex-wrap items-center gap-2">
              <DatePicker value={since} onChange={setSince} />
              <span className="text-gray-300 dark:text-gray-700">—</span>
              <DatePicker value={until} onChange={setUntil} />
            </div>
          </div>

          {refreshing && (
            <div className="pr-2">
              <Loader2 size={20} className="animate-spin text-blue-500" />
            </div>
          )}
        </div>
      </div>

      {/* Seção 1: KPIs Principais */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-500" />
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">Métricas de Resultado</h3>
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
          {cards.map((card) => (
            <div key={card.label} className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 sm:p-5 transition-all hover:shadow-xl hover:border-blue-500/20 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 group-hover:scale-110 transition-transform">
                  <card.icon size={16} className={`sm:!w-[20px] sm:!h-[20px] ${card.color}`} />
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  KPI <span title={`Métrica de ${card.label}`} className="cursor-help"><Info size={12} /></span>
                </div>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5 sm:mb-1">{card.label}</p>
                <h4 className={`text-lg sm:text-2xl font-black tracking-tight ${card.color}`}>
                  {card.fmt(card.value)}
                </h4>
              </div>
              <div className={`absolute bottom-0 left-0 h-1.5 w-0 transition-all group-hover:w-full ${card.bgColor}`} />
            </div>
          ))}
        </div>
      </section>

      {/* Seção 2: Objetivos e Metas */}
      {data.goals.length > 0 && selectedClient && (
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-purple-500" />
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">Objetivos da Campanha</h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.goals.map((goal) => {
              const currentVal = getGoalCurrentValue(goal.metric);
              const isInverse = goal.metric === 'cpl' || goal.metric === 'cpmsg';
              const progress = isInverse 
                ? (Number(currentVal) <= Number(goal.targetValue) ? 100 : Math.max(0, 100 - ((Number(currentVal) - Number(goal.targetValue)) / Number(goal.targetValue) * 100)))
                : (Number(currentVal) / Number(goal.targetValue)) * 100;
              
              const isAtingida = isInverse ? Number(currentVal) <= Number(goal.targetValue) : Number(currentVal) >= Number(goal.targetValue);

              return (
                <div key={goal.id} className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{METRIC_LABELS[goal.metric] || goal.metric}</span>
                      <span className="text-2xl font-black text-gray-900 dark:text-white">
                        {isCurrencyMetric(goal.metric) ? fmtCurrency(Number(currentVal)) : fmtNumber(Number(currentVal))}
                      </span>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isAtingida ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                      {isAtingida ? <CheckCircle2 size={24} /> : <TrendingUp size={24} className={isInverse ? 'rotate-180' : ''} />}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                      <span className="text-gray-500">Progresso</span>
                      <span className={isAtingida ? 'text-green-600' : 'text-amber-600'}>
                        {progress.toFixed(0)}% da Meta
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <div 
                        className={`h-full transition-all duration-1000 ease-out rounded-full ${isAtingida ? 'bg-gradient-to-r from-green-400 to-green-600 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-gradient-to-r from-amber-400 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.4)]'}`} 
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                    <p className="text-center text-[10px] font-bold text-gray-400 uppercase mt-2">
                      Meta Estabelecida: <span className="text-gray-900 dark:text-white">{isCurrencyMetric(goal.metric) ? fmtCurrency(Number(goal.targetValue)) : goal.targetValue}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Seção 3: Visualizações de Performance */}
      <section className="grid gap-6 sm:gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4 sm:mb-8">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-500" /> Tendência de Investimento
            </h3>
            <div className="flex gap-2">
               <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Gasto</span>
               <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Leads</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240} className="sm:!h-[320px]">
            <AreaChart data={data.dailyMetrics}>
              <defs>
                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke={theme === 'dark' ? '#4B5563' : '#9CA3AF'} 
                tick={{ fontSize: 10, fontWeight: 700 }} 
                tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')} 
              />
              <YAxis stroke={theme === 'dark' ? '#4B5563' : '#9CA3AF'} tick={{ fontSize: 10, fontWeight: 700 }} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#111827' : '#FFFFFF', 
                  border: 'none', 
                  borderRadius: '16px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  padding: '12px'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: 800, padding: '4px 0' }}
                formatter={(value, name) => {
                  const v = Number(value);
                  if (name === 'spend') return [fmtCurrency(v), 'Investimento'];
                  if (name === 'leads') return [fmtNumber(v), 'Leads'];
                  if (name === 'messaging') return [fmtNumber(v), 'Mensagens'];
                  return [v, name];
                }}
              />
              <Area type="monotone" dataKey="spend" stroke="#F59E0B" fillOpacity={1} fill="url(#colorSpend)" strokeWidth={3} />
              <Area type="monotone" dataKey="leads" stroke="#10B981" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4 sm:mb-8">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Users size={18} className="text-purple-500" /> {selectedClient ? 'Performance Diária' : 'Comparativo de Clientes'}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={240} className="sm:!h-[320px]">
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} vertical={false} />
              <XAxis dataKey="label" stroke={theme === 'dark' ? '#4B5563' : '#9CA3AF'} tick={{ fontSize: 10, fontWeight: 700 }} />
              <YAxis stroke={theme === 'dark' ? '#4B5563' : '#9CA3AF'} tick={{ fontSize: 10, fontWeight: 700 }} />
              <Tooltip
                cursor={{ fill: theme === 'dark' ? '#1F2937' : '#F9FAFB', radius: 8 }}
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#111827' : '#FFFFFF', 
                  border: 'none', 
                  borderRadius: '16px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  padding: '12px'
                }}
                formatter={(value) => [fmtNumber(Number(value)), '']}
              />
              <Bar dataKey="spend" name="Investimento" fill="#F59E0B" radius={[6, 6, 0, 0]} barSize={selectedClient ? 12 : 24} />
              <Bar dataKey="leads" name="Leads" fill="#10B981" radius={[6, 6, 0, 0]} barSize={selectedClient ? 12 : 24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Seção 4: Ranking e Tabelas */}
      <section className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-all hover:shadow-md">
        <div className="border-b border-gray-200 bg-gray-50/50 px-4 sm:px-8 py-4 sm:py-6 dark:border-gray-800 dark:bg-gray-900/50 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <BarChart3 size={18} className="text-emerald-500" /> Ranking de Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/30 text-gray-400 uppercase text-[10px] font-black tracking-widest dark:bg-gray-950/30">
                <th className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-800">Cliente</th>
                <th className="px-3 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-800 text-right">Investimento</th>
                <th className="px-3 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-800 text-right">Leads</th>
                <th className="hidden sm:table-cell px-3 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-800 text-right">Msgs</th>
                <th className="hidden sm:table-cell px-3 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-800 text-right">CPMsg</th>
                <th className="px-3 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-800 text-right">CPL</th>
                <th className="hidden md:table-cell px-3 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-800 text-right">Conversão</th>
                <th className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-800 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {(selectedClient ? data.clientMetrics.filter(c => c.actId === selectedClient) : data.clientMetrics)
                .sort((a, b) => b.spend - a.spend)
                .map((c) => (
                  <tr key={c.actId} className="transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/5">
                    <td className="px-4 sm:px-8 py-4 sm:py-5">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 sm:py-5 text-right font-black text-xs sm:text-sm text-gray-700 dark:text-gray-300">{fmtCurrency(c.spend)}</td>
                    <td className="px-3 sm:px-6 py-4 sm:py-5 text-right font-black text-xs sm:text-sm text-gray-700 dark:text-gray-300">{fmtNumber(c.leads)}</td>
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-4 sm:py-5 text-right font-black text-xs sm:text-sm text-gray-700 dark:text-gray-300">{fmtNumber(c.messaging)}</td>
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-4 sm:py-5 text-right font-black text-xs sm:text-sm text-indigo-600 dark:text-indigo-400">{fmtCurrency(c.cpmsg)}</td>
                    <td className="px-3 sm:px-6 py-4 sm:py-5 text-right font-black text-xs sm:text-sm text-orange-600 dark:text-orange-400">
                      {Number(c.leads) > 0 ? fmtCurrency(Number(c.spend) / Number(c.leads)) : '—'}
                    </td>
                    <td className="hidden md:table-cell px-3 sm:px-6 py-4 sm:py-5 text-right font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">{fmtCurrency(c.conversionValue)}</td>
                    <td className="px-4 sm:px-8 py-4 sm:py-5 text-right">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-black border ${Number(c.roas) >= 2 ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
                        {Number(c.roas).toFixed(2)}x
                        {Number(c.roas) >= 2 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Seção 5: Top Criativos */}
      {data.topAds.length > 0 && (
        <section className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Eye size={20} className="text-indigo-500" />
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">Top Anúncios por Performance</h3>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <span className="text-[10px] font-black text-gray-400 uppercase pl-2 pr-1">Filtrar por:</span>
              <select
                value={topAdsMetric}
                onChange={(e) => setTopAdsMetric(e.target.value)}
                className="bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-white focus:outline-none border border-gray-100 dark:border-gray-800"
              >
                <option value="roas">ROAS</option>
                <option value="leads">Leads</option>
                <option value="messaging">Mensagens</option>
                <option value="cpmsg">Custo por Msg</option>
                <option value="spend">Investimento</option>
                <option value="cpl">CPL</option>
                <option value="ctr">CTR</option>
                <option value="purchases">Vendas</option>
                <option value="totalConversionValue">Valor de Conversão</option>
              </select>
            </div>
          </div>
          
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...data.topAds]
              .sort((a, b) => {
                const metricKey = topAdsMetric as keyof typeof a;
                const aVal = (topAdsMetric === 'cpl' || topAdsMetric === 'cpmsg') ? -Number(a[metricKey]) : Number(a[metricKey]);
                const bVal = (topAdsMetric === 'cpl' || topAdsMetric === 'cpmsg') ? -Number(b[metricKey]) : Number(b[metricKey]);
                return bVal - aVal;
              })
              .slice(0, 8)
              .map((ad, idx) => {
                const displayUrl = refreshedMedia[ad.adId] || ad.creativeUrl;
                const metricVal = ad[topAdsMetric as keyof typeof ad];
                return (
                  <div key={ad.adId} className="group overflow-hidden rounded-3xl border border-gray-200 bg-white transition-all hover:shadow-2xl hover:-translate-y-1 dark:border-gray-800 dark:bg-gray-950">
                    <div className="relative">
                      {displayUrl ? (
                        <div
                          className="relative w-full aspect-square cursor-pointer bg-gray-100 dark:bg-gray-900 overflow-hidden"
                          onClick={() => setMediaViewer({ url: mediaUrl(displayUrl) || '', type: ad.creativeType || 'image', name: ad.adName })}
                        >
                          {ad.creativeType === 'video' ? (
                            <>
                              <video src={mediaUrl(displayUrl)} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" muted preload="metadata" onError={() => handleMediaError(ad.adId)} />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/30 backdrop-blur-md shadow-xl border border-white/20">
                                  <Play size={20} className="text-white ml-1" fill="white" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <img src={mediaUrl(displayUrl)} alt={ad.adName} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" onError={() => handleMediaError(ad.adId)} />
                          )}
                          <div className="absolute top-4 left-4 h-7 w-7 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-md text-[10px] font-black text-white border border-white/20">
                            #{idx + 1}
                          </div>
                        </div>
                      ) : (
                        <div className="flex aspect-square items-center justify-center bg-gray-100 dark:bg-gray-900">
                          <Eye size={32} className="text-gray-300 dark:text-gray-700" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h4 className="truncate text-sm font-black text-gray-900 dark:text-white mb-1">{ad.adName}</h4>
                      <p className="mb-4 truncate text-[10px] font-bold text-gray-400 uppercase tracking-widest">{ad.campaignName}</p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-[11px] font-black uppercase border ${
                          topAdsMetric === 'roas' ? (Number(metricVal) >= 2 ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' : 'bg-gray-50 text-gray-500 border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700') :
                          'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                        }`}>
                          {topAdsMetric === 'roas' ? `${Number(metricVal).toFixed(2)}x` :
                           topAdsMetric === 'ctr' ? `${Number(metricVal).toFixed(2)}%` :
                           isCurrencyMetric(topAdsMetric) ? fmtCurrency(Number(metricVal)) :
                           fmtNumber(Number(metricVal))}
                          {' '}{METRIC_LABELS[topAdsMetric] || topAdsMetric}
                        </span>
                        <div className="flex gap-2">
                          {ad.previewLink && (
                            <a href={ad.previewLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-500 dark:bg-gray-900 dark:hover:bg-blue-900/20 transition-all">
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* Seção 6: Breakdowns (Segmentação) */}
      {(data.audienceData.length > 0 || data.placementData.length > 0 || data.regionData.length > 0) && (
        <section className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-4">
            <div className="flex items-center gap-2">
              <MapPin size={20} className="text-orange-500" />
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">Análise de Segmentação</h3>
            </div>
            <select
              value={breakdownMetric}
              onChange={(e) => setBreakdownMetric(e.target.value)}
              className="w-full sm:w-auto bg-white dark:bg-gray-900 rounded-xl px-4 py-2 text-xs font-black text-gray-900 dark:text-white focus:outline-none border border-gray-200 dark:border-gray-800 shadow-sm"
            >
              <option value="spend">Investimento</option>
              <option value="leads">Leads</option>
              <option value="messaging">Mensagens</option>
              <option value="purchases">Vendas</option>
              <option value="purchaseValue">Valor de Venda</option>
              <option value="totalConversionValue">Valor de Conversão</option>
              <option value="linkClicks">Cliques no Link</option>
              <option value="impressions">Impressões</option>
            </select>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Plataformas */}
            {data.placementData.length > 0 && (
              <div className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h4 className="mb-4 sm:mb-8 text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Monitor size={16} /> Distribuição por Canal
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.placementData.map(p => ({ name: p.platform, value: Number(p[breakdownMetric as keyof typeof p] || 0) }))}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value"
                    >
                      {data.placementData.map((_, i) => (
                        <Cell key={i} fill={['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B'][i % 4]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: theme === 'dark' ? '#111827' : '#FFFFFF', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(value) => [fmtBreakdownValue(breakdownMetric, Number(value)), METRIC_LABELS[breakdownMetric]]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-6 space-y-3">
                  {data.placementData.map((p, i) => (
                    <div key={p.platform} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'][i % 4]}`} />
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 capitalize">{p.platform}</span>
                      </div>
                      <span className="text-[11px] font-black text-gray-900 dark:text-white">
                        {fmtBreakdownValue(breakdownMetric, Number(p[breakdownMetric as keyof typeof p] || 0))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Público */}
            {data.audienceData.length > 0 && (
              <div className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h4 className="mb-4 sm:mb-8 text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <UserCircle size={16} /> Perfil Demográfico
                </h4>
                {(() => {
                  const ageRanges = [...new Set(data.audienceData.map(a => a.ageRange))];
                  const maleMap = new Map(data.audienceData.filter(a => a.gender === 'male').map(a => [a.ageRange, Number(a[breakdownMetric as keyof typeof a] || 0)]));
                  const femaleMap = new Map(data.audienceData.filter(a => a.gender === 'female').map(a => [a.ageRange, Number(a[breakdownMetric as keyof typeof a] || 0)]));
                  const chartData = ageRanges.map(age => ({ age, Masculino: maleMap.get(age) || 0, Feminino: femaleMap.get(age) || 0 }));
                  return (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} vertical={false} />
                        <XAxis dataKey="age" stroke={theme === 'dark' ? '#4B5563' : '#9CA3AF'} tick={{ fontSize: 9, fontWeight: 700 }} />
                        <YAxis hide />
                        <Tooltip
                          contentStyle={{ backgroundColor: theme === 'dark' ? '#111827' : '#FFFFFF', border: 'none', borderRadius: '12px' }}
                          formatter={(value) => [fmtBreakdownValue(breakdownMetric, Number(value)), '']}
                        />
                        <Bar dataKey="Masculino" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={10} />
                        <Bar dataKey="Feminino" fill="#EC4899" radius={[4, 4, 0, 0]} barSize={10} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
                <div className="mt-6 flex justify-center gap-6">
                  <span className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase"><span className="w-2 h-2 rounded-full bg-blue-500" /> Masc</span>
                  <span className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase"><span className="w-2 h-2 rounded-full bg-pink-500" /> Fem</span>
                </div>
              </div>
            )}

            {/* Regiões */}
            {data.regionData.length > 0 && (
              <div className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h4 className="mb-4 sm:mb-8 text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={16} /> Top Localizações
                </h4>
                <div className="space-y-4">
                  {data.regionData.slice(0, 5).map((r, i) => {
                    const maxVal = Math.max(...data.regionData.map(reg => Number(reg[breakdownMetric as keyof typeof reg] || 0)));
                    const val = Number(r[breakdownMetric as keyof typeof r] || 0);
                    const width = (val / maxVal) * 100;
                    return (
                      <div key={r.region} className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-gray-700 dark:text-gray-300">{r.region}</span>
                          <span className="text-gray-900 dark:text-white">{fmtBreakdownValue(breakdownMetric, val)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full bg-orange-500 transition-all duration-1000 delay-${i*100}`} style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {mediaViewer && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-xl p-2 sm:p-4 animate-in fade-in duration-300"
          onClick={() => setMediaViewer(null)}
        >
          <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setMediaViewer(null)}
              className="absolute -top-10 sm:-top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
            >
              <X size={32} />
            </button>
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              {mediaViewer.type === 'video' ? (
                <video src={mediaViewer.url} className="w-full max-h-[80vh]" controls autoPlay />
              ) : (
                <img src={mediaViewer.url} alt={mediaViewer.name} className="w-full max-h-[80vh] object-contain" />
              )}
            </div>
            <div className="mt-4 text-center">
              <h5 className="text-white font-black text-lg">{mediaViewer.name}</h5>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
