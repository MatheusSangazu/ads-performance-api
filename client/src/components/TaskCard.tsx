import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, Trash2, Edit3 } from 'lucide-react';
import type { TaskItem } from '../lib/api';

interface TaskCardProps {
  task: TaskItem;
  clientName?: string;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-orange-500/20 text-orange-400',
  urgent: 'bg-red-500/20 text-red-400',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export default function TaskCard({ task, clientName, onEdit, onDelete }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = task.dueDate && new Date(task.dueDate + 'T23:59:59') < new Date();
  const dueDateFormatted = task.dueDate
    ? (() => { const [y, m, d] = task.dueDate.slice(0, 10).split('-'); return `${d}/${m}/${y}`; })()
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border border-gray-700/60 bg-gray-800/80 p-2.5 transition-shadow ${
        isDragging ? 'z-50 shadow-2xl shadow-black/50' : 'hover:shadow-md hover:border-gray-600'
      }`}
    >
      <div className="flex items-start gap-1.5">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 shrink-0 cursor-grab text-gray-600 hover:text-gray-400"
        >
          <GripVertical size={12} />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-xs font-medium text-white">{task.title}</p>
          {task.description && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-gray-500">{task.description}</p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span
              className={`rounded-full px-1.5 py-px text-[9px] font-semibold leading-tight ${PRIORITY_COLORS[task.priority]}`}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>

            {clientName && (
              <span className="max-w-[80px] truncate rounded-full bg-purple-500/20 px-1.5 py-px text-[9px] font-medium leading-tight text-purple-400">
                {clientName}
              </span>
            )}

            {dueDateFormatted && (
              <span
                className={`flex items-center gap-0.5 text-[9px] ${
                  isOverdue ? 'text-red-400' : 'text-gray-500'
                }`}
              >
                <Calendar size={9} />
                {dueDateFormatted}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onEdit(task)}
            className="rounded p-0.5 text-gray-500 hover:bg-gray-700 hover:text-blue-400"
          >
            <Edit3 size={11} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="rounded p-0.5 text-gray-500 hover:bg-gray-700 hover:text-red-400"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
