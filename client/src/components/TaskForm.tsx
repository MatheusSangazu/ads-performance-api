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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 dark:bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-4 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {task ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h3>
          <button type="button" onClick={onCancel} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Título da Tarefa</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500/50 outline-none transition-all focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:placeholder-gray-600"
              placeholder="Ex: Revisar criativos da campanha"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Descrição (Opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500/50 outline-none transition-all focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:placeholder-gray-600"
              placeholder="Detalhes sobre o que precisa ser feito..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Prioridade</label>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
                    priority === p.value
                      ? `${p.color} border-transparent text-white shadow-lg`
                      : 'border-gray-200 text-gray-400 hover:border-gray-300 dark:border-gray-800 dark:text-gray-500 dark:hover:border-gray-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Data de Entrega</label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Selecionar data"
              />
            </div>

            {clients && clients.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Cliente Relacionado</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500/50 outline-none transition-all focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
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
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-500 transition-all hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            Descartar
          </button>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98]"
          >
            {task ? 'Salvar Alterações' : 'Criar Tarefa'}
          </button>
        </div>
      </form>
    </div>
  );
  
}
