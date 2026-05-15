import cron from 'node-cron';
import clientRepository from '../repositories/clientRepository.js';
import syncService from './syncService.js';
import breakdownSyncService from './breakdownSyncService.js';
import settingsRepository from '../repositories/settingsRepository.js';
import summaryService from './summaryService.js';
import healthCheckService from './healthCheckService.js';
import managerRepository from '../repositories/managerRepository.js';
import prisma from '../config/db.js';

class SchedulerService {
  private task: cron.ScheduledTask | null = null;
  private healthTask: cron.ScheduledTask | null = null;
  private weeklyTask: cron.ScheduledTask | null = null;

  public start() {
    if (this.task) return;

    // Daily Sync at 02:00
    this.task = cron.schedule('0 2 * * *', async () => {
      await this.runDailySync();
    });

    // Health Checks at 08:00, 12:00, 18:00
    this.healthTask = cron.schedule('0 8,12,18 * * *', async () => {
      const hour = new Date().getHours().toString().padStart(2, '0');
      await this.runScheduledHealthChecks(hour);
    });

    // Weekly Summary on Mondays at 09:00
    this.weeklyTask = cron.schedule('0 9 * * 1', async () => {
      await summaryService.sendWeeklySummaryToAllManagers();
    });

    console.log('[SCHEDULER] Scheduler iniciado: sync diário, health checks e resumo semanal');
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
    if (this.weeklyTask) {
      this.weeklyTask.stop();
      this.weeklyTask = null;
    }
    console.log('[SCHEDULER] Scheduler parado.');
  }

  public isRunning(): boolean {
    return this.task !== null;
  }

  private async runScheduledHealthChecks(hour: string) {
    console.log(`[SCHEDULER] Iniciando health checks agendados para as ${hour}:00...`);
    
    // Find managers who want health checks at this hour
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
      for (const actId of clientIds) {
        // This will update health and trigger alerts if needed
        await healthCheckService.updateClientHealth(actId).catch(() => {});
      }
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
}

export default new SchedulerService();
