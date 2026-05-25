import prisma from '../config/db.js';
import dashboardRepository from '../repositories/dashboardRepository.js';
import managerRepository from '../repositories/managerRepository.js';
import goalRepository from '../repositories/goalRepository.js';
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
      lines.push(`- ${m.name}: R$ ${m.spend.toFixed(2)} | ${m.leads} leads | CPL R$ ${m.leads > 0 ? (m.spend/m.leads).toFixed(2) : '0.00'}`);
    });

    if (performance.clientMetrics.length > 5) {
      lines.push(`... e mais ${performance.clientMetrics.length - 5} clientes.`);
    }

    lines.push('', '_Acesse o dashboard para ver o relatório completo._');

    await evoService.sendText(phone, lines.join('\n'));
  }

  public async sendClientSummary(managerId: string, actId: string) {
    if (!evoService.isConfigured) {
      throw new Error('WhatsApp não configurado.');
    }

    const manager = await managerRepository.findById(managerId);
    if (!manager?.phone || !manager.whatsappNotify) {
      throw new Error('Gestor sem telefone ou notificações desativadas.');
    }

    const client = await prisma.client.findUnique({
      where: { actId },
      select: { clientName: true, status: true, accountStatus: true, clientType: true },
    });
    if (!client) throw new Error('Cliente não encontrado.');

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const today = now.toISOString().split('T')[0];

    const performance = await dashboardRepository.getOverview(null, {
      since: monthStart,
      until: today,
      specificClientId: actId,
    });

    const m = performance.clientMetrics[0];
    if (!m) throw new Error('Sem dados de performance para este cliente.');

    const isEcom = client.clientType === 'ecommerce';
    const isInfo = client.clientType === 'infoproduct';
    const isMsg = client.clientType === 'messaging';
    const isDelivery = client.clientType === 'delivery';

    const typeLabels: Record<string, string> = {
      lead_gen: '📋 Geração de Leads',
      ecommerce: '🛒 E-commerce',
      infoproduct: '🎓 Infoproduto',
      messaging: '💬 Mensagens',
      delivery: '🛵 Delivery',
    };

    const clientTypeLabel = typeLabels[client.clientType] || '📋 Geração de Leads';
    const showsPurchases = isEcom || isInfo || isDelivery;
    const showsLeads = !isEcom && !isMsg;

    const spend = m.spend;
    const leads = m.leads;
    const purchases = m.purchases;
    const messaging = m.messaging;
    const purchaseValue = performance.totalPurchaseValue;
    const conversionValue = m.conversionValue;
    const cpl = leads > 0 ? spend / leads : 0;
    const ctr = performance.totalImpressions > 0 ? (performance.totalClicks / performance.totalImpressions) * 100 : 0;
    const roas = spend > 0 ? conversionValue / spend : 0;
    const cpmsg = messaging > 0 ? spend / messaging : 0;

    const statusLabels: Record<number, string> = {
      1: '✅ Ativa', 2: '🔴 Desativada', 3: '🟡 Pendência Pagamento',
      7: '🟠 Análise de Risco', 9: '🟡 Período de Graça',
    };
    const accountStatus = client.accountStatus ?? 1;

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;
    const dailyAvg = daysPassed > 0 ? spend / daysPassed : 0;
    const projected = dailyAvg * daysInMonth;

    const lines: string[] = [
      `📊 *Resumo: ${client.clientName}*`,
      `🏷️ Tipo: ${clientTypeLabel}`,
      '',
      `📅 Período: 01/${String(now.getMonth() + 1).padStart(2, '0')} até ${today.split('-').reverse().join('/')}`,
      `🏥 Conta: ${statusLabels[accountStatus] || 'Desconhecido'}`,
      '',
      '━━━━━━━━━━━━━━━━━━',
      `📈 *Performance do Mês*`,
      '━━━━━━━━━━━━━━━━━━',
      '',
      `💰 Investimento: *R$ ${spend.toFixed(2)}*`,
      `📊 Projeção: R$ ${projected.toFixed(2)} (${dailyAvg > 0 ? 'R$ ' + dailyAvg.toFixed(2) + '/dia' : '-'})`,
    ];

    if (isEcom || isInfo) {
      const sectionTitle = isEcom ? '🛒 *E-commerce*' : '🎓 *Infoproduto*';
      lines.push(
        '', '━━━━━━━━━━━━━━━━━━',
        sectionTitle,
        '━━━━━━━━━━━━━━━━━━',
        '',
        `🛍️ Vendas: *${purchases}*`,
        `💵 Valor de Vendas: *R$ ${purchaseValue.toFixed(2)}*`,
        `📈 ROAS: *${roas.toFixed(2)}x*`,
        `🎯 Ticket Médio: ${purchases > 0 ? 'R$ ' + (purchaseValue / purchases).toFixed(2) : '-'}`,
      );

      if (isInfo && leads > 0) {
        lines.push('', `📋 Leads de Funil: ${leads}`, `💲 CPL: R$ ${cpl.toFixed(2)}`);
      }

      const customConvTotal = await this.getCustomConversionTotals(actId, monthStart, today);
      if (customConvTotal.length > 0) {
        lines.push('', '🏷️ *Conversões Personalizadas*');
        for (const cc of customConvTotal) {
          lines.push(`   ${cc.label}: ${cc.count} (R$ ${cc.value.toFixed(2)})`);
        }
      }

      if (messaging > 0) {
        lines.push('', `🤖 Mensagens: ${messaging}`, `💬 CPMsg: R$ ${cpmsg.toFixed(2)}`);
      }
    } else if (isMsg) {
      lines.push(
        '', '━━━━━━━━━━━━━━━━━━',
        '💬 *Foco em Mensagens*',
        '━━━━━━━━━━━━━━━━━━',
        '',
        `🤖 Mensagens: *${messaging}*`,
        `💬 CPMsg: *R$ ${cpmsg.toFixed(2)}*`,
      );

      if (leads > 0) {
        lines.push(`🎯 Leads: ${leads}`, `💲 CPL: R$ ${cpl.toFixed(2)}`);
      }

      const customConvTotal = await this.getCustomConversionTotals(actId, monthStart, today);
      if (customConvTotal.length > 0) {
        lines.push('', '🏷️ *Conversões Personalizadas*');
        for (const cc of customConvTotal) {
          lines.push(`   ${cc.label}: ${cc.count} (R$ ${cc.value.toFixed(2)})`);
        }
      }
    } else {
      const sectionTitle = '📋 *Geração de Leads*';
      lines.push(
        '', '━━━━━━━━━━━━━━━━━━',
        sectionTitle,
        '━━━━━━━━━━━━━━━━━━',
        '',
        `🎯 Leads: *${leads}*`,
        `💲 CPL: *R$ ${cpl.toFixed(2)}*`,
      );

      if (messaging > 0) {
        lines.push(`🤖 Mensagens: ${messaging}`, `💬 CPMsg: R$ ${cpmsg.toFixed(2)}`);
      }

      if (purchases > 0) {
        lines.push('', `🛒 Vendas: ${purchases}`, `💵 Valor: R$ ${purchaseValue.toFixed(2)}`, `📈 ROAS: ${roas.toFixed(2)}x`);
      }

      const customConvTotal = await this.getCustomConversionTotals(actId, monthStart, today);
      if (customConvTotal.length > 0) {
        lines.push('', '🏷️ *Conversões Personalizadas*');
        for (const cc of customConvTotal) {
          lines.push(`   ${cc.label}: ${cc.count} (R$ ${cc.value.toFixed(2)})`);
        }
      }
    }

    lines.push(
      '', '━━━━━━━━━━━━━━━━━━',
      '📊 *Geral*',
      '━━━━━━━━━━━━━━━━━━',
      '',
      `🖱️ Cliques: ${performance.totalClicks}`,
      `👁️ Impressões: ${performance.totalImpressions}`,
      `📊 CTR: ${ctr.toFixed(2)}%`,
      `📈 Alcance: ${performance.totalReach}`,
    );

    const goals = await goalRepository.findCurrent(managerId, actId);
    if (goals.length > 0) {
      lines.push('', '━━━━━━━━━━━━━━━━━━', '🎯 *Metas do Mês*', '━━━━━━━━━━━━━━━━━━', '');

      for (const goal of goals) {
        const target = Number(goal.targetValue);
        const metricLabel: Record<string, string> = {
          leads: 'Leads', cpl: 'CPL', roas: 'ROAS', ctr: 'CTR',
          clicks: 'Cliques', impressions: 'Impressões', purchases: 'Vendas',
          purchase_value: 'Valor de Venda', messaging: 'Mensagens', cpmsg: 'CPMsg',
        };
        const label = metricLabel[goal.metric] || goal.metric;

        let current: number;
        switch (goal.metric) {
          case 'leads': current = leads; break;
          case 'cpl': current = cpl; break;
          case 'roas': current = roas; break;
          case 'ctr': current = ctr; break;
          case 'clicks': current = performance.totalClicks; break;
          case 'impressions': current = performance.totalImpressions; break;
          case 'purchases': current = purchases; break;
          case 'purchase_value': current = performance.totalPurchaseValue; break;
          case 'messaging': current = messaging; break;
          case 'cpmsg': current = cpmsg; break;
          default: current = 0;
        }

        const isInverse = goal.metric === 'cpl' || goal.metric === 'cpmsg';
        const pct = isInverse
          ? (current > 0 ? (target / current) * 100 : 0)
          : (target > 0 ? (current / target) * 100 : 0);
        const reached = isInverse ? current <= target : current >= target;
        const icon = reached ? '✅' : pct >= 70 ? '🟡' : '🔴';

        const neededPerDay = daysRemaining > 0 ? (isInverse ? 0 : Math.max(0, target - current) / daysRemaining) : 0;
        const neededLabel = isInverse ? '' : ` | Falta/dia: ${neededPerDay.toFixed(1)}`;
        const decimals = ['roas', 'ctr', 'cpl', 'cpmsg', 'purchase_value'].includes(goal.metric) ? 2 : 0;

        lines.push(`${icon} ${label}: ${current.toFixed(decimals)} / ${target.toFixed(2)} (${pct.toFixed(0)}%)${neededLabel}`);
      }
    }

    const topAds = performance.topAds || [];
    const sortedAds = [...topAds].sort((a, b) => {
      if (showsPurchases) {
        return (b.totalConversionValue || 0) - (a.totalConversionValue || 0);
      }
      if (isMsg) {
        return (b.messaging || 0) - (a.messaging || 0);
      }
      return b.leads - a.leads;
    }).slice(0, 3);

    if (sortedAds.length > 0) {
      const sortLabel = showsPurchases ? 'por faturamento' : isMsg ? 'por mensagens' : 'por leads';
      lines.push('', '━━━━━━━━━━━━━━━━━━', `🎨 *Top Criativos (${sortLabel})*`, '━━━━━━━━━━━━━━━━━━', '');

      for (let i = 0; i < sortedAds.length; i++) {
        const ad = sortedAds[i];
        const name = ad.adName?.length > 30 ? ad.adName.substring(0, 30) + '...' : ad.adName || 'Sem nome';
        lines.push(`${i + 1}️⃣ ${name}`);
        lines.push(`   R$ ${ad.spend.toFixed(2)} investido`);

        if (showsPurchases) {
          const adRoas = ad.spend > 0 ? (ad.totalConversionValue || 0) / ad.spend : 0;
          lines.push(`   🛒 ${ad.purchases || 0} vendas | R$ ${(ad.totalConversionValue || 0).toFixed(2)} | ROAS ${adRoas.toFixed(2)}x`);
        } else if (isMsg) {
          lines.push(`   🤖 ${ad.messaging || 0} msgs | CPMsg R$ ${ad.cpmsg?.toFixed(2) || '-'}`);
          if (ad.leads > 0) lines.push(`   🎯 ${ad.leads} leads | CPL R$ ${ad.cpl.toFixed(2)}`);
        } else {
          lines.push(`   🎯 ${ad.leads} leads | CPL R$ ${ad.cpl.toFixed(2)}`);
          if (messaging > 0 && ad.messaging > 0) {
            lines.push(`   🤖 ${ad.messaging} msgs | CPMsg R$ ${ad.cpmsg.toFixed(2)}`);
          }
        }

        if (ad.ctr > 0) lines.push(`   📊 CTR: ${ad.ctr.toFixed(2)}%`);
        if (i < sortedAds.length - 1) lines.push('');
      }
    }

    lines.push('', `⏳ Dias restantes: ${daysRemaining}`);
    lines.push('', '_Enviado por Growth Ads_');

    const sent = await evoService.sendText(manager.phone, lines.join('\n'));
    if (!sent) throw new Error('Falha ao enviar mensagem pelo WhatsApp.');

    return { success: true, message: `Resumo enviado para ${manager.phone}` };
  }

  private async getCustomConversionTotals(actId: string, since: string, until: string) {
    const sinceDate = new Date(since);
    const untilDate = new Date(until);
    untilDate.setHours(23, 59, 59, 999);

    const conversions = await prisma.clientCustomConversion.findMany({
      where: { clientId: actId },
      select: { customEventId: true, label: true },
    });

    if (conversions.length === 0) return [];

    const results: { label: string; count: number; value: number }[] = [];

    for (const conv of conversions) {
      const agg = await prisma.adCustomConversion.aggregate({
        where: {
          customEventId: conv.customEventId,
          clientId: actId,
          date: { gte: sinceDate, lte: untilDate },
        },
        _sum: { count: true, value: true },
      });

      const count = agg._sum.count || 0;
      const value = Number(agg._sum.value || 0);
      if (count > 0 || value > 0) {
        results.push({ label: conv.label, count, value });
      }
    }

    return results;
  }
}

export default new SummaryService();
