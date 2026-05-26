import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  title: string;
  children: React.ReactNode;
}

export default function HelpTooltip({ title, children }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const calcPos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const w = 280;
    const gap = 10;
    const estimatedHeight = 180;
    const showBelow = rect.top < estimatedHeight + gap + 10;

    const left = Math.max(8, Math.min(rect.left + rect.width / 2 - w / 2, window.innerWidth - w - 8));
    const top = showBelow
      ? rect.bottom + gap
      : rect.top - gap;

    setPos({
      top,
      left,
      ...(showBelow ? { below: true } : { below: false }),
    } as any);
  }, []);

  useEffect(() => {
    if (!open) return;
    calcPos();

    requestAnimationFrame(() => {
      if (!tooltipRef.current || !btnRef.current) return;
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      if (tooltipRect.top < 4) {
        const rect = btnRef.current.getBoundingClientRect();
        setPos((prev: any) => ({
          ...prev,
          top: rect.bottom + 10,
          below: true,
        }));
      }
    });

    const onScroll = () => setOpen(false);
    const onResize = () => calcPos();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, calcPos]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative z-10 text-gray-400 transition-colors hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400"
        aria-label={title}
      >
        <HelpCircle size={14} />
      </button>

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            ref={tooltipRef}
            className="fixed z-[9999] w-[280px] rounded-xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
            style={{
              top: pos.top,
              left: pos.left,
              transform: (pos as any).below ? 'none' : 'translateY(-100%)',
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">{title}</h4>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X size={14} />
              </button>
            </div>
            <div className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              {children}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
