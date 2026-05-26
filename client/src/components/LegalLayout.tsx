import { Link } from 'react-router-dom';
import { BarChart3, ArrowLeft } from 'lucide-react';

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-6 py-4">
          <Link to="/login" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Voltar</span>
          </Link>
          <Link to="/login" className="flex items-center gap-2">
            <BarChart3 size={22} className="text-blue-600 dark:text-blue-500" />
            <span className="text-lg font-bold text-gray-900 dark:text-white">GestorFácil</span>
          </Link>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">Última atualização: {lastUpdated}</p>
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
          {children}
        </div>

        <footer className="mt-16 border-t border-gray-200 dark:border-gray-800 pt-8">
          <p className="text-center text-xs text-gray-400 dark:text-gray-600">
            GestorFácil — Plataforma de gestão de anúncios
          </p>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs">
            <Link to="/privacidade" className="text-gray-400 hover:text-blue-600 dark:text-gray-600 dark:hover:text-blue-400">Privacidade</Link>
            <Link to="/termos" className="text-gray-400 hover:text-blue-600 dark:text-gray-600 dark:hover:text-blue-400">Termos</Link>
            <Link to="/contato" className="text-gray-400 hover:text-blue-600 dark:text-gray-600 dark:hover:text-blue-400">Contato</Link>
            <Link to="/remover-dados" className="text-gray-400 hover:text-blue-600 dark:text-gray-600 dark:hover:text-blue-400">Remover Dados</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
