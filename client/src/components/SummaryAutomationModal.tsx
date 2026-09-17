import { useEffect, useRef, useState, type FormEvent } from 'react';
import axios from 'axios';
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Smartphone,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  clientApi,
  settingsApi,
  type Client,
  type SummaryFrequency,
  type SummaryPeriod,
  type SummarySchedule,
  type SummarySchedulePayload,
  type WhatsappGroup,
} from '../lib/api';

interface SummaryAutomationModalProps {
  client: Client;
  onClose: () => void;
  onNotify: (type: 'success' | 'error', message: string) => void;
}

const DEFAULT_TEMPLATE = `📊 *Resumo de {{cliente}}*
📅 Período: {{periodo}}

💰 Investimento: *{{investimento}}*
🎯 Leads: *{{leads}}*
💵 CPL: *{{cpl}}*
📈 ROAS: *{{roas}}*
🛒 Vendas: *{{vendas}}*
💬 Mensagens: *{{mensagens}}*

_Enviado automaticamente_`;

const EMPTY_FORM: SummarySchedulePayload = {
  name: 'Resumo diário',
  enabled: true,
  frequency: 'daily',
  sendTime: '08:00',
  weekDay: 1,
  monthDay: 1,
  period: 'yesterday',
  destinationType: 'group',
  destination: '',
  template: DEFAULT_TEMPLATE,
};

const VARIABLES = [
  ['cliente', 'Cliente'],
  ['periodo', 'Período'],
  ['investimento', 'Investimento'],
  ['leads', 'Leads'],
  ['cpl', 'CPL'],
  ['roas', 'ROAS'],
  ['vendas', 'Vendas'],
  ['valor_vendas', 'Valor de vendas'],
  ['mensagens', 'Mensagens'],
  ['cpmsg', 'CPMsg'],
  ['cliques', 'Cliques'],
  ['impressoes', 'Impressões'],
  ['alcance', 'Alcance'],
  ['ctr', 'CTR'],
  ['cpc', 'CPC'],
  ['cpm', 'CPM'],
  ['curtidas', 'Curtidas'],
  ['status_conta', 'Status da conta'],
  ['tipo_cliente', 'Tipo de cliente'],
  ['data_inicio', 'Data inicial'],
  ['data_fim', 'Data final'],
] as const;

const PERIOD_OPTIONS: { value: SummaryPeriod; label: string }[] = [
  { value: 'yesterday', label: 'Dia anterior' },
  { value: 'previous_week', label: 'Semana anterior completa' },
  { value: 'previous_month', label: 'Mês anterior completo' },
  { value: 'month_to_date', label: 'Mês atual até hoje' },
  { value: 'last_7_days', label: 'Últimos 7 dias' },
];

const WEEK_DAYS = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

function errorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<{ error?: string; details?: { message: string }[] }>(error)) return fallback;
  return error.response?.data?.details?.[0]?.message || error.response?.data?.error || fallback;
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Nunca';
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: 'America/Fortaleza',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function scheduleDescription(schedule: SummarySchedule): string {
  if (schedule.frequency === 'daily') return `Todos os dias às ${schedule.sendTime}`;
  if (schedule.frequency === 'weekly') {
    const day = WEEK_DAYS.find((item) => item.value === schedule.weekDay)?.label || 'Dia definido';
    return `${day}, às ${schedule.sendTime}`;
  }
  return `Todo dia ${schedule.monthDay}, às ${schedule.sendTime}`;
}

export default function SummaryAutomationModal({ client, onClose, onNotify }: SummaryAutomationModalProps) {
  const [schedules, setSchedules] = useState<SummarySchedule[]>([]);
  const [groups, setGroups] = useState<WhatsappGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState('');
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<SummarySchedulePayload>(EMPTY_FORM);
  const [preview, setPreview] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let active = true;
    clientApi.listSummarySchedules(client.actId)
      .then(({ data }) => {
        if (active) setSchedules(data);
      })
      .catch((error: unknown) => {
        if (active) setLocalError(errorMessage(error, 'Não foi possível carregar as rotinas.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    settingsApi.getWhatsappGroups()
      .then(({ data }) => {
        if (active) setGroups(data.groups);
      })
      .catch(() => {
        if (active) setGroupsError('Não foi possível carregar os grupos. Você ainda pode informar o ID manualmente.');
      })
      .finally(() => {
        if (active) setGroupsLoading(false);
      });

    return () => { active = false; };
  }, [client.actId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving && !testing) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving, testing]);

  const refreshSchedules = async () => {
    const { data } = await clientApi.listSummarySchedules(client.actId);
    setSchedules(data);
  };

  const requestPreview = async (payload: SummarySchedulePayload) => {
    setPreviewLoading(true);
    setLocalError('');
    setLocalSuccess('');
    try {
      const { data } = await clientApi.previewSummarySchedule(client.actId, {
        period: payload.period,
        template: payload.template,
      });
      setPreview(data.text);
    } catch (error: unknown) {
      setLocalError(errorMessage(error, 'Não foi possível gerar a prévia.'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const startCreate = () => {
    const payload = { ...EMPTY_FORM };
    setForm(payload);
    setEditingId('new');
    setPreview('');
    setLocalError('');
    setLocalSuccess('');
    void requestPreview(payload);
  };

  const startEdit = (schedule: SummarySchedule) => {
    const payload: SummarySchedulePayload = {
      name: schedule.name,
      enabled: schedule.enabled,
      frequency: schedule.frequency,
      sendTime: schedule.sendTime,
      weekDay: schedule.weekDay,
      monthDay: schedule.monthDay,
      period: schedule.period,
      destinationType: schedule.destinationType,
      destination: schedule.destination,
      template: schedule.template,
    };
    setForm(payload);
    setEditingId(schedule.id);
    setPreview('');
    setLocalError('');
    void requestPreview(payload);
  };

  const changeFrequency = (frequency: SummaryFrequency) => {
    const periodByFrequency: Record<SummaryFrequency, SummaryPeriod> = {
      daily: 'yesterday',
      weekly: 'previous_week',
      monthly: 'previous_month',
    };
    setForm((current) => ({
      ...current,
      frequency,
      period: periodByFrequency[frequency],
      name: frequency === 'daily' ? 'Resumo diário' : frequency === 'weekly' ? 'Resumo semanal' : 'Resumo mensal',
    }));
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) return 'Informe um nome para a rotina.';
    if (!form.destination.trim()) return 'Escolha ou informe o destino.';
    if (!form.template.trim()) return 'Monte a mensagem antes de salvar.';
    return null;
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateForm();
    if (validation) {
      setLocalError(validation);
      return;
    }

    setSaving(true);
    setLocalError('');
    setLocalSuccess('');
    try {
      if (editingId === 'new') {
        await clientApi.createSummarySchedule(client.actId, form);
      } else if (editingId) {
        await clientApi.updateSummarySchedule(client.actId, editingId, form);
      }
      await refreshSchedules();
      setEditingId(null);
      setLocalSuccess('Rotina de aviso salva com sucesso.');
      onNotify('success', 'Rotina de aviso salva com sucesso.');
    } catch (error: unknown) {
      setLocalError(errorMessage(error, 'Não foi possível salvar a rotina.'));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const validation = validateForm();
    if (validation) {
      setLocalError(validation);
      return;
    }
    setTesting(true);
    setLocalError('');
    setLocalSuccess('');
    try {
      const { data } = await clientApi.testSummarySchedule(client.actId, form);
      setLocalSuccess(data.message);
      onNotify('success', data.message);
    } catch (error: unknown) {
      setLocalError(errorMessage(error, 'Não foi possível enviar a mensagem de teste.'));
    } finally {
      setTesting(false);
    }
  };

  const handleToggle = async (schedule: SummarySchedule) => {
    try {
      await clientApi.updateSummarySchedule(client.actId, schedule.id, {
        name: schedule.name,
        enabled: !schedule.enabled,
        frequency: schedule.frequency,
        sendTime: schedule.sendTime,
        weekDay: schedule.weekDay,
        monthDay: schedule.monthDay,
        period: schedule.period,
        destinationType: schedule.destinationType,
        destination: schedule.destination,
        template: schedule.template,
      });
      await refreshSchedules();
    } catch (error: unknown) {
      setLocalError(errorMessage(error, 'Não foi possível alterar a rotina.'));
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setLocalError('');
    setLocalSuccess('');
    try {
      await clientApi.deleteSummarySchedule(client.actId, id);
      await refreshSchedules();
      setConfirmDeleteId(null);
      setLocalSuccess('Rotina removida.');
      onNotify('success', 'Rotina removida.');
    } catch (error: unknown) {
      setLocalError(errorMessage(error, 'Não foi possível remover a rotina.'));
    } finally {
      setDeletingId(null);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    const placeholder = `{{${variable}}}`;
    if (!textarea) {
      setForm((current) => ({ ...current, template: `${current.template}${placeholder}` }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextTemplate = `${form.template.slice(0, start)}${placeholder}${form.template.slice(end)}`;
    setForm((current) => ({ ...current, template: nextTemplate }));
    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm sm:p-4 dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="automation-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving && !testing) onClose();
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-800">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">
              <BellRing size={21} />
            </div>
            <div className="min-w-0">
              <h2 id="automation-title" className="truncate font-bold text-gray-900 dark:text-white">Avisos de {client.clientName}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Resumos automáticos por WhatsApp</p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving || testing} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-white" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          {localError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {localError}
            </div>
          )}
          {localSuccess && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300">
              {localSuccess}
            </div>
          )}

          {editingId === null ? (
            <div>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Rotinas configuradas</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Você pode criar quantas combinações de frequência e destino precisar.</p>
                </div>
                <button onClick={startCreate} className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
                  <Plus size={17} /> Nova rotina
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-16 text-gray-400"><Loader2 className="animate-spin" /></div>
              ) : schedules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-14 text-center dark:border-gray-700">
                  <CalendarClock className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={38} />
                  <p className="font-medium text-gray-700 dark:text-gray-300">Nenhuma rotina configurada</p>
                  <p className="mt-1 text-sm text-gray-500">Crie a primeira para enviar métricas automaticamente.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {schedules.map((schedule) => (
                    <div key={schedule.id} className={`rounded-2xl border p-4 ${schedule.enabled ? 'border-green-200 bg-green-50/40 dark:border-green-500/20 dark:bg-green-500/5' : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="truncate font-semibold text-gray-900 dark:text-white">{schedule.name}</h4>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${schedule.enabled ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                              {schedule.enabled ? 'Ativa' : 'Pausada'}
                            </span>
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><Clock3 size={13} /> {scheduleDescription(schedule)}</p>
                          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-gray-500 dark:text-gray-400">
                            {schedule.destinationType === 'group' ? <Users size={13} /> : <Smartphone size={13} />}
                            {schedule.destination}
                          </p>
                        </div>
                        <button onClick={() => void handleToggle(schedule)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${schedule.enabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-700'}`} aria-label={schedule.enabled ? 'Pausar rotina' : 'Ativar rotina'}>
                          <span className={`h-4 w-4 rounded-full bg-white transition-transform ${schedule.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>

                      <div className="mt-4 space-y-1 border-t border-gray-200/70 pt-3 text-xs dark:border-gray-800">
                        <p className="text-gray-500 dark:text-gray-400">Próximo envio: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDateTime(schedule.nextRunAt)}</span></p>
                        <p className="text-gray-500 dark:text-gray-400">Último envio: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDateTime(schedule.lastSentAt)}</span></p>
                        {schedule.lastError && <p className="line-clamp-2 text-red-600 dark:text-red-400">Último erro: {schedule.lastError}</p>}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button onClick={() => startEdit(schedule)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-white dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                          <Pencil size={14} /> Editar
                        </button>
                        <button
                          onClick={() => {
                            if (confirmDeleteId === schedule.id) void handleDelete(schedule.id);
                            else setConfirmDeleteId(schedule.id);
                          }}
                          disabled={deletingId === schedule.id}
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10"
                          aria-label="Remover rotina"
                        >
                          {deletingId === schedule.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          {confirmDeleteId === schedule.id && deletingId !== schedule.id ? 'Confirmar' : ''}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSave}>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{editingId === 'new' ? 'Nova rotina' : 'Editar rotina'}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Defina quando, para quem e quais métricas serão enviadas.</p>
                </div>
                <button type="button" onClick={() => setEditingId(null)} className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white">Voltar</button>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <div className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Nome da rotina</label>
                    <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white" maxLength={100} />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Frequência</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['daily', 'weekly', 'monthly'] as SummaryFrequency[]).map((frequency) => (
                        <button key={frequency} type="button" onClick={() => changeFrequency(frequency)} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${form.frequency === frequency ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900'}`}>
                          {frequency === 'daily' ? 'Diária' : frequency === 'weekly' ? 'Semanal' : 'Mensal'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {form.frequency === 'weekly' && (
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Dia da semana</label>
                        <select value={form.weekDay ?? 1} onChange={(event) => setForm({ ...form, weekDay: Number(event.target.value) })} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                          {WEEK_DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                        </select>
                      </div>
                    )}
                    {form.frequency === 'monthly' && (
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Dia do mês</label>
                        <select value={form.monthDay ?? 1} onChange={(event) => setForm({ ...form, monthDay: Number(event.target.value) })} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                          {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>Dia {day}</option>)}
                        </select>
                      </div>
                    )}
                    <div className={form.frequency === 'daily' ? 'sm:col-span-1' : ''}>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Horário</label>
                      <input type="time" value={form.sendTime} onChange={(event) => setForm({ ...form, sendTime: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Período das métricas</label>
                    <select value={form.period} onChange={(event) => setForm({ ...form, period: event.target.value as SummaryPeriod })} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                      {PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Destino</label>
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setForm({ ...form, destinationType: 'group', destination: '' })} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${form.destinationType === 'group' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'border-gray-200 text-gray-500 dark:border-gray-700'}`}><Users size={16} /> Grupo</button>
                      <button type="button" onClick={() => setForm({ ...form, destinationType: 'phone', destination: '' })} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${form.destinationType === 'phone' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'border-gray-200 text-gray-500 dark:border-gray-700'}`}><Smartphone size={16} /> Telefone</button>
                    </div>

                    {form.destinationType === 'group' && (
                      <div className="mb-2">
                        <select value={groups.some((group) => group.id === form.destination) ? form.destination : ''} onChange={(event) => setForm({ ...form, destination: event.target.value })} disabled={groupsLoading || groups.length === 0} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                          <option value="">{groupsLoading ? 'Carregando grupos...' : groups.length ? 'Selecione um grupo' : 'Nenhum grupo carregado'}</option>
                          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                        </select>
                        {groupsError && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{groupsError}</p>}
                      </div>
                    )}

                    <input value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} placeholder={form.destinationType === 'group' ? 'ID manual: 120363...@g.us' : 'DDI + DDD + número: 5585999999999'} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                    <p className="mt-1 text-xs text-gray-400">Você pode selecionar acima ou informar o destino manualmente.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mensagem</label>
                      <button type="button" onClick={() => void requestPreview(form)} disabled={previewLoading || !form.template.trim()} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 dark:text-blue-400">
                        {previewLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Atualizar prévia
                      </button>
                    </div>
                    <textarea ref={textareaRef} value={form.template} onChange={(event) => setForm({ ...form, template: event.target.value })} rows={12} maxLength={10000} className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-3 font-mono text-sm leading-relaxed text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Inserir métrica</p>
                    <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                      {VARIABLES.map(([variable, label]) => (
                        <button key={variable} type="button" onClick={() => insertVariable(variable)} className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-blue-500/40 dark:hover:text-blue-400" title={`{{${variable}}}`}>
                          + {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"><Eye size={16} /> Prévia com dados atuais</div>
                    <div className="min-h-52 whitespace-pre-wrap rounded-2xl bg-[#e8f5e9] p-4 text-sm leading-relaxed text-gray-800 shadow-inner dark:bg-green-950/40 dark:text-gray-200">
                      {previewLoading ? <span className="flex items-center gap-2 text-gray-500"><Loader2 size={15} className="animate-spin" /> Gerando prévia...</span> : preview || 'Clique em “Atualizar prévia” para visualizar a mensagem.'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
                <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <button type="button" onClick={() => setForm({ ...form, enabled: !form.enabled })} className={`relative inline-flex h-6 w-11 items-center rounded-full ${form.enabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
                    <span className={`h-4 w-4 rounded-full bg-white transition-transform ${form.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  {form.enabled ? 'Rotina ativa após salvar' : 'Salvar como pausada'}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => void handleTest()} disabled={testing || saving} className="flex items-center justify-center gap-2 rounded-xl border border-green-300 px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50 dark:border-green-500/30 dark:text-green-400 dark:hover:bg-green-500/10">
                    {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {testing ? 'Enviando...' : 'Enviar teste'}
                  </button>
                  <button type="submit" disabled={saving || testing} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {saving ? 'Salvando...' : 'Salvar rotina'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
