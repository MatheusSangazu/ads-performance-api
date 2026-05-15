import prisma from '../config/db.js';
import type { GoalMetric } from '../generated/prisma/client.js';

class GoalRepository {
  public async upsert(
    managerId: string,
    clientId: string,
    metric: GoalMetric,
    targetValue: number,
    month: string,
  ) {
    const monthDate = new Date(month + '-01');
    return prisma.clientGoal.upsert({
      where: {
        managerId_clientId_metric_month: { managerId, clientId, metric, month: monthDate },
      },
      update: { targetValue },
      create: {
        id: crypto.randomUUID(),
        managerId,
        clientId,
        metric,
        targetValue,
        month: monthDate,
      },
    });
  }

  public async findCurrent(managerId: string, clientId: string) {
    const now = new Date();
    const monthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    return prisma.clientGoal.findMany({
      where: { managerId, clientId, month: monthDate },
    });
  }

  public async findById(id: string) {
    return prisma.clientGoal.findUnique({ where: { id } });
  }

  public async delete(id: string) {
    return prisma.clientGoal.delete({ where: { id } });
  }
}

export default new GoalRepository();
