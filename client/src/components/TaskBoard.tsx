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
import { Plus } from 'lucide-react';
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
    fetchTasks();
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 pb-4">
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
