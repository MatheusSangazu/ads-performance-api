import type { Response } from 'express';
import prisma from '../config/db.js';
import type { AuthRequest } from '../middleware/auth.js';

const METRIC_DB_MAP: Record<string, string> = {
  leads: 'leads',
  cpl: 'leads',
  roas: 'roas',
  ctr: 'ctr',
  clicks: 'linkClicks',
  impressions: 'impressions',
  purchases: 'purchases',
  purchase_value: 'purchaseValue',
  messaging: 'messagingConversations',
  cpmsg: 'messagingConversations',
};

class ProjectionController {
  public async getProjection(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const window = parseInt(req.query.window as string) || 14;

    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const goals = await prisma.clientGoal.findMany({
      where: { clientId: actId, month: currentMonth },
    });

    if (goals.length === 0) {
      res.json({ goals: [], projection: null });
      return;
    }

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = daysInMonth - currentDay;

    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - window);
    windowStart.setHours(0, 0, 0, 0);

    const performance = await prisma.adPerformance.findMany({
      where: {
        clientId: actId,
        date: { gte: windowStart, lte: now },
      },
      select: {
        date: true,
        leads: true,
        linkClicks: true,
        impressions: true,
        reach: true,
        spend: true,
        ctr: true,
        purchases: true,
        purchaseValue: true,
        roas: true,
        messagingConversations: true,
      },
    });

    const monthPerformance = await prisma.adPerformance.findMany({
      where: {
        clientId: actId,
        date: { gte: currentMonth, lte: now },
      },
      select: {
        date: true,
        leads: true,
        linkClicks: true,
        impressions: true,
        reach: true,
        spend: true,
        ctr: true,
        purchases: true,
        purchaseValue: true,
        roas: true,
        messagingConversations: true,
      },
    });

    const sumField = (data: typeof performance, field: string): number => {
      return data.reduce((sum, p) => {
        const val = (p as any)[field];
        return sum + (typeof val === 'number' ? val : Number(val || 0));
      }, 0);
    };

    const avgDaily = (data: typeof performance, field: string): number => {
      if (data.length === 0) return 0;
      const total = sumField(data, field);
      const uniqueDays = new Set(data.map((p) => p.date.toISOString().split('T')[0])).size;
      return uniqueDays > 0 ? total / uniqueDays : 0;
    };

    const dailyMap = new Map<string, Record<string, number>>();
    for (const p of monthPerformance) {
      const dateKey = p.date.toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { leads: 0, linkClicks: 0, impressions: 0, spend: 0, purchases: 0, purchaseValue: 0, messagingConversations: 0 });
      }
      const d = dailyMap.get(dateKey)!;
      d.leads += p.leads || 0;
      d.linkClicks += p.linkClicks || 0;
      d.impressions += p.impressions || 0;
      d.spend += Number(p.spend || 0);
      d.purchases += p.purchases || 0;
      d.purchaseValue += Number(p.purchaseValue || 0);
      (d as any).messagingConversations += p.messagingConversations || 0;
    }

    const burndownData: { date: string; actual: number; target: number }[] = [];
    const primaryGoal = goals[0];
    const metricField = METRIC_DB_MAP[primaryGoal.metric] || primaryGoal.metric;
    const monthlyTarget = Number(primaryGoal.targetValue);
    const dailyTarget = monthlyTarget / daysInMonth;

    let cumulativeActual = 0;
    const sortedDays = Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    for (const [date, d] of sortedDays) {
      const dayNum = parseInt(date.split('-')[2]);
      const val = (d as any)[metricField] || 0;
      cumulativeActual += val;
      burndownData.push({
        date,
        actual: cumulativeActual,
        target: Math.round(dailyTarget * dayNum * 100) / 100,
      });
    }

    for (let day = currentDay + 1; day <= daysInMonth; day++) {
      const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
      burndownData.push({
        date: dateStr,
        actual: -1,
        target: Math.round(dailyTarget * day * 100) / 100,
      });
    }

    const projections = goals.map((goal) => {
      const field = METRIC_DB_MAP[goal.metric] || goal.metric;
      const target = Number(goal.targetValue);

      if (goal.metric === 'cpl') {
        const totalLeads = sumField(monthPerformance, 'leads');
        const totalSpend = sumField(monthPerformance, 'spend');
        const currentCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
        const avgDailyLeads = avgDaily(performance, 'leads');
        const avgDailySpend = avgDaily(performance, 'spend');
        const projectedLeads = totalLeads + avgDailyLeads * daysRemaining;
        const projectedSpend = totalSpend + avgDailySpend * daysRemaining;
        const projectedCpl = projectedLeads > 0 ? projectedSpend / projectedLeads : 0;
        const neededDailyLeads = currentCpl > 0 && target > 0
          ? (target * totalLeads - totalSpend) / ((target - avgDailySpend / (avgDailyLeads || 1)) * daysRemaining)
          : 0;

        return {
          metric: goal.metric,
          target,
          current: Math.round(currentCpl * 100) / 100,
          projected: Math.round(projectedCpl * 100) / 100,
          avgDaily: Math.round(avgDailySpend / (avgDailyLeads || 1) * 100) / 100,
          neededDaily: Math.round(Math.abs(neededDailyLeads) * 100) / 100,
          daysRemaining,
          onTrack: currentCpl <= target,
        };
      }

      if (goal.metric === 'cpmsg') {
        const totalMessaging = sumField(monthPerformance, 'messagingConversations');
        const totalSpend = sumField(monthPerformance, 'spend');
        const currentCpmsg = totalMessaging > 0 ? totalSpend / totalMessaging : 0;
        const avgDailyMsg = avgDaily(performance, 'messagingConversations');
        const avgDailySpend = avgDaily(performance, 'spend');
        const projectedMsg = totalMessaging + avgDailyMsg * daysRemaining;
        const projectedSpend = totalSpend + avgDailySpend * daysRemaining;
        const projectedCpmsg = projectedMsg > 0 ? projectedSpend / projectedMsg : 0;

        return {
          metric: goal.metric,
          target,
          current: Math.round(currentCpmsg * 100) / 100,
          projected: Math.round(projectedCpmsg * 100) / 100,
          avgDaily: Math.round(avgDailySpend / (avgDailyMsg || 1) * 100) / 100,
          neededDaily: 0,
          daysRemaining,
          onTrack: currentCpmsg <= target,
        };
      }

      if (goal.metric === 'roas') {
        const totalSpend = sumField(monthPerformance, 'spend');
        const totalConvValue = sumField(monthPerformance, 'purchaseValue');
        const currentRoas = totalSpend > 0 ? totalConvValue / totalSpend : 0;
        const avgDailySpend = avgDaily(performance, 'spend');
        const avgDailyValue = avgDaily(performance, 'purchaseValue');
        const projectedSpend = totalSpend + avgDailySpend * daysRemaining;
        const projectedValue = totalConvValue + avgDailyValue * daysRemaining;
        const projectedRoas = projectedSpend > 0 ? projectedValue / projectedSpend : 0;

        return {
          metric: goal.metric,
          target,
          current: Math.round(currentRoas * 100) / 100,
          projected: Math.round(projectedRoas * 100) / 100,
          avgDaily: Math.round(avgDailyValue * 100) / 100,
          neededDaily: 0,
          daysRemaining,
          onTrack: currentRoas >= target,
        };
      }

      const current = sumField(monthPerformance, field);
      const dailyAvg = avgDaily(performance, field);
      const projected = current + dailyAvg * daysRemaining;
      const neededPerDay = daysRemaining > 0 ? Math.max(0, target - current) / daysRemaining : 0;

      return {
        metric: goal.metric,
        target,
        current,
        projected: Math.round(projected * 100) / 100,
        avgDaily: Math.round(dailyAvg * 100) / 100,
        neededDaily: Math.round(neededPerDay * 100) / 100,
        daysRemaining,
        onTrack: projected >= target,
      };
    });

    res.json({
      month: monthStr,
      daysInMonth,
      currentDay,
      daysRemaining,
      window,
      goals: projections,
      burndown: burndownData,
    });
  }
}

export default new ProjectionController();
