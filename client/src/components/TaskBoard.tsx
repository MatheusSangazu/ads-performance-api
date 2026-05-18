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
          <h2 className="text-2xl font-bold text-white">Tarefas</h2>
          <p className="text-sm text-gray-500">Gerencie suas tarefas no quadro Kanban</p>
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
        <div className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
          feedback.type === 'success' ? 'border-green-800 bg-green-900/30 text-green-300' :
          feedback.type === 'warning' ? 'border-yellow-800 bg-yellow-900/30 text-yellow-300' :
          'border-red-800 bg-red-900/30 text-red-300'
        }`}>
          {feedback.type === 'success' && <CheckCircle size={16} />}
          {feedback.type === 'warning' && <Clock size={16} />}
          {feedback.type === 'error' && <AlertTriangle size={16} />}
          <span className="flex-1">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-gray-500 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {overdueTasks.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            <strong>{overdueTasks.length}</strong> tarefa{overdueTasks.length > 1 ? 's' : ''} atrasada{overdueTasks.length > 1 ? 's' : ''}:
            {' '}{overdueTasks.map((t) => t.title).join(', ')}
          </span>
        </div>
      )}

      {upcomingTasks.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-800 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-300">
          <Clock size={16} className="shrink-0" />
          <span>
            <strong>{upcomingTasks.length}</strong> tarefa{upcomingTasks.length > 1 ? 's' : ''} próxima{upcomingTasks.length > 1 ? 's' : ''} do prazo:
            {' '}{upcomingTasks.map((t) => t.title).join(', ')}
          </span>
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
