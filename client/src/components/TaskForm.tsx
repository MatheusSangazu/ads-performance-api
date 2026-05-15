import { useState } from 'react';
import { X } from 'lucide-react';
import type { TaskItem } from '../lib/api';
import DatePicker from './DatePicker';

interface TaskFormProps {
  task?: TaskItem;
  clients?: { actId: string; clientName: string }[];
  onSubmit: (data: {
    title: string;
    description?: string;
    clientId?: string;
    priority: string;
    dueDate?: string;
  }) => void;
  onCancel: () => void;
}

const PRIORITIES = [
  { value: 'low', label: 'Baixa', color: 'bg-gray-500' },
  { value: 'medium', label: 'Média', color: 'bg-blue-500' },
  { value: 'high', label: 'Alta', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-500' },
];

export default function TaskForm({ task, clients, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [clientId, setClientId] = useState(task?.clientId || '');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [dueDate, setDueDate] = useState(task?.dueDate?.split('T')[0] || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || undefined,
      clientId: clientId || undefined,
      priority,
      dueDate: dueDate || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {task ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h3>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              placeholder="Título da tarefa"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-400">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              placeholder="Descrição opcional..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-400">Prioridade</label>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    priority === p.value
                      ? `${p.color} border-transparent text-white`
                      : 'border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-400">Prazo</label>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="Selecionar prazo"
            />
          </div>

          {clients && clients.length > 0 && (
            <div>
              <label className="mb-1 block text-sm text-gray-400">Cliente</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Sem cliente</option>
                {clients.map((c) => (
                  <option key={c.actId} value={c.actId}>
                    {c.clientName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {task ? 'Salvar' : 'Criar Tarefa'}
          </button>
        </div>
      </form>
    </div>
  );
}
