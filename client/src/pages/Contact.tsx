import LegalLayout from '../components/LegalLayout';
import { Mail, MessageSquare, Clock } from 'lucide-react';

export default function Contact() {
  return (
    <LegalLayout title="Suporte e Contato" lastUpdated="26 de maio de 2026">
      <p>Precisa de ajuda? Estamos aqui para ajudar. Entre em contato conosco por qualquer um dos canais abaixo.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <Mail size={24} className="text-blue-600 dark:text-blue-400 mb-3" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">E-mail</h3>
          <a href="mailto:matheussalvespro@gmail.com" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            matheussalvespro@gmail.com
          </a>
          <p className="text-xs text-gray-400 mt-2">Para dúvidas, sugestões, solicitações de dados e exercício de direitos (LGPD).</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <MessageSquare size={24} className="text-green-600 dark:text-green-400 mb-3" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">WhatsApp</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">Suporte via WhatsApp para clientes ativos.</p>
          <p className="text-xs text-gray-400 mt-2">Disponível no número cadastrado na plataforma.</p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-900/30 dark:bg-blue-950/20">
        <div className="flex items-start gap-3">
          <Clock size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Horário de Atendimento</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">Segunda a Sexta, das 9h às 18h (horário de Brasília).</p>
            <p className="text-xs text-gray-500 mt-1">Solicitações fora do horário serão respondidas no próximo dia útil.</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">Assuntos Comuns</h2>
      <div className="space-y-3 mt-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Problemas de acesso</h3>
          <p className="text-xs text-gray-500 mt-1">Esqueceu a senha, conta bloqueada ou problemas de login.</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Sincronização de dados</h3>
          <p className="text-xs text-gray-500 mt-1">Dados não atualizados, erro na sincronização de campanhas.</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Exercício de direitos (LGPD)</h3>
          <p className="text-xs text-gray-500 mt-1">Acesso, correção, exclusão ou portabilidade de dados pessoais.</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Planos e faturamento</h3>
          <p className="text-xs text-gray-500 mt-1">Dúvidas sobre planos, upgrade/downgrade ou faturamento.</p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">Informações da Empresa</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Razão Social:</strong> Matheus Henrique da Silva Alves (MEI)</li>
        <li><strong>Nome Fantasia:</strong> Forjacorp</li>
        <li><strong>E-mail:</strong> matheussalvespro@gmail.com</li>
      </ul>
    </LegalLayout>
  );
}
