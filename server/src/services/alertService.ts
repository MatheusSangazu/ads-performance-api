import alertRepository from '../repositories/alertRepository.js';
import budgetRepository from '../repositories/budgetRepository.js';
import goalRepository from '../repositories/goalRepository.js';
import dashboardRepository from '../repositories/dashboardRepository.js';
import managerRepository from '../repositories/managerRepository.js';
import taskService from './taskService.js';
import evoService from './evoService.js';
import prisma from '../config/db.js';
import type { AlertType, AlertSeverity } from '../generated/prisma/client.js';

class AlertService {
  private async dedupCreate(
    managerId: string,
    clientId: string,
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    message: string,
  ) {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const existing = await alertRepository.findDuplicate(managerId, clientId, type, monthStart);
    if (existing) return existing;
    const alert = await alertRepository.create({ managerId, clientId, type, severity, title, message });

    if (severity === 'critical') {
      taskService.create(managerId, {
        clientId,
        title: `[Alerta] ${title}`,
        description: message,
        priority: type === 'budget_exceeded' ? 'urgent' : 'high',
        alertId: alert.id,
      }).catch(() => {});
    }

    this.sendWhatsapp(managerId, clientId, title, message, severity).catch(() => {});

    return alert;
  }

  public async evaluate(clientId: string, managerIds?: string[]) {
    const managers = managerIds
      ? managerIds.map((id) => id)
      : (await managerRepository.findManagersForClient(clientId)).map((m) => m.id);

    if (managers.length === 0) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const performance = await dashboardRepository.getOverview([clientId], {
      since: monthStartStr,
      until: todayStr,
    });
    const totalSpend = performance.totalSpend;
    const metrics = performance.clientMetrics[0];

    for (const managerId of managers) {
      const budget = await budgetRepository.findCurrent(managerId, clientId);
      if (budget) {
        const budgetAmount = Number(budget.budgetAmount);
        const percent = budgetAmount > 0 ? (totalSpend / budgetAmount) * 100 : 0;

        if (percent > 100) {
          await this.dedupCreate(
            managerId,
            clientId,
            'budget_exceeded',
            'critical',
            'Orcamento excedido',
            `Investimento de R$ ${totalSpend.toFixed(2)} ultrapassou o orcamento de R$ ${budgetAmount.toFixed(2)} (${percent.toFixed(0)}%).`,
          );
        } else if (percent >= 80) {
          await this.dedupCreate(
            managerId,
            clientId,
            'budget_warning',
            'warning',
            'Orcamento acima de 80%',
            `Investimento de R$ ${totalSpend.toFixed(2)} atingiu ${percent.toFixed(0)}% do orcamento de R$ ${budgetAmount.toFixed(2)}.`,
          );
        } else if (percent < 20) {
          await this.dedupCreate(
            managerId,
            clientId,
            'budget_underuse',
            'info',
            'Orcamento subutilizado',
            `Investimento de R$ ${totalSpend.toFixed(2)} representa apenas ${percent.toFixed(0)}% do orcamento de R$ ${budgetAmount.toFixed(2)}.`,
          );
        }
      }

      const goals = await goalRepository.findCurrent(managerId, clientId);
      for (const goal of goals) {
        const target = Number(goal.targetValue);
        const current = metrics
          ? this.getMetricValue(goal.metric, metrics, performance)
          : 0;

        const isInverse = goal.metric === 'cpl';
        const percentGoal = isInverse
          ? target > 0 ? (target / Math.max(current, 0.01)) * 100 : 0
          : target > 0 ? (current / target) * 100 : 0;

        if (percentGoal >= 100) {
          await this.dedupCreate(
            managerId,
            clientId,
            'goal_reached',
            'success',
            `Meta atingida: ${goal.metric}`,
            `Meta de ${goal.metric} alcancada! Atual: ${current.toFixed(2)}, Target: ${target.toFixed(2)}.`,
          );
        } else if (percentGoal < 50) {
          await this.dedupCreate(
            managerId,
            clientId,
            'goal_behind',
            'warning',
            `Meta atrasada: ${goal.metric}`,
            `Meta de ${goal.metric} com apenas ${percentGoal.toFixed(0)}% atingido. Atual: ${current.toFixed(2)}, Target: ${target.toFixed(2)}.`,
          );
        }
      }
    }
  }

  public async onSyncSuccess(clientId: string) {
    const managers = (await managerRepository.findManagersForClient(clientId)).map((m) => m.id);
    for (const managerId of managers) {
      await this.dedupCreate(
        managerId,
        clientId,
        'sync_success',
        'info',
        'Sync concluido',
        `Sincronizacao dos dados do cliente ${clientId} concluida com sucesso.`,
      );
    }
  }

  public async onSyncFailed(clientId: string, error: string) {
    const managers = (await managerRepository.findManagersForClient(clientId)).map((m) => m.id);
    for (const managerId of managers) {
      await this.dedupCreate(
        managerId,
        clientId,
        'sync_failed',
        'critical',
        'Falha no sync',
        `Erro ao sincronizar cliente ${clientId}: ${error}`,
      );
    }
  }

  public async list(managerId: string) {
    return alertRepository.findByManager(managerId);
  }

  public async countUnread(managerId: string) {
    return alertRepository.countUnread(managerId);
  }

  public async markRead(id: string, managerId: string) {
    const alert = await prisma.alert.findUnique({ where: { id }, select: { managerId: true } });
    if (!alert || alert.managerId !== managerId) {
      throw new Error('Alerta não encontrado ou sem permissão.');
    }
    return alertRepository.markRead(id);
  }

  public async markAllRead(managerId: string) {
    return alertRepository.markAllRead(managerId);
  }

  public async dismiss(id: string, managerId: string) {
    const alert = await prisma.alert.findUnique({ where: { id }, select: { managerId: true } });
    if (!alert || alert.managerId !== managerId) {
      throw new Error('Alerta não encontrado ou sem permissão.');
    }
    return alertRepository.dismiss(id);
  }

  public async onAccountIssue(clientId: string, statusLabel: string, reasonLabel: string) {
    const managers = await managerRepository.findManagersForClient(clientId);
    for (const manager of managers) {
      await this.dedupCreate(
        manager.id,
        clientId,
        'account_issue',
        'critical',
        'Problema na conta de anuncios',
        `A conta de anuncios esta com status: ${statusLabel}. Motivo: ${reasonLabel}.`,
      );
    }
  }

  private getMetricValue(metric: string, clientMetrics: any, overview: any): number {
    switch (metric) {
      case 'leads': return clientMetrics.leads || 0;
      case 'cpl': return clientMetrics.leads > 0 ? clientMetrics.spend / clientMetrics.leads : 0;
      case 'roas': return clientMetrics.roas || 0;
      case 'ctr': return overview.totalImpressions > 0 ? (overview.totalClicks / overview.totalImpressions) * 100 : 0;
      case 'clicks': return overview.totalClicks || 0;
      case 'impressions': return overview.totalImpressions || 0;
      case 'purchases': return overview.totalPurchases || 0;
      case 'purchase_value': return overview.totalPurchaseValue || 0;
      default: return 0;
    }
  }

  private async sendWhatsapp(
    managerId: string,
    clientId: string,
    title: string,
    message: string,
    severity: AlertSeverity,
  ) {
    if (!evoService.isConfigured) return;

    const manager = await managerRepository.findById(managerId);
    if (!manager?.phone || !manager.whatsappNotify) return;

    const client = await prisma.client.findUnique({
      where: { actId: clientId },
      select: { clientName: true },
    });

    const text = evoService.formatAlertMessage({
      title,
      message,
      clientName: client?.clientName,
      severity,
    });

    await evoService.sendText(manager.phone, text);
  }
}

export default new AlertService();
