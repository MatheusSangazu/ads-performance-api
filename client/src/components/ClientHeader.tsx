import { useState } from 'react';
import { Search, Filter, Plus, LayoutGrid, List } from 'lucide-react';
import NiceSelect from './NiceSelect';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: '1', label: 'Ativa' },
  { value: '2', label: 'Desativada' },
  { value: '3', label: 'Pendência' },
];

interface ClientHeaderProps {
  onSearch: (term: string) => void;
  onFilterChange: (status: string) => void;
  onViewToggle: (view: 'grid' | 'list') => void;
  currentView: 'grid' | 'list';
  onNewClient: () => void;
  totalClients: number;
}

export default function ClientHeader({
  onSearch,
  onFilterChange,
  onViewToggle,
  currentView,
  onNewClient,
  totalClients
}: ClientHeaderProps) {
  const [statusFilter, setStatusFilter] = useState('all');

  return (
    <div className="mb-6 sm:mb-8 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Clientes</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{totalClients} clientes cadastrados no sistema</p>
        </div>
        <button
          onClick={onNewClient}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-950 outline-none"
          aria-label="Adicionar novo cliente"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500 dark:text-gray-500 dark:group-focus-within:text-blue-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou act_id..."
            onChange={(e) => onSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-900"
            aria-label="Buscar clientes"
          />
        </div>

        <div className="flex items-center gap-3">
          <NiceSelect
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); onFilterChange(v); }}
            options={STATUS_OPTIONS}
            icon={<Filter size={14} className="text-gray-400" />}
            className="w-[180px]"
          />

          <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900/50">
            <button
              onClick={() => onViewToggle('grid')}
              className={`rounded-lg p-2 transition-all ${
                currentView === 'grid'
                  ? 'bg-gray-100 text-blue-600 shadow-inner dark:bg-gray-800 dark:text-blue-400'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
              title="Visualização em Grade"
              aria-label="Ver em grade"
              aria-pressed={currentView === 'grid'}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => onViewToggle('list')}
              className={`rounded-lg p-2 transition-all ${
                currentView === 'list'
                  ? 'bg-gray-100 text-blue-600 shadow-inner dark:bg-gray-800 dark:text-blue-400'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
              title="Visualização em Lista"
              aria-label="Ver em lista"
              aria-pressed={currentView === 'list'}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
