import prisma from '../config/db.js';
import { fetchAccountBalance } from '../integrations/metaApi.js';
import clientRepository from '../repositories/clientRepository.js';

class BalanceService {
  public async getBalance(actId: string) {
    const client = await prisma.client.findUnique({
      where: { actId },
      select: {
        isBoleto: true,
        balanceThreshold: true,
        currentBalance: true,
        balanceUpdatedAt: true,
      },
    });
    if (!client) return null;

    return {
      actId,
      isBoleto: client.isBoleto,
      balanceThreshold: client.balanceThreshold ? Number(client.balanceThreshold) : null,
      currentBalance: client.currentBalance ? Number(client.currentBalance) : null,
      balanceUpdatedAt: client.balanceUpdatedAt?.toISOString() || null,
    };
  }

  public async refreshBalance(actId: string) {
    const client = await clientRepository.findByActId(actId);
    if (!client) return null;

    const balanceData = await fetchAccountBalance(actId, client.accessToken);
    if (!balanceData) return null;

    await prisma.client.update({
      where: { actId },
      data: {
        currentBalance: balanceData.balance,
        balanceUpdatedAt: new Date(),
      },
    });

    return {
      actId,
      spendCap: balanceData.spendCap,
      currentBalance: balanceData.balance,
      currency: balanceData.currency,
    };
  }

  public async updateSettings(
    actId: string,
    data: { isBoleto?: boolean; balanceThreshold?: number },
  ) {
    const updateData: any = {};
    if (data.isBoleto !== undefined) updateData.isBoleto = data.isBoleto;
    if (data.balanceThreshold !== undefined) updateData.balanceThreshold = data.balanceThreshold;

    await prisma.client.update({
      where: { actId },
      data: updateData,
    });

    return { success: true, message: 'Configurações de saldo atualizadas.' };
  }

  public async checkAllBoletoAccounts() {
    const clients = await prisma.client.findMany({
      where: {
        isBoleto: true,
        status: 'active',
      },
      select: {
        actId: true,
        clientName: true,
        accessToken: true,
        balanceThreshold: true,
        currentBalance: true,
      },
    });

    const alerts: { actId: string; clientName: string; balance: number; threshold: number }[] = [];

    for (const client of clients) {
      if (!client.accessToken) continue;

      const balanceData = await fetchAccountBalance(client.actId, client.accessToken);
      if (!balanceData || balanceData.balance === null) continue;

      await prisma.client.update({
        where: { actId: client.actId },
        data: {
          currentBalance: balanceData.balance,
          balanceUpdatedAt: new Date(),
        },
      });

      const threshold = client.balanceThreshold ? Number(client.balanceThreshold) : null;
      if (threshold !== null && balanceData.balance < threshold) {
        alerts.push({
          actId: client.actId,
          clientName: client.clientName,
          balance: balanceData.balance,
          threshold,
        });
      }
    }

    return alerts;
  }
}

export default new BalanceService();
