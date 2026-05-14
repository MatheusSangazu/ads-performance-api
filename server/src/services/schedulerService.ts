import cron from 'node-cron';
import clientRepository from '../repositories/clientRepository.js';
import syncService from './syncService.js';
import breakdownSyncService from './breakdownSyncService.js';
import settingsRepository from '../repositories/settingsRepository.js';

class SchedulerService {
  private task: cron.ScheduledTask | null = null;

  public start() {
    if (this.task) return;

    this.task = cron.schedule('0 2 * * *', async () => {
      await this.runDailySync();
    });

    console.log('[SCHEDULER] Scheduler iniciado: sync diário às 02:00');
  }

  public stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('[SCHEDULER] Scheduler parado.');
    }
  }

  public isRunning(): boolean {
    return this.task !== null;
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
