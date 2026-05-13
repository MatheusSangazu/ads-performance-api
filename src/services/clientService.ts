import prisma from '../config/db.js';

class ClientService {
  public async saveClient(name: string, actId: string, token: string, customEventId?: string, isEcommerce: boolean = false) {
    await prisma.client.upsert({
      where: { actId },
      update: {
        clientName: name,
        accessToken: token,
        customEventId: customEventId || null,
        isEcommerce,
      },
      create: {
        clientName: name,
        actId,
        accessToken: token,
        customEventId: customEventId || null,
        isEcommerce,
      },
    });

    return { success: true, message: `Cliente ${name} configurado com sucesso!` };
  }

  public async listClients() {
    return prisma.client.findMany({
      select: {
        clientName: true,
        actId: true,
        customEventId: true,
      },
    });
  }
}

export default new ClientService();
