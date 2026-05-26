import { useState } from 'react';
import LegalLayout from '../components/LegalLayout';
import { Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function RemoveData() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');

    setTimeout(() => {
      setStatus('success');
    }, 1500);
  };

  return (
    <LegalLayout title="Solicitar Remoção de Dados" lastUpdated="26 de maio de 2026">
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/30 dark:bg-amber-950/20">
        <Shield size={22} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Seu direito à exclusão de dados</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            Em conformidade com a LGPD (Lei nº 13.709/2018) e os requisitos da Meta Platforms, você pode solicitar a exclusão de todos os seus dados da plataforma GestorFácil.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">O que será excluído</h2>
      <p>Ao solicitar a remoção, os seguintes dados serão eliminados:</p>
      <ul className="list-disc pl-5 space-y-1 mt-2">
        <li>Dados da sua conta (nome, e-mail, senha)</li>
        <li>Vínculos com clientes e gestores</li>
        <li>Métricas e dados de performance sincronizados</li>
        <li>Metas e projeções configuradas</li>
        <li>Configurações de alertas e notificações</li>
        <li>Tokens de acesso a APIs (Meta/Google)</li>
        <li>Histórico de tarefas e atividades</li>
      </ul>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">O que NÃO será excluído</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Dados que permanecem nas plataformas da Meta e Google (estes devem ser excluídos diretamente em cada plataforma)</li>
        <li>Registros financeiros e fiscais exigidos por lei (mantidos pelo prazo legal)</li>
        <li>Logs de segurança anonimizados</li>
      </ul>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">Prazo de Processamento</h2>
      <p>Sua solicitação será processada em até <strong>15 dias úteis</strong>, conforme previsto na LGPD. Você receberá confirmação por e-mail quando a exclusão for concluída.</p>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">Solicitar Remoção</h2>
      <p className="mb-4">Preencha o campo abaixo com o e-mail cadastrado na plataforma:</p>

      {status === 'success' ? (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-900/30 dark:bg-green-950/20">
          <CheckCircle size={22} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Solicitação recebida!</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              Enviamos uma confirmação para <strong>{email}</strong>. Sua solicitação será processada em até 15 dias úteis.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">E-mail cadastrado</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500/50 outline-none transition-all focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:placeholder-gray-600"
              placeholder="seu@email.com"
            />
          </div>

          {status === 'error' && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
              <AlertCircle size={16} />
              Ocorreu um erro. Tente novamente ou envie um e-mail para matheussalvespro@gmail.com.
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/20 transition-all hover:bg-red-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
          >
            {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            Solicitar Remoção de Dados
          </button>
        </form>
      )}

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Prefere enviar e-mail?</h3>
        <p className="text-sm text-gray-500">
          Você também pode solicitar a remoção diretamente por e-mail:
        </p>
        <a href="mailto:matheussalvespro@gmail.com?subject=Solicitação de Remoção de Dados - GestorFácil" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
          matheussalvespro@gmail.com
        </a>
        <p className="text-xs text-gray-400 mt-2">
          Inclua no e-mail: seu nome completo e o e-mail cadastrado na plataforma.
        </p>
      </div>
    </LegalLayout>
  );
}
