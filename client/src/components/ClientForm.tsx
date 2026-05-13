import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

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
          className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-6"
        >
          <h3 className="mb-4 text-lg font-semibold">Cadastrar Cliente</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-400">Nome *</label>
              <input
                {...register('name')}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="Nome do cliente"
              />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Act ID *</label>
              <input
                {...register('act_id')}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="act_123456789"
              />
              {errors.act_id && <p className="mt-1 text-xs text-red-400">{errors.act_id.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Access Token *</label>
              <input
                {...register('access_token')}
                type="password"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="Token do Meta Ads"
              />
              {errors.access_token && (
                <p className="mt-1 text-xs text-red-400">{errors.access_token.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Custom Event ID</label>
              <input
                {...register('custom_event_id')}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Cadastrar
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-gray-700 px-6 py-2 text-sm font-medium text-white hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null,
  };
}
