import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, CalendarDays, CalendarRange, Loader2, RefreshCw } from 'lucide-react';
import type { Client } from '../lib/api';

const schema = z.object({
  act_id: z.string().min(1, 'Selecione um cliente'),
  since: z.string().min(1, 'Data início é obrigatória'),
  until: z.string().min(1, 'Data fim é obrigatória'),
});

type FormData = z.infer<typeof schema>;

export interface SyncFormBreakdowns {
  audience: boolean;
  placement: boolean;
  region: boolean;
}

interface SyncFormProps {
  clients: Client[];
  syncing: string | null;
  onSubmit: (data: FormData, breakdowns: SyncFormBreakdowns) => Promise<void>;
}

function getDateRange(preset: string): { since: string; until: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const until = fmt(today);

  const since = (() => {
    switch (preset) {
      case 'today': {
        return fmt(today);
      }
      case '7d': {
        const d = new Date(today);
        d.setDate(d.getDate() - 6);
        return fmt(d);
      }
      case '30d': {
        const d = new Date(today);
        d.setDate(d.getDate() - 29);
        return fmt(d);
      }
      case '90d': {
        const d = new Date(today);
        d.setDate(d.getDate() - 89);
        return fmt(d);
      }
      case '6m': {
        const d = new Date(today);
        d.setMonth(d.getMonth() - 6);
        d.setDate(d.getDate() + 1);
        return fmt(d);
      }
      case '1y': {
        const d = new Date(today);
        d.setFullYear(d.getFullYear() - 1);
        d.setDate(d.getDate() + 1);
        return fmt(d);
      }
      case '2y': {
        const d = new Date(today);
        d.setFullYear(d.getFullYear() - 2);
        d.setDate(d.getDate() + 1);
        return fmt(d);
      }
      default:
        return fmt(today);
    }
  })();

  return { since, until };
}

const presets = [
  { key: 'today', label: 'Hoje', icon: Calendar },
  { key: '7d', label: '7 dias', icon: CalendarDays },
  { key: '30d', label: '30 dias', icon: CalendarRange },
  { key: '90d', label: '90 dias', icon: CalendarRange },
  { key: '6m', label: '6 meses', icon: CalendarRange },
  { key: '1y', label: '1 ano', icon: CalendarRange },
  { key: '2y', label: '2 anos', icon: CalendarRange },
] as const;

export default function SyncForm({ clients, syncing, onSubmit }: SyncFormProps) {
  const { register, handleSubmit, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      since: getDateRange('30d').since,
      until: getDateRange('30d').until,
    },
  });

  const handlePreset = (preset: string) => {
    const { since, until } = getDateRange(preset);
    setValue('since', since);
    setValue('until', until);
  };

  const handleFormSubmit = (data: FormData) => {
    onSubmit(data, { audience: true, placement: true, region: true });
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <RefreshCw size={20} className="text-purple-600 dark:text-purple-400" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sincronização em Massa</h3>
      </div>
      
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl shadow-purple-900/5 dark:border-gray-800 dark:bg-gray-900/40 dark:backdrop-blur-sm"
      >
        <div className="mb-6 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => handlePreset(p.key)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 transition-all hover:border-purple-500/50 hover:bg-purple-50 hover:text-purple-600 dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-400 dark:hover:bg-purple-500/5 dark:hover:text-purple-400 active:scale-95"
            >
              <p.icon size={14} />
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1 dark:text-gray-500">Cliente Alvo</label>
            <div className="relative group">
               <select
                {...register('act_id')}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500/50 outline-none transition-all focus:ring-4 focus:ring-purple-500/10 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              >
                <option value="">Selecione um cliente...</option>
                {clients.map((c) => (
                  <option key={c.actId} value={c.actId}>
                    {c.clientName}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1 dark:text-gray-500">Data de Início</label>
            <input
              type="date"
              {...register('since')}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500/50 outline-none transition-all focus:ring-4 focus:ring-purple-500/10 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1 dark:text-gray-500">Data de Término</label>
            <input
              type="date"
              {...register('until')}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500/50 outline-none transition-all focus:ring-4 focus:ring-purple-500/10 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={!!syncing}
            className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-900/20 transition-all hover:bg-purple-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
          >
            {syncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {syncing ? 'Processando...' : 'Iniciar Sync'}
          </button>
        </div>
      </form>
    </div>
  );
}
