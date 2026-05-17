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
          className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6"
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
                autoComplete="off"
                data-1p-ignore
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="act_123456789"
              />
              {errors.act_id && <p className="mt-1 text-xs text-red-400">{errors.act_id.message}</p>}
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1">
                <label className="text-sm text-gray-400">Access Token *</label>
                <HelpTooltip title="Como obter o Token">
                  <p>
                    <strong>1.</strong> Acesse o{' '}
                    <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener" className="text-blue-400 underline">
                      Graph API Explorer
                    </a>
                    {' '}com sua conta.
                  </p>
                  <p>
                    <strong>2.</strong> Selecione o app e a conta de anúncio desejada.
                  </p>
                  <p>
                    <strong>3.</strong> Adicione a permissão <code className="rounded bg-gray-800 px-1 py-0.5 text-yellow-400">ads_read</code> e clique em <em>"Generate Access Token"</em>.
                  </p>
                  <p className="mt-1 border-t border-gray-700 pt-2">
                    <strong>Estender para 3 meses:</strong> Copie o token gerado e acesse o{' '}
                    <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" rel="noopener" className="text-blue-400 underline">
                      Access Token Debugger
                    </a>
                    {' '}para verificar e estender a validade do token.
                  </p>
                </HelpTooltip>
              </div>
              <input
                {...register('access_token')}
                type="password"
                autoComplete="off"
                data-1p-ignore
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
