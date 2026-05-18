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
      <h3 className="mb-4 text-lg font-semibold">Sincronizar Dados</h3>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6"
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => handlePreset(p.key)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-blue-500 hover:bg-gray-700 hover:text-white"
            >
              <p.icon size={14} />
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Cliente *</label>
            <select
              {...register('act_id')}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecione...</option>
              {clients.map((c) => (
                <option key={c.actId} value={c.actId}>
                  {c.clientName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Desde *</label>
            <input
              type="date"
              {...register('since')}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Até *</label>
            <input
              type="date"
              {...register('until')}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!!syncing}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {syncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>

      </form>
    </div>
  );
}
