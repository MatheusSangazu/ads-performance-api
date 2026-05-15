import { useState, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getDaysInMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

export default function DatePicker({ value, onChange, placeholder = 'Selecionar data' }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const selected = value ? new Date(value + 'T12:00:00') : null;

  const formatDisplay = (v: string) => {
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleSelect = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const days = getDaysInMonth(viewYear, viewMonth);

  const isToday = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const isSelected = (d: number) =>
    selected && d === selected.getDate() && viewMonth === selected.getMonth() && viewYear === selected.getFullYear();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition-colors hover:border-gray-500 focus:border-blue-500 focus:outline-none"
      >
        <Calendar size={14} className="text-gray-500" />
        <span className={value ? 'text-white' : 'text-gray-500'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="ml-auto text-gray-500 hover:text-gray-300"
          >
            <X size={14} />
          </button>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-gray-700 bg-gray-900 p-3 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={prevMonth} className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-white">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button type="button" onClick={nextMonth} className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white">
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1 text-[10px] font-medium text-gray-500">{d}</div>
              ))}
              {days.map((day, i) => (
                <div key={i}>
                  {day ? (
                    <button
                      type="button"
                      onClick={() => handleSelect(day)}
                      className={`flex h-7 w-full items-center justify-center rounded-md text-xs transition-colors ${
                        isSelected(day)
                          ? 'bg-blue-600 font-semibold text-white'
                          : isToday(day)
                            ? 'bg-gray-800 font-medium text-blue-400'
                            : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      {day}
                    </button>
                  ) : (
                    <div className="h-7" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
