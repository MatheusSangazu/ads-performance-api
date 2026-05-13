import { BarChart3, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Dashboard</h2>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex items-center gap-3 text-gray-400">
            <Users size={20} />
            <span className="text-sm font-medium">Clientes</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-white">—</p>
          <Link to="/clients" className="mt-2 inline-block text-sm text-blue-400 hover:underline">
            Ver clientes →
          </Link>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex items-center gap-3 text-gray-400">
            <Zap size={20} />
            <span className="text-sm font-medium">Sincronização</span>
          </div>
          <p className="mt-3 text-lg text-gray-300">Sincronize dados do Meta Ads</p>
          <Link to="/clients" className="mt-2 inline-block text-sm text-blue-400 hover:underline">
            Ir para sync →
          </Link>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex items-center gap-3 text-gray-400">
            <BarChart3 size={20} />
            <span className="text-sm font-medium">Relatórios</span>
          </div>
          <p className="mt-3 text-lg text-gray-300">Exporte dados em Excel</p>
          <Link to="/clients" className="mt-2 inline-block text-sm text-blue-400 hover:underline">
            Baixar relatório →
          </Link>
        </div>
      </div>

      <div className="mt-12 rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
        <BarChart3 size={48} className="mx-auto mb-4 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-300">Gráficos de Performance</h3>
        <p className="mt-2 text-sm text-gray-500">
          Em breve: visualize ROAS, investimentos e métricas de funil por cliente.
        </p>
      </div>
    </div>
  );
}
