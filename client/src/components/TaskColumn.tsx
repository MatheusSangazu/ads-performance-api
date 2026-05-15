import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Trash2 } from 'lucide-react';
import TaskCard from './TaskCard';
import type { TaskItem } from '../lib/api';

interface TaskColumnProps {
  status: string;
  title: string;
  color: string;
  tasks: TaskItem[];
  clientNames: Record<string, string>;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => void;
  onClear?: () => void;
}

export default function TaskColumn({
  status,
  title,
  color,
  tasks,
  clientNames,
  onEdit,
  onDelete,
  onClear,
}: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[300px] min-w-0 flex-1 flex-col rounded-xl border transition-colors ${
        isOver ? 'border-blue-500/50 bg-gray-900/80' : 'border-gray-800 bg-gray-900/50'
      }`}
    >
      <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-3">
        <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="ml-auto rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
          {tasks.length}
        </span>
        {onClear && tasks.length > 0 && (
          <button
            onClick={onClear}
            title="Limpar concluídos"
            className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto scrollbar-hide p-3" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {tasks.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-600">Sem tarefas</p>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                clientName={task.clientId ? clientNames[task.clientId] : undefined}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
