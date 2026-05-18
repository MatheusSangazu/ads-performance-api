import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import HelpTooltip from './HelpTooltip';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  act_id: z.string().min(1, 'Act ID é obrigatório'),
  access_token: z.string().min(1, 'Access Token é obrigatório'),
  custom_event_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ClientFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

export default function ClientForm({ onSubmit, onCancel }: ClientFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', act_id: '', access_token: '', custom_event_id: '' },
  });

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(data);
    reset();
  };

  return {
    trigger: (showForm: boolean, setShowForm: (v: boolean) => void) => (
      <button
        onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        <Plus size={18} />
        Novo Cliente
      </button>
    ),
    form: (visible: boolean) =>
      visible ? (
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="mb-12 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 backdrop-blur-sm shadow-xl shadow-blue-900/5 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
              <Plus size={20} />
            </div>
            <h3 className="text-xl font-bold text-white">Cadastrar Novo Cliente</h3>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Nome Comercial</label>
              <input
                {...register('name')}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500/50 outline-none transition-all focus:ring-4 focus:ring-blue-500/10"
                placeholder="Ex: Minha Loja Virtual"
              />
              {errors.name && <p className="mt-1 ml-1 text-[10px] font-bold text-red-400 uppercase">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">ID da Conta de Anúncios</label>
              <input
                {...register('act_id')}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500/50 outline-none transition-all focus:ring-4 focus:ring-blue-500/10"
                placeholder="act_123456789"
              />
              {errors.act_id && <p className="mt-1 ml-1 text-[10px] font-bold text-red-400 uppercase">{errors.act_id.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Access Token do Meta</label>
                <HelpTooltip title="Como obter o Token">
                  <p>Acesse o Graph API Explorer, selecione o app e adicione ads_read.</p>
                </HelpTooltip>
              </div>
              <input
                {...register('access_token')}
                type="password"
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500/50 outline-none transition-all focus:ring-4 focus:ring-blue-500/10"
                placeholder="••••••••••••••••"
              />
              {errors.access_token && (
                <p className="mt-1 ml-1 text-[10px] font-bold text-red-400 uppercase">{errors.access_token.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Custom Event ID (Opcional)</label>
              <input
                {...register('custom_event_id')}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500/50 outline-none transition-all focus:ring-4 focus:ring-blue-500/10"
                placeholder="Ex: purchase_pixel_123"
              />
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="submit"
              className="flex-1 sm:flex-none rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98]"
            >
              Confirmar Cadastro
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none rounded-xl bg-gray-800 px-8 py-3 text-sm font-bold text-gray-300 transition-all hover:bg-gray-700 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null,
  };
}
