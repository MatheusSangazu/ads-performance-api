import { randomUUID } from 'node:crypto';
import type { ClientSummarySchedule } from '../generated/prisma/client.js';
import prisma from '../config/db.js';
import dashboardRepository from '../repositories/dashboardRepository.js';
import evoService from './evoService.js';

const TIME_ZONE = 'America/Fortaleza';
const RETRY_INTERVAL_MS = 10 * 60 * 1000;

export type SummaryFrequencyInput = 'daily' | 'weekly' | 'monthly';
export type SummaryPeriodInput = 'yesterday' | 'previous_week' | 'previous_month' | 'month_to_date' | 'last_7_days';
export type SummaryDestinationInput = 'phone' | 'group';

export interface SummaryScheduleInput {
  name: string;
  enabled: boolean;
  frequency: SummaryFrequencyInput;
  sendTime: string;
  weekDay?: number | null;
  monthDay?: number | null;
  period: SummaryPeriodInput;
  destinationType: SummaryDestinationInput;
  destination: string;
  template: string;
}

interface DateRange {
  since: string;
  until: string;
  label: string;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
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

function getZonedParts(date: Date): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const values = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  return values as unknown as ZonedParts;
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = desiredAsUtc;

  for (let iteration = 0; iteration < 3; iteration++) {
    const actual = getZonedParts(new Date(guess));
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    guess += desiredAsUtc - actualAsUtc;
  }

  return new Date(guess);
}

function calendarDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDate(date: string): string {
  return date.split('-').reverse().join('/');
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function calculateNextRun(
  schedule: Pick<SummaryScheduleInput, 'frequency' | 'sendTime' | 'weekDay' | 'monthDay'>,
  after = new Date(),
): Date {
  const [hour, minute] = schedule.sendTime.split(':').map(Number);
  const local = getZonedParts(after);

  if (schedule.frequency === 'daily') {
    let candidate = zonedDateTimeToUtc(local.year, local.month, local.day, hour, minute);
    if (candidate <= after) {
      const nextDay = addDays(calendarDate(local.year, local.month, local.day), 1);
      candidate = zonedDateTimeToUtc(
        nextDay.getUTCFullYear(),
        nextDay.getUTCMonth() + 1,
        nextDay.getUTCDate(),
        hour,
        minute,
      );
    }
    return candidate;
  }

  if (schedule.frequency === 'weekly') {
    const today = calendarDate(local.year, local.month, local.day);
    const targetWeekDay = schedule.weekDay ?? 1;
    let daysAhead = (targetWeekDay - today.getUTCDay() + 7) % 7;
    let target = addDays(today, daysAhead);
    let candidate = zonedDateTimeToUtc(
      target.getUTCFullYear(),
      target.getUTCMonth() + 1,
      target.getUTCDate(),
      hour,
      minute,
    );
    if (candidate <= after) {
      daysAhead = daysAhead === 0 ? 7 : daysAhead + 7;
      target = addDays(today, daysAhead);
      candidate = zonedDateTimeToUtc(
        target.getUTCFullYear(),
        target.getUTCMonth() + 1,
        target.getUTCDate(),
        hour,
        minute,
      );
    }
    return candidate;
  }

  const desiredDay = schedule.monthDay ?? 1;
  let year = local.year;
  let month = local.month;
  let day = Math.min(desiredDay, daysInMonth(year, month));
  let candidate = zonedDateTimeToUtc(year, month, day, hour, minute);

  if (candidate <= after) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    day = Math.min(desiredDay, daysInMonth(year, month));
    candidate = zonedDateTimeToUtc(year, month, day, hour, minute);
  }

  return candidate;
}

function resolveDateRange(period: SummaryPeriodInput, now = new Date()): DateRange {
  const local = getZonedParts(now);
  const today = calendarDate(local.year, local.month, local.day);
  let since: Date;
  let until: Date;

  switch (period) {
    case 'yesterday':
      since = addDays(today, -1);
      until = since;
      break;
    case 'previous_week': {
      const daysSinceMonday = (today.getUTCDay() + 6) % 7;
      const currentMonday = addDays(today, -daysSinceMonday);
      since = addDays(currentMonday, -7);
      until = addDays(currentMonday, -1);
      break;
    }
    case 'previous_month':
      since = new Date(Date.UTC(local.year, local.month - 2, 1));
      until = new Date(Date.UTC(local.year, local.month - 1, 0));
      break;
    case 'month_to_date':
      since = new Date(Date.UTC(local.year, local.month - 1, 1));
      until = today;
      break;
    case 'last_7_days':
      since = addDays(today, -6);
      until = today;
      break;
  }

  const sinceString = toDateString(since);
  const untilString = toDateString(until);
  return {
    since: sinceString,
    until: untilString,
    label: sinceString === untilString
      ? formatDate(sinceString)
      : `${formatDate(sinceString)} a ${formatDate(untilString)}`,
  };
}

function normalizeDestination(destination: string, type: SummaryDestinationInput): string {
  if (type === 'phone') {
    const digits = destination.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      throw new Error('Informe o telefone com DDI e DDD. Ex.: 5585999999999.');
    }
    return digits;
  }

  const groupId = destination.trim().replace(/\s/g, '');
  const normalized = groupId.endsWith('@g.us') ? groupId : `${groupId}@g.us`;
  if (!/^[0-9-]+@g\.us$/.test(normalized)) {
    throw new Error('ID de grupo inválido. Selecione um grupo ou informe um ID terminado em @g.us.');
  }
  return normalized;
}

function currency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function number(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function decimal(value: number, suffix = ''): string {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
}

class SummaryAutomationService {
  public readonly defaultTemplate = DEFAULT_TEMPLATE;

  public async list(managerId: string, clientId: string) {
    return prisma.clientSummarySchedule.findMany({
      where: { managerId, clientId },
      orderBy: [{ enabled: 'desc' }, { nextRunAt: 'asc' }],
    });
  }

  public async create(managerId: string, clientId: string, input: SummaryScheduleInput) {
    const destination = normalizeDestination(input.destination, input.destinationType);
    return prisma.clientSummarySchedule.create({
      data: {
        id: randomUUID(),
        managerId,
        clientId,
        name: input.name.trim(),
        enabled: input.enabled,
        frequency: input.frequency,
        sendTime: input.sendTime,
        weekDay: input.frequency === 'weekly' ? input.weekDay : null,
        monthDay: input.frequency === 'monthly' ? input.monthDay : null,
        period: input.period,
        destinationType: input.destinationType,
        destination,
        template: input.template.trim(),
        nextRunAt: calculateNextRun(input),
      },
    });
  }

  public async update(managerId: string, clientId: string, id: string, input: SummaryScheduleInput) {
    await this.findOwned(managerId, clientId, id);
    const destination = normalizeDestination(input.destination, input.destinationType);
    return prisma.clientSummarySchedule.update({
      where: { id },
      data: {
        name: input.name.trim(),
        enabled: input.enabled,
        frequency: input.frequency,
        sendTime: input.sendTime,
        weekDay: input.frequency === 'weekly' ? input.weekDay : null,
        monthDay: input.frequency === 'monthly' ? input.monthDay : null,
        period: input.period,
        destinationType: input.destinationType,
        destination,
        template: input.template.trim(),
        nextRunAt: calculateNextRun(input),
        lastAttemptAt: null,
        lastError: null,
      },
    });
  }

  public async remove(managerId: string, clientId: string, id: string) {
    await this.findOwned(managerId, clientId, id);
    await prisma.clientSummarySchedule.delete({ where: { id } });
    return { success: true };
  }

  public async preview(clientId: string, input: Pick<SummaryScheduleInput, 'period' | 'template'>) {
    const rendered = await this.render(clientId, input.period, input.template);
    return { text: rendered.text, range: rendered.range };
  }

  public async sendTest(clientId: string, input: SummaryScheduleInput) {
    if (!evoService.isConfigured) throw new Error('Evolution API não configurada.');
    const destination = normalizeDestination(input.destination, input.destinationType);
    const rendered = await this.render(clientId, input.period, input.template);
    const sent = await evoService.sendTextToDestination(destination, input.destinationType, rendered.text);
    if (!sent) throw new Error('A Evolution API não confirmou o envio da mensagem.');
    return { success: true, message: 'Mensagem de teste enviada com sucesso.' };
  }

  public async runDueSchedules(now = new Date()): Promise<void> {
    const retryBefore = new Date(now.getTime() - RETRY_INTERVAL_MS);
    const schedules = await prisma.clientSummarySchedule.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: now },
        manager: { active: true },
        OR: [
          { lastAttemptAt: null },
          { lastAttemptAt: { lte: retryBefore } },
        ],
      },
      take: 100,
      orderBy: { nextRunAt: 'asc' },
    });

    for (const schedule of schedules) {
      const claimed = await prisma.clientSummarySchedule.updateMany({
        where: {
          id: schedule.id,
          enabled: true,
          nextRunAt: { lte: now },
          OR: [
            { lastAttemptAt: null },
            { lastAttemptAt: { lte: retryBefore } },
          ],
        },
        data: { lastAttemptAt: now },
      });
      if (claimed.count === 0) continue;

      try {
        const rendered = await this.render(
          schedule.clientId,
          schedule.period as SummaryPeriodInput,
          schedule.template,
        );
        const sent = await evoService.sendTextToDestination(
          schedule.destination,
          schedule.destinationType as SummaryDestinationInput,
          rendered.text,
        );
        if (!sent) throw new Error('A Evolution API não confirmou o envio.');

        await prisma.clientSummarySchedule.update({
          where: { id: schedule.id },
          data: {
            lastSentAt: now,
            lastAttemptAt: now,
            lastError: null,
            nextRunAt: calculateNextRun(schedule, new Date(now.getTime() + 60_000)),
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await prisma.clientSummarySchedule.update({
          where: { id: schedule.id },
          data: { lastError: message.slice(0, 2000) },
        });
        console.error(`[SUMMARY AUTOMATION] Falha na rotina ${schedule.id}: ${message}`);
      }
    }
  }

  private async findOwned(managerId: string, clientId: string, id: string): Promise<ClientSummarySchedule> {
    const schedule = await prisma.clientSummarySchedule.findFirst({
      where: { id, managerId, clientId },
    });
    if (!schedule) throw new Error('Rotina de resumo não encontrada.');
    return schedule;
  }

  private async render(clientId: string, period: SummaryPeriodInput, template: string) {
    const [client, range] = await Promise.all([
      prisma.client.findUnique({
        where: { actId: clientId },
        select: { clientName: true, clientType: true, accountStatus: true },
      }),
      Promise.resolve(resolveDateRange(period)),
    ]);
    if (!client) throw new Error('Cliente não encontrado.');

    const metrics = await dashboardRepository.getOverview(null, {
      since: range.since,
      until: range.until,
      specificClientId: clientId,
    });

    const statusLabels: Record<number, string> = {
      1: 'Ativa',
      2: 'Desativada',
      3: 'Pendência de pagamento',
      7: 'Em análise',
      9: 'Período de graça',
      101: 'Fechada',
    };
    const typeLabels: Record<string, string> = {
      lead_gen: 'Geração de leads',
      ecommerce: 'E-commerce',
      infoproduct: 'Infoproduto',
      messaging: 'Mensagens',
      delivery: 'Delivery',
    };

    const variables: Record<string, string> = {
      cliente: client.clientName,
      act_id: clientId,
      periodo: range.label,
      data_inicio: formatDate(range.since),
      data_fim: formatDate(range.until),
      tipo_cliente: typeLabels[client.clientType] || client.clientType,
      status_conta: statusLabels[client.accountStatus ?? 1] || 'Desconhecido',
      investimento: currency(metrics.totalSpend),
      leads: number(metrics.totalLeads),
      cpl: currency(metrics.avgCpl),
      cliques: number(metrics.totalClicks),
      impressoes: number(metrics.totalImpressions),
      alcance: number(metrics.totalReach),
      ctr: decimal(metrics.avgCtr, '%'),
      cpc: currency(metrics.avgCpc),
      cpm: currency(metrics.avgCpm),
      mensagens: number(metrics.totalMessaging),
      cpmsg: currency(metrics.avgCpmsg),
      vendas: number(metrics.totalPurchases),
      valor_vendas: currency(metrics.totalPurchaseValue),
      valor_conversao: currency(metrics.totalConversionValue),
      roas: decimal(metrics.avgRoas, 'x'),
      curtidas: number(metrics.totalPageLikes),
    };

    const text = template.replace(/{{\s*([a-z_]+)\s*}}/gi, (placeholder, key: string) => (
      Object.prototype.hasOwnProperty.call(variables, key.toLowerCase())
        ? variables[key.toLowerCase()]
        : placeholder
    ));

    return { text, range, variables };
  }
}

export default new SummaryAutomationService();
