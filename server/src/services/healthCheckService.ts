import prisma from '../config/db.js';
import { env } from '../config/env.js';
import alertService from './alertService.js';

class HealthCheckService {
  private readonly baseUrl = 'https://graph.facebook.com/v19.0';

  public async checkAccountHealth(actId: string, customToken?: string): Promise<{
    accountStatus: number;
    disableReason: number;
  } | null> {
    try {
      // Prioritize custom client token, fallback to global token
      const token = customToken || (await this.getGlobalToken());
      if (!token) return null;

      const response = await fetch(
        `${this.baseUrl}/${actId}?fields=account_status,disable_reason&access_token=${token}`
      );

      if (!response.ok) {
        console.error(`[HealthCheck] Error fetching health for ${actId}:`, await response.text());
        return null;
      }

      const data = await response.json();
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

  private async getGlobalToken(): Promise<string | null> {
    const setting = await prisma.appSettings.findUnique({ where: { key: 'global_token' } });
    return setting?.value || null;
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
}

export default new HealthCheckService();
