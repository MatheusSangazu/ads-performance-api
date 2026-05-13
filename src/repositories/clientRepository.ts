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

  public async deleteByActId(actId: string) {
    await prisma.adAudiencePerformance.deleteMany({ where: { clientId: actId } });
    await prisma.adPlacementPerformance.deleteMany({ where: { clientId: actId } });
    await prisma.adRegionPerformance.deleteMany({ where: { clientId: actId } });
    await prisma.adPerformance.deleteMany({ where: { clientId: actId } });
    return prisma.client.delete({ where: { actId } });
  }
}

export default new ClientRepository();
