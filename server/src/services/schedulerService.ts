import cron from 'node-cron';
import clientRepository from '../repositories/clientRepository.js';
import syncService from './syncService.js';
import breakdownSyncService from './breakdownSyncService.js';
import settingsRepository from '../repositories/settingsRepository.js';
import summaryService from './summaryService.js';
import healthCheckService from './healthCheckService.js';
import managerRepository from '../repositories/managerRepository.js';
import balanceService from './balanceService.js';
import evoService from './evoService.js';
import prisma from '../config/db.js';
import alertService from './alertService.js';

const TZ = 'America/Sao_Paulo';

class SchedulerService {
  private task: cron.ScheduledTask | null = null;
  private healthTask: cron.ScheduledTask | null = null;
  private healthSummaryTask: cron.ScheduledTask | null = null;
  private weeklyTask: cron.ScheduledTask | null = null;
  private balanceTask: cron.ScheduledTask | null = null;

  public start() {
    if (this.task) return;

    this.task = cron.schedule('0 2 * * *', async () => {
      await this.runDailySync();
    }, { timezone: TZ });

    this.healthTask = cron.schedule('0 8,12,18 * * *', async () => {
      const hour = new Date().toLocaleString('en-US', { timeZone: TZ, hour: '2-digit', hour12: false });
      await this.runScheduledHealthChecks(hour);
    }, { timezone: TZ });

    this.healthSummaryTask = cron.schedule('30 8 * * *', async () => {
      await this.runHealthSummary();
    }, { timezone: TZ });

    this.weeklyTask = cron.schedule('0 9 * * 1', async () => {
      await summaryService.sendWeeklySummaryToAllManagers();
    }, { timezone: TZ });

    this.balanceTask = cron.schedule('0 8,14 * * *', async () => {
      await this.runBalanceCheck();
    }, { timezone: TZ });

    console.log('[SCHEDULER] Scheduler iniciado (America/Sao_Paulo): sync 02:00, health 08/12/18:00, resumo saúde 08:30, semanal seg 09:00, saldo boleto 08/14:00');
  }

  public stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
    if (this.healthTask) {
      this.healthTask.stop();
      this.healthTask = null;
    }
    if (this.healthSummaryTask) {
      this.healthSummaryTask.stop();
      this.healthSummaryTask = null;
    }
    if (this.weeklyTask) {
      this.weeklyTask.stop();
      this.weeklyTask = null;
    }
    if (this.balanceTask) {
      this.balanceTask.stop();
      this.balanceTask = null;
    }
    console.log('[SCHEDULER] Scheduler parado.');
  }

  public isRunning(): boolean {
    return this.task !== null;
  }

  private async runScheduledHealthChecks(hour: string) {
    console.log(`[SCHEDULER] Iniciando health checks + resumo para as ${hour}:00...`);
    
    const managers = await prisma.manager.findMany({
      where: {
        active: true,
        whatsappNotify: true,
        healthCheckTimes: { contains: hour }
      }
    });

    if (managers.length === 0) return;

    for (const manager of managers) {
      const clientIds = await managerRepository.getClientIds(manager.id);
      if (clientIds.length === 0) continue;

      for (const actId of clientIds) {
        const client = await prisma.client.findUnique({
          where: { actId },
          select: { clientName: true, accessToken: true },
        });
        if (!client) {
          console.warn(`[SCHEDULER] Cliente ${actId} não encontrado no banco`);
          continue;
        }
        const result = await healthCheckService.updateClientHealth(actId, client.accessToken || undefined).catch((err) => {
          console.error(`[SCHEDULER] Erro health check ${client.clientName} (${actId}):`, err);
        });
        if (!result) {
          console.warn(`[SCHEDULER] Health check falhou para ${client.clientName} (${actId}) — token configurado? ${!!client.accessToken}`);
        }
      }

      if (manager.phone) {
        await healthCheckService.sendHealthSummary(manager.id, manager.phone, clientIds).catch((err) => {
          console.error(`[SCHEDULER] Erro ao enviar resumo para ${manager.name}:`, err);
        });
      }
    }
  }

  private async runHealthSummary() {
    console.log('[SCHEDULER] Enviando resumo de saúde para gestores sem healthCheckTimes...');

    const managers = await prisma.manager.findMany({
      where: {
        active: true,
        whatsappNotify: true,
        phone: { not: null },
        healthCheckTimes: { not: { contains: '08' } },
      },
    });

    for (const manager of managers) {
      const clientIds = await managerRepository.getClientIds(manager.id);
      if (clientIds.length === 0) continue;

      await healthCheckService.sendHealthSummary(manager.id, manager.phone!, clientIds).catch((err) => {
        console.error(`[SCHEDULER] Erro ao enviar resumo para ${manager.name}:`, err);
      });
    }
  }

  public async syncAllClients(): Promise<{
    total: number;
    success: number;
    failed: number;
    details: string[];
  }> {
    const clients = await clientRepository.listAll();
    const details: string[] = [];
    let success = 0;
    let failed = 0;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    console.log(`[SCHEDULER] Auto-sync: ${clients.length} cliente(s) | Data: ${dateStr}`);

    for (const client of clients) {
      try {
        const result = await syncService.syncAccount(client.actId, dateStr, dateStr);
        if (result.success) {
          success++;
          details.push(`[OK] ${client.clientName}: ${result.records} registros`);
        } else {
          failed++;
          details.push(`[WARN] ${client.clientName}: ${result.records} salvos, ${result.errors} erros`);
        }

        try {
          const breakdownResults = await breakdownSyncService.syncAllBreakdowns(client.actId, dateStr, dateStr);
          for (const [type, br] of Object.entries(breakdownResults)) {
            details.push(`   [DATA] ${type}: ${br.records} registros${br.errors > 0 ? `, ${br.errors} erros` : ''}`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          details.push(`   [WARN] Breakdown falhou para ${client.clientName}: ${msg}`);
        }
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        details.push(`[ERROR] ${client.clientName}: ${msg}`);
        console.error(`[ERROR] Auto-sync falhou para ${client.clientName}: ${msg}`);
      }
    }

    console.log(`[DONE] Auto-sync concluído: ${success} OK, ${failed} falhas`);
    return { total: clients.length, success, failed, details };
  }

  private async runDailySync() {
    const enabled = await settingsRepository.get('auto_sync_enabled');
    if (enabled !== 'true') {
      console.log('[SCHEDULER] Auto-sync pulado (desativado nas configurações).');
      return;
    }

    console.log('[SCHEDULER] Iniciando auto-sync diário...');
    await this.syncAllClients();
  }

  private async runBalanceCheck() {
    console.log('[SCHEDULER] Verificando saldo de contas boleto...');
    const alerts = await balanceService.checkAllBoletoAccounts();

    if (alerts.length === 0) return;

    for (const alert of alerts) {
      await alertService.onBalanceLow(alert.actId, alert.balance, alert.threshold).catch((err) => {
        console.error(`[SCHEDULER] Erro ao criar alerta de saldo para ${alert.clientName}:`, err);
      });
    }

    console.log(`[SCHEDULER] ${alerts.length} alerta(s) de saldo baixo verificado(s).`);
  }
}

export default new SchedulerService();
