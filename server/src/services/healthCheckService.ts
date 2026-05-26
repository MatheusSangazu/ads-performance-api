import prisma from '../config/db.js';
import { env } from '../config/env.js';
import alertService from './alertService.js';
import evoService from './evoService.js';

class HealthCheckService {
  private readonly baseUrl = 'https://graph.facebook.com/v25.0';

  public async checkAccountHealth(actId: string, customToken?: string): Promise<{
    accountStatus: number;
    disableReason: number;
  } | null> {
    try {
      let token = customToken;
      if (!token) {
        const client = await prisma.client.findUnique({
          where: { actId },
          select: { accessToken: true },
        });
        token = client?.accessToken?.trim() || undefined;
      }

      if (!token) {
        console.warn(`[HealthCheck] Sem token para ${actId}`);
        return null;
      }

      const response = await fetch(
        `${this.baseUrl}/${actId}?fields=account_status,disable_reason&access_token=${token}`
      );

      if (!response.ok) {
        const body = await response.text();
        console.error(`[HealthCheck] API error ${response.status} for ${actId}: ${body}`);
        return null;
      }

      const data = await response.json();
      console.log(`[HealthCheck] ${actId} → status=${data.account_status}, disable_reason=${data.disable_reason || 0}`);
      return {
        accountStatus: data.account_status,
        disableReason: data.disable_reason || 0,
      };
    } catch (error) {
      console.error(`[HealthCheck] Catch error for ${actId}:`, error);
      return null;
    }
  }

  public async updateClientHealth(actId: string, customToken?: string) {
    const health = await this.checkAccountHealth(actId, customToken);
    if (!health) return;

    await prisma.client.update({
      where: { actId },
      data: {
        accountStatus: health.accountStatus,
        disableReason: health.disableReason,
        healthLastCheck: new Date(),
      },
    });

    if (health.accountStatus !== 1) {
      const statusLabel = this.getStatusLabel(health.accountStatus);
      const reasonLabel = this.getDisableReasonLabel(health.disableReason);
      await alertService.onAccountIssue(actId, statusLabel, reasonLabel).catch(() => {});
    }

    return health;
  }

  public getStatusLabel(status: number): string {
    const labels: Record<number, string> = {
      1: 'Ativa',
      2: 'Desativada',
      3: 'Pendência de Pagamento',
      7: 'Análise de Risco',
      9: 'Período de Graça',
      100: 'Fechamento Pendente',
      101: 'Fechada',
    };
    return labels[status] || 'Desconhecido';
  }

  public getDisableReasonLabel(reason: number): string {
    const reasons: Record<number, string> = {
      0: 'Nenhum',
      1: 'Violação de Políticas',
      2: 'Atividade Incomum',
      3: 'Pagamento Pendente',
      4: 'Conta Permanente Desativada',
    };
    return reasons[reason] || 'Outro';
  }

  public async sendHealthSummary(managerId: string, phone: string, clientIds: string[]) {
    if (!evoService.isConfigured) return;

    const results: { name: string; status: string; ok: boolean }[] = [];

    for (const actId of clientIds) {
      const client = await prisma.client.findUnique({
        where: { actId },
        select: {
          clientName: true,
          accountStatus: true,
          accessToken: true,
          healthLastCheck: true,
        },
      });

      if (!client) continue;

      const staleThreshold = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const needsLiveCheck = !client.accountStatus || !client.healthLastCheck || client.healthLastCheck < staleThreshold;

      if (needsLiveCheck && client.accessToken) {
        const health = await this.checkAccountHealth(actId, client.accessToken);
        if (health) {
          await prisma.client.update({
            where: { actId },
            data: {
              accountStatus: health.accountStatus,
              disableReason: health.disableReason,
              healthLastCheck: new Date(),
            },
          });

          if (health.accountStatus !== 1) {
            const statusLabel = this.getStatusLabel(health.accountStatus);
            const reasonLabel = this.getDisableReasonLabel(health.disableReason);
            await alertService.onAccountIssue(actId, statusLabel, reasonLabel).catch(() => {});
          }

          const label = this.getStatusLabel(health.accountStatus);
          results.push({ name: client.clientName, status: label, ok: health.accountStatus === 1 });
          continue;
        }
      }

      if (client.accountStatus !== null && client.accountStatus !== undefined) {
        const label = this.getStatusLabel(client.accountStatus);
        results.push({ name: client.clientName, status: label, ok: client.accountStatus === 1 });
      } else {
        results.push({ name: client.clientName, status: '⚠️ Sem token configurado', ok: false });
      }
    }

    if (results.length === 0) return;

    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const lines = [
      '🏥 *Resumo de Saúde das Contas*',
      `📅 ${now}`,
      '',
    ];

    for (const r of results) {
      const icon = r.ok ? '✅' : '🔴';
      lines.push(`${icon} ${r.name} — ${r.status}`);
    }

    const allOk = results.every((r) => r.ok);
    lines.push('');
    if (allOk) {
      lines.push('✨ Todas as contas estão operando normalmente!');
    } else {
      const problems = results.filter((r) => !r.ok);
      lines.push(`⚠️ ${problems.length} conta(s) com atenção necessária.`);
    }
    lines.push('', '_GestorFácil_');

    await evoService.sendText(phone, lines.join('\n'));
  }
}

export default new HealthCheckService();
