import { useState, useRef } from 'react';
import { ChevronDown, CheckCircle } from 'lucide-react';

interface NiceSelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface NiceSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: NiceSelectOption[];
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export default function NiceSelect({ value, onChange, options, placeholder = 'Selecione...', className = '', size = 'md', icon }: NiceSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  const sizeClass = size === 'sm'
    ? 'px-2.5 py-1 text-[11px] gap-1.5'
    : 'px-3 py-2 text-sm gap-2';

  const itemSizeClass = size === 'sm'
    ? 'px-2.5 py-1.5 text-[11px]'
    : 'px-3 py-2 text-sm';

  const chevronSize = size === 'sm' ? 10 : 14;
  const checkSize = size === 'sm' ? 10 : 12;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 font-semibold text-gray-900 transition-all hover:border-blue-500/50 focus:border-blue-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:hover:border-blue-500/50 ${sizeClass}`}
      >
        <span className="flex items-center gap-1.5 truncate">
          {icon}
          {selected?.icon && <span>{selected.icon}</span>}
          <span className={selected ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
            {selected?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown size={chevronSize} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[160px] rounded-xl border border-gray-200 bg-white py-1 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex w-full items-center gap-2 ${itemSizeClass} font-medium transition-colors ${
                  value === opt.value
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {opt.icon && <span>{opt.icon}</span>}
                <span className="truncate">{opt.label}</span>
                {value === opt.value && <CheckCircle size={checkSize} className="ml-auto shrink-0 text-blue-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
