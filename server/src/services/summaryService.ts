import prisma from '../config/db.js';
import dashboardRepository from '../repositories/dashboardRepository.js';
import managerRepository from '../repositories/managerRepository.js';
import evoService from './evoService.js';

class SummaryService {
  public async sendWeeklySummaryToAllManagers() {
    const managers = await prisma.manager.findMany({
      where: { active: true, weeklySummary: true },
    });

    for (const manager of managers) {
      if (!manager.phone || !manager.whatsappNotify) continue;
      await this.sendSummaryToManager(manager.id, manager.phone);
    }
  }

  public async sendSummaryToManager(managerId: string, phone: string) {
    const clientIds = await managerRepository.getClientIds(managerId);
    if (clientIds.length === 0) return;

    const performance = await dashboardRepository.getOverview(clientIds);
    
    const lines = [
      '📊 *Resumo Semanal de Performance*',
      '',
      `Período: Últimos 7 dias`,
      `Total Gasto: R$ ${performance.totalSpend.toFixed(2)}`,
      `Total Leads: ${performance.totalLeads}`,
      `CPL Médio: R$ ${performance.avgCpl.toFixed(2)}`,
      `ROAS Médio: ${performance.avgRoas.toFixed(2)}`,
      '',
      '*Destaque por Cliente:*',
    ];

    performance.clientMetrics.slice(0, 5).forEach((m: any) => {
      lines.push(`- ${m.clientName}: R$ ${m.spend.toFixed(2)} | ${m.leads} leads | CPL R$ ${m.leads > 0 ? (m.spend/m.leads).toFixed(2) : '0.00'}`);
    });

    if (performance.clientMetrics.length > 5) {
      lines.push(`... e mais ${performance.clientMetrics.length - 5} clientes.`);
    }

    lines.push('', '_Acesse o dashboard para ver o relatório completo._');

    await evoService.sendText(phone, lines.join('\n'));
  }
}

export default new SummaryService();
