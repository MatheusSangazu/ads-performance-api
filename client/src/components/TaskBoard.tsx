import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { Plus, AlertTriangle, Clock, CheckCircle, X } from 'lucide-react';
import TaskColumn from './TaskColumn';
import TaskForm from './TaskForm';
import { taskApi, clientApi, type TaskItem } from '../lib/api';

const COLUMNS = [
  { status: 'backlog', title: 'Backlog', color: 'bg-gray-500' },
  { status: 'todo', title: 'A Fazer', color: 'bg-blue-500' },
  { status: 'in_progress', title: 'Em Progresso', color: 'bg-yellow-500' },
  { status: 'review', title: 'Revisão', color: 'bg-purple-500' },
  { status: 'done', title: 'Concluído', color: 'bg-green-500' },
];

export default function TaskBoard() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [clients, setClients] = useState<{ actId: string; clientName: string }[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | undefined>(undefined);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const fetchTasks = useCallback(async () => {
    const { data } = await taskApi.list();
    setTasks(data);
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const { data } = await clientApi.list();
      setClients(data);
      const map: Record<string, string> = {};
      data.forEach((c: any) => { map[c.actId] = c.clientName; });
      setClientNames(map);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchClients();
  }, [fetchTasks, fetchClients]);

  const getTasksByStatus = (status: string) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    let targetStatus: string | null = null;

    const overColumn = COLUMNS.find((c) => c.status === over.id);
    if (overColumn) {
      targetStatus = overColumn.status;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    if (targetStatus && targetStatus !== activeTask.status) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeTask.id ? { ...t, status: targetStatus! } : t,
        ),
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    let targetStatus = activeTask.status;
    const overColumn = COLUMNS.find((c) => c.status === over.id);
    if (overColumn) {
      targetStatus = overColumn.status;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) targetStatus = overTask.status;
    }

    if (targetStatus !== activeTask.status) {
      try {
        await taskApi.updateStatus(activeTask.id, targetStatus);
      } catch {
        fetchTasks();
      }
    }
  };

  const handleCreate = async (data: {
    title: string;
    description?: string;
    clientId?: string;
    priority: string;
    dueDate?: string;
  }) => {
    await taskApi.create(data);
    setShowForm(false);
    setFeedback({ type: 'success', message: `Tarefa "${data.title}" criada com sucesso!` });
    fetchTasks();
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleUpdate = async (data: {
    title: string;
    description?: string;
    clientId?: string;
    priority: string;
    dueDate?: string;
  }) => {
    if (!editingTask) return;
    await taskApi.update(editingTask.id, {
      ...data,
      clientId: data.clientId || null,
      dueDate: data.dueDate || null,
    });
    setEditingTask(undefined);
    fetchTasks();
  };

  const handleDelete = async (id: string) => {
    await taskApi.remove(id);
    fetchTasks();
  };

  const handleClearDone = async () => {
    await taskApi.clearByStatus('done');
    fetchTasks();
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);

  const overdueTasks = tasks.filter((t) =>
    t.status !== 'done' && t.dueDate && new Date(t.dueDate + 'T23:59:59') < now,
  );
  const upcomingTasks = tasks.filter((t) =>
    t.status !== 'done' && t.dueDate && new Date(t.dueDate + 'T23:59:59') >= now && new Date(t.dueDate) <= tomorrow,
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tarefas</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie suas tarefas no quadro Kanban</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          Nova Tarefa
        </button>
      </div>

      {feedback && (
        <div className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm animate-in fade-in slide-in-from-top-1 ${
          feedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300' :
          feedback.type === 'warning' ? 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
          'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300'
        }`}>
          {feedback.type === 'success' && <CheckCircle size={16} />}
          {feedback.type === 'warning' && <Clock size={16} />}
          {feedback.type === 'error' && <AlertTriangle size={16} />}
          <span className="flex-1">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="ml-auto text-current opacity-50 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {(overdueTasks.length > 0 || upcomingTasks.length > 0) && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {overdueTasks.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
              <div className="rounded-lg bg-red-100 p-2 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-red-700 dark:text-red-400">{overdueTasks.length} tarefas atrasadas</p>
                <p className="text-xs text-red-600/70 dark:text-red-500/50">Priorize estas atividades hoje</p>
              </div>
            </div>
          )}
          {upcomingTasks.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{upcomingTasks.length} tarefas para amanhã</p>
                <p className="text-xs text-blue-600/70 dark:text-blue-500/50">Fique de olho nos prazos próximos</p>
              </div>
            </div>
          )}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0 scrollbar-hide">
          {COLUMNS.map((col) => (
            <TaskColumn
              key={col.status}
              status={col.status}
              title={col.title}
              color={col.color}
              tasks={getTasksByStatus(col.status)}
              clientNames={clientNames}
              onEdit={setEditingTask}
              onDelete={handleDelete}
              onClear={col.status === 'done' ? handleClearDone : undefined}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-72 rounded-lg border border-blue-500/50 bg-gray-800 p-3 shadow-xl">
              <p className="text-sm font-medium text-white">{activeTask.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showForm && (
        <TaskForm
          clients={clients}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingTask && (
        <TaskForm
          task={editingTask}
          clients={clients}
          onSubmit={handleUpdate}
          onCancel={() => setEditingTask(undefined)}
        />
      )}
    </div>
  );
}
