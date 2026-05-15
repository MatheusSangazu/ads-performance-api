import prisma from '../config/db.js';

class BudgetRepository {
  public async upsert(managerId: string, clientId: string, month: string, budgetAmount: number) {
    const monthDate = new Date(month + '-01');
    return prisma.clientBudget.upsert({
      where: {
        managerId_clientId_month: { managerId, clientId, month: monthDate },
      },
      update: { budgetAmount },
      create: { id: crypto.randomUUID(), managerId, clientId, month: monthDate, budgetAmount },
    });
  }

  public async findCurrent(managerId: string, clientId: string) {
    const now = new Date();
    const monthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    return prisma.clientBudget.findUnique({
      where: {
        managerId_clientId_month: { managerId, clientId, month: monthDate },
      },
    });
  }

  public async findHistory(managerId: string, clientId: string) {
    return prisma.clientBudget.findMany({
      where: { managerId, clientId },
      orderBy: { month: 'desc' },
      take: 12,
    });
  }

  public async delete(managerId: string, clientId: string, month: string) {
    const monthDate = new Date(month + '-01');
    return prisma.clientBudget.delete({
      where: {
        managerId_clientId_month: { managerId, clientId, month: monthDate },
      },
    });
  }
}

export default new BudgetRepository();
