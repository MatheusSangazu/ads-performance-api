import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  title: string;
  children: React.ReactNode;
}

export default function HelpTooltip({ title, children }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-gray-500 transition-colors hover:text-blue-400"
        aria-label={title}
      >
        <HelpCircle size={14} />
      </button>

      {open && (
        <div className="absolute left-1/2 z-50 mt-2 w-72 -translate-x-1/2 rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-2xl sm:w-80">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-blue-400">{title}</h4>
            <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">
              <X size={14} />
            </button>
          </div>
          <div className="space-y-2 text-xs leading-relaxed text-gray-300">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
