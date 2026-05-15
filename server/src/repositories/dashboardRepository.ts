import prisma from '../config/db.js';

class DashboardRepository {
  public async getOverview(clientIds?: string[]) {
    const clientFilter = clientIds ? { clientId: { in: clientIds } } : {};

    const totalClients = clientIds
      ? clientIds.length
      : await prisma.client.count();

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const performance = await prisma.adPerformance.findMany({
      where: {
        date: { gte: thirtyDaysAgo, lte: today },
        ...clientFilter,
      },
      select: {
        spend: true,
        leads: true,
        linkClicks: true,
        impressions: true,
        reach: true,
        purchases: true,
        purchaseValue: true,
        totalConversionValue: true,
        clientId: true,
        date: true,
      },
    });

    const totalSpend = performance.reduce((sum, p) => sum + Number(p.spend || 0), 0);
    const totalLeads = performance.reduce((sum, p) => sum + (p.leads || 0), 0);
    const totalClicks = performance.reduce((sum, p) => sum + (p.linkClicks || 0), 0);
    const totalImpressions = performance.reduce((sum, p) => sum + (p.impressions || 0), 0);
    const totalReach = performance.reduce((sum, p) => sum + (p.reach || 0), 0);
    const totalPurchases = performance.reduce((sum, p) => sum + (p.purchases || 0), 0);
    const totalPurchaseValue = performance.reduce((sum, p) => sum + Number(p.purchaseValue || 0), 0);
    const totalConversionValue = performance.reduce((sum, p) => sum + Number(p.totalConversionValue || 0), 0);

    const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgRoas = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

    const clientMap = new Map<string, { name: string; spend: number; leads: number; conversionValue: number }>();
    const clients = await prisma.client.findMany({
      where: clientIds ? { actId: { in: clientIds } } : {},
      select: { actId: true, clientName: true },
    });
    const clientNames = new Map(clients.map((c) => [c.actId, c.clientName]));

    for (const p of performance) {
      const existing = clientMap.get(p.clientId) || { name: clientNames.get(p.clientId) || p.clientId, spend: 0, leads: 0, conversionValue: 0 };
      existing.spend += Number(p.spend || 0);
      existing.leads += p.leads || 0;
      existing.conversionValue += Number(p.totalConversionValue || 0);
      clientMap.set(p.clientId, existing);
    }

    const clientMetrics = Array.from(clientMap.entries()).map(([actId, data]) => ({
      actId,
      name: data.name,
      spend: data.spend,
      leads: data.leads,
      conversionValue: data.conversionValue,
      roas: data.spend > 0 ? data.conversionValue / data.spend : 0,
    }));

    const dailyMap = new Map<string, { spend: number; leads: number; clicks: number; conversionValue: number }>();
    for (const p of performance) {
      const dateKey = p.date.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { spend: 0, leads: 0, clicks: 0, conversionValue: 0 };
      existing.spend += Number(p.spend || 0);
      existing.leads += p.leads || 0;
      existing.clicks += p.linkClicks || 0;
      existing.conversionValue += Number(p.totalConversionValue || 0);
      dailyMap.set(dateKey, existing);
    }

    const dailyMetrics = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalClients,
      totalSpend,
      totalLeads,
      totalClicks,
      totalImpressions,
      totalReach,
      totalPurchases,
      totalPurchaseValue,
      totalConversionValue,
      avgCpl,
      avgCpc,
      avgCpm,
      avgCtr,
      avgRoas,
      clientMetrics,
      dailyMetrics,
      period: { since: thirtyDaysAgo.toISOString().split('T')[0], until: today.toISOString().split('T')[0] },
    };
  }
}

export default new DashboardRepository();
