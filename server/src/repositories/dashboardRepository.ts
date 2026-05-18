import prisma from '../config/db.js';

class DashboardRepository {
  public async getOverview(clientIds: string[] | null, filters?: { since?: string; until?: string; specificClientId?: string }) {
    const isAdmin = clientIds === null;

    const clientFilter = filters?.specificClientId 
      ? { clientId: filters.specificClientId }
      : !isAdmin && clientIds?.length
        ? { clientId: { in: clientIds } }
        : isAdmin
          ? {}
          : { clientId: { in: [] as string[] } };

    const totalClients = isAdmin
      ? await prisma.client.count()
      : clientIds!.length;

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const since = filters?.since ? new Date(filters.since) : thirtyDaysAgo;
    const until = filters?.until ? new Date(filters.until) : today;

    // Ensure until includes the full day
    const untilEnd = new Date(until);
    untilEnd.setHours(23, 59, 59, 999);

    const performance = await prisma.adPerformance.findMany({
      where: {
        date: { gte: since, lte: untilEnd },
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

    const clientMap = new Map<string, { name: string; spend: number; leads: number; conversionValue: number; purchases: number }>();
    const clients = await prisma.client.findMany({
      where: filters?.specificClientId 
        ? { actId: filters.specificClientId }
        : !isAdmin && clientIds?.length
          ? { actId: { in: clientIds } }
          : isAdmin
            ? {}
            : { actId: { in: [] as string[] } },
      select: { actId: true, clientName: true },
    });
    const clientNames = new Map(clients.map((c) => [c.actId, c.clientName]));

    for (const p of performance) {
      const existing = clientMap.get(p.clientId) || { name: clientNames.get(p.clientId) || p.clientId, spend: 0, leads: 0, conversionValue: 0, purchases: 0 };
      existing.spend += Number(p.spend || 0);
      existing.leads += p.leads || 0;
      existing.conversionValue += Number(p.totalConversionValue || 0);
      existing.purchases += p.purchases || 0;
      clientMap.set(p.clientId, existing);
    }

    const clientMetrics = Array.from(clientMap.entries()).map(([actId, data]) => ({
      actId,
      name: data.name,
      spend: data.spend,
      leads: data.leads,
      conversionValue: data.conversionValue,
      purchases: data.purchases,
      roas: data.spend > 0 ? data.conversionValue / data.spend : 0,
    }));

    const dailyMap = new Map<string, { spend: number; leads: number; clicks: number; conversionValue: number; purchases: number }>();
    for (const p of performance) {
      const dateKey = p.date.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { spend: 0, leads: 0, clicks: 0, conversionValue: 0, purchases: 0 };
      existing.spend += Number(p.spend || 0);
      existing.leads += p.leads || 0;
      existing.clicks += p.linkClicks || 0;
      existing.conversionValue += Number(p.totalConversionValue || 0);
      existing.purchases += p.purchases || 0;
      dailyMap.set(dateKey, existing);
    }

    const dailyMetrics = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Fetch goals if a specific client is selected
    let goals: any[] = [];
    if (filters?.specificClientId) {
      const currentMonth = new Date(until.getFullYear(), until.getMonth(), 1);
      goals = await prisma.clientGoal.findMany({
        where: { clientId: filters.specificClientId, month: currentMonth },
      });
    }

    const topAdsRaw = await prisma.adPerformance.findMany({
      where: {
        date: { gte: since, lte: untilEnd },
        ...clientFilter,
      },
      select: {
        adId: true,
        adName: true,
        campaignName: true,
        previewLink: true,
        creativeUrl: true,
        creativeType: true,
        spend: true,
        leads: true,
        linkClicks: true,
        impressions: true,
        purchases: true,
        totalConversionValue: true,
        roas: true,
        ctr: true,
      },
    });

    const adAgg = new Map<string, {
      adId: string; adName: string; campaignName: string; previewLink: string;
      spend: number; leads: number; linkClicks: number; impressions: number;
      purchases: number; totalConversionValue: number;
    }>();
    for (const r of topAdsRaw) {
      const existing = adAgg.get(r.adId) || {
        adId: r.adId, adName: r.adName || '', campaignName: r.campaignName || '',
        previewLink: r.previewLink || '', creativeUrl: r.creativeUrl || '', creativeType: r.creativeType || '', spend: 0, leads: 0, linkClicks: 0,
        impressions: 0, purchases: 0, totalConversionValue: 0,
      };
      existing.spend += Number(r.spend || 0);
      existing.leads += r.leads || 0;
      existing.linkClicks += r.linkClicks || 0;
      existing.impressions += r.impressions || 0;
      existing.purchases += r.purchases || 0;
      existing.totalConversionValue += Number(r.totalConversionValue || 0);
      if (!existing.previewLink && r.previewLink) existing.previewLink = r.previewLink;
      adAgg.set(r.adId, existing);
    }

    const topAds = Array.from(adAgg.values()).map((a) => ({
      ...a,
      roas: a.spend > 0 ? a.totalConversionValue / a.spend : 0,
      cpl: a.leads > 0 ? a.spend / a.leads : 0,
      ctr: a.impressions > 0 ? (a.linkClicks / a.impressions) * 100 : 0,
    }));

    let audienceData: any[] = [];
    let placementData: any[] = [];
    let regionData: any[] = [];

    if (filters?.specificClientId || isAdmin || (clientIds && clientIds.length > 0)) {
      const breakdownFilter = {
        date: { gte: since, lte: untilEnd },
        ...(filters?.specificClientId
          ? { clientId: filters.specificClientId }
          : isAdmin
            ? {}
            : clientIds?.length
              ? { clientId: { in: clientIds } }
              : { clientId: { in: [] as string[] } }),
      };

      const audienceRows = await prisma.adAudiencePerformance.findMany({
        where: breakdownFilter,
        select: { gender: true, ageRange: true, spend: true, leads: true, impressions: true },
      });
      const audienceAgg = new Map<string, { gender: string; ageRange: string; spend: number; leads: number; impressions: number }>();
      for (const r of audienceRows) {
        const key = `${r.gender}|${r.ageRange}`;
        const existing = audienceAgg.get(key) || { gender: r.gender, ageRange: r.ageRange, spend: 0, leads: 0, impressions: 0 };
        existing.spend += Number(r.spend || 0);
        existing.leads += r.leads || 0;
        existing.impressions += r.impressions || 0;
        audienceAgg.set(key, existing);
      }
      audienceData = Array.from(audienceAgg.values());

      const placementRows = await prisma.adPlacementPerformance.findMany({
        where: breakdownFilter,
        select: { platform: true, spend: true, leads: true, impressions: true },
      });
      const placementAgg = new Map<string, { platform: string; spend: number; leads: number; impressions: number }>();
      for (const r of placementRows) {
        const existing = placementAgg.get(r.platform) || { platform: r.platform, spend: 0, leads: 0, impressions: 0 };
        existing.spend += Number(r.spend || 0);
        existing.leads += r.leads || 0;
        existing.impressions += r.impressions || 0;
        placementAgg.set(r.platform, existing);
      }
      placementData = Array.from(placementAgg.values());

      const regionRows = await prisma.adRegionPerformance.findMany({
        where: breakdownFilter,
        select: { region: true, spend: true, leads: true },
      });
      const regionAgg = new Map<string, { region: string; spend: number; leads: number }>();
      for (const r of regionRows) {
        const existing = regionAgg.get(r.region) || { region: r.region, spend: 0, leads: 0 };
        existing.spend += Number(r.spend || 0);
        existing.leads += r.leads || 0;
        regionAgg.set(r.region, existing);
      }
      regionData = Array.from(regionAgg.values())
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 10);
    }

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
      goals,
      topAds,
      audienceData,
      placementData,
      regionData,
      period: { 
        since: since.toISOString().split('T')[0], 
        until: until.toISOString().split('T')[0] 
      },
    };
  }
}

export default new DashboardRepository();
