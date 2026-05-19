import { useState, useRef, useEffect, useMemo } from 'react';
import { Users, ChevronDown, Check, Search, X } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedClient = useMemo(
    () => clients.find((c) => c.actId === selectedId),
    [clients, selectedId]
  );

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    return clients.filter((c) =>
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.actId.includes(searchTerm)
    );
  }, [clients, searchTerm]);

  // Click away listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const baseStyles = variant === 'default' 
    ? 'border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950 shadow-sm' 
    : 'border-transparent bg-transparent';

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1 dark:text-gray-500">
          {label}
        </label>
      )}
      
      <div className="relative">
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`group w-full flex items-center gap-3 rounded-xl py-2.5 px-4 text-sm font-bold text-gray-900 outline-none transition-all dark:text-white ${baseStyles} ${
            isOpen ? 'ring-4 ring-blue-500/10 border-blue-500/50' : 'hover:border-gray-300 dark:hover:border-gray-700'
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {showIcon && (
            <Users
              size={16}
              className={`transition-colors ${isOpen ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}
            />
          )}
          
          <span className={`flex-1 text-left truncate ${!selectedClient ? 'text-gray-400 dark:text-gray-500' : ''}`}>
            {selectedClient ? selectedClient.clientName : placeholder}
          </span>

          <ChevronDown 
            size={16} 
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} 
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-[100] mt-2 w-full min-w-[240px] rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-800 dark:bg-gray-900 animate-in fade-in zoom-in-95 duration-200">
            {/* Search Input inside dropdown */}
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2 pl-9 pr-8 text-xs text-gray-900 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:placeholder-gray-600"
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto scrollbar-hide space-y-1">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  selectedId === '' 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                    : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {placeholder}
                {selectedId === '' && <Check size={14} />}
              </button>

              <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />

              {filteredClients.length === 0 ? (
                <p className="py-4 text-center text-[10px] font-bold uppercase text-gray-400 tracking-widest">
                  Nenhum cliente encontrado
                </p>
              ) : (
                filteredClients.map((client) => (
                  <button
                    key={client.actId}
                    type="button"
                    onClick={() => {
                      onChange(client.actId);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                      selectedId === client.actId 
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="truncate">{client.clientName}</span>
                      <span className="text-[9px] opacity-50 font-mono">{client.actId}</span>
                    </div>
                    {selectedId === client.actId && <Check size={14} className="shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

