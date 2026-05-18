import prisma from '../config/db.js';

class ClientRepository {
  public async findByActId(actId: string) {
    return prisma.client.findUnique({ where: { actId } });
  }

  public async upsert(data: {
    name: string;
    actId: string;
    token: string;
    customEventId?: string;
    isEcommerce: boolean;
  }) {
    return prisma.client.upsert({
      where: { actId: data.actId },
      update: {
        clientName: data.name,
        accessToken: data.token,
        customEventId: data.customEventId || null,
        isEcommerce: data.isEcommerce,
      },
      create: {
        clientName: data.name,
        actId: data.actId,
        accessToken: data.token,
        customEventId: data.customEventId || null,
        isEcommerce: data.isEcommerce,
      },
    });
  }

  public async listAll() {
    return prisma.client.findMany({
      select: {
        clientName: true,
        actId: true,
        customEventId: true,
      },
    });
  }

  public async updateToken(actId: string, token: string) {
    return prisma.client.update({
      where: { actId },
      data: { accessToken: token },
    });
  }

  public async updateClient(
    oldActId: string,
    data: { actId?: string; clientName?: string; customEventId?: string },
  ) {
    const newActId = data.actId?.startsWith('act_') ? data.actId : data.actId ? `act_${data.actId}` : undefined;

    if (newActId && newActId !== oldActId) {
      return prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');

        await tx.adPerformance.updateMany({ where: { clientId: oldActId }, data: { clientId: newActId } });
        await tx.adAudiencePerformance.updateMany({ where: { clientId: oldActId }, data: { clientId: newActId } });
        await tx.adPlacementPerformance.updateMany({ where: { clientId: oldActId }, data: { clientId: newActId } });
        await tx.adRegionPerformance.updateMany({ where: { clientId: oldActId }, data: { clientId: newActId } });
        await tx.managerClient.updateMany({ where: { clientId: oldActId }, data: { clientId: newActId } });
        await tx.clientBudget.updateMany({ where: { clientId: oldActId }, data: { clientId: newActId } });
        await tx.clientGoal.updateMany({ where: { clientId: oldActId }, data: { clientId: newActId } });
        await tx.alert.updateMany({ where: { clientId: oldActId }, data: { clientId: newActId } });
        await tx.task.updateMany({ where: { clientId: oldActId }, data: { clientId: newActId } });

        await tx.client.update({
          where: { actId: oldActId },
          data: {
            actId: newActId,
            ...(data.clientName && { clientName: data.clientName }),
            ...(data.customEventId !== undefined && { customEventId: data.customEventId || null }),
          },
        });

        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
      });
    }

    return prisma.client.update({
      where: { actId: oldActId },
      data: {
        ...(data.clientName && { clientName: data.clientName }),
        ...(data.customEventId !== undefined && { customEventId: data.customEventId || null }),
      },
    });
  }

  public async deleteByActId(actId: string) {
    await prisma.$transaction(async (tx) => {
      await tx.alert.deleteMany({ where: { clientId: actId } });
      await tx.task.deleteMany({ where: { clientId: actId } });
      await tx.clientGoal.deleteMany({ where: { clientId: actId } });
      await tx.clientBudget.deleteMany({ where: { clientId: actId } });
      await tx.managerClient.deleteMany({ where: { clientId: actId } });
      await tx.adAudiencePerformance.deleteMany({ where: { clientId: actId } });
      await tx.adPlacementPerformance.deleteMany({ where: { clientId: actId } });
      await tx.adRegionPerformance.deleteMany({ where: { clientId: actId } });
      await tx.adPerformance.deleteMany({ where: { clientId: actId } });
      await tx.client.delete({ where: { actId } });
    });
  }
}

export default new ClientRepository();
