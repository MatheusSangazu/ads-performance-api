import { Users, ChevronDown } from 'lucide-react';
import type { Client } from '../lib/api';

interface ClientSelectorProps {
  clients: Client[];
  selectedId: string;
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  showIcon?: boolean;
  variant?: 'default' | 'ghost';
}

export default function ClientSelector({
  clients,
  selectedId,
  onChange,
  label,
  placeholder = 'Selecionar cliente...',
  className = '',
  showIcon = true,
  variant = 'default',
}: ClientSelectorProps) {
  const baseStyles = variant === 'default' 
    ? 'border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950' 
    : 'border-transparent bg-transparent';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1 dark:text-gray-500">
          {label}
        </label>
      )}
      <div className="relative group">
        {showIcon && (
          <Users
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500 dark:text-gray-500"
          />
        )}
        <select
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none rounded-xl py-2.5 pr-10 text-sm font-bold text-gray-900 outline-none transition-all focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 dark:text-white ${baseStyles} ${
            showIcon ? 'pl-10' : 'pl-4'
          }`}
        >
          <option value="">{placeholder}</option>
          {clients.map((c) => (
            <option key={c.actId} value={c.actId}>
              {c.clientName}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500">
          <ChevronDown size={16} />
        </div>
      </div>
    </div>
  );
}
