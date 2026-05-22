import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface BurndownChartProps {
  data: { date: string; actual: number; target: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-xs font-bold" style={{ color: entry.color }}>
          {entry.name === 'actual' ? 'Real' : 'Meta'}: {typeof entry.value === 'number' ? entry.value.toLocaleString('pt-BR') : '—'}
        </p>
      ))}
    </div>
  );
};

export default function BurndownChart({ data }: BurndownChartProps) {
  if (!data || data.length === 0) return null;

  const formatted = data.map((d) => ({
    ...d,
    label: d.date.split('-').slice(1).join('/'),
  }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            interval={Math.floor(formatted.length / 8)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="target"
            stroke="#94a3b8"
            fill="#94a3b8"
            fillOpacity={0.08}
            strokeDasharray="4 4"
            strokeWidth={1.5}
            name="target"
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.12}
            strokeWidth={2}
            connectNulls={false}
            name="actual"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
