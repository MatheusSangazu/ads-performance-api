import prisma from '../config/db.js';
import { ManagerRole } from '../generated/prisma/client.js';

export interface CreateManagerData {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  company?: string;
  role: ManagerRole;
  plan?: string;
  maxClients?: number;
  phone?: string;
  whatsappNotify?: boolean;
  healthCheckTimes?: string;
  weeklySummary?: boolean;
}

export interface UpdateManagerData {
  name?: string;
  company?: string;
  passwordHash?: string;
  plan?: string;
  maxClients?: number;
  active?: boolean;
  role?: ManagerRole;
  phone?: string | null;
  whatsappNotify?: boolean;
  healthCheckTimes?: string;
  weeklySummary?: boolean;
}

class ManagerRepository {
  public async create(data: CreateManagerData) {
    return prisma.manager.create({ data });
  }

  public async findById(id: string) {
    return prisma.manager.findUnique({ where: { id } });
  }

  public async findByEmail(email: string) {
    return prisma.manager.findUnique({ where: { email } });
  }

  public async findAll() {
    return prisma.manager.findMany({
      select: {
        id: true, name: true, email: true, company: true,
        role: true, plan: true, maxClients: true, active: true,
        createdAt: true, updatedAt: true,
        _count: { select: { managerClients: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async update(id: string, data: UpdateManagerData) {
    return prisma.manager.update({ where: { id }, data });
  }

  public async softDelete(id: string) {
    return prisma.manager.update({ where: { id }, data: { active: false } });
  }

  public async getClientIds(managerId: string): Promise<string[]> {
    const links = await prisma.managerClient.findMany({
      where: { managerId },
      select: { clientId: true },
    });
    return links.map((l) => l.clientId);
  }

  public async linkClient(managerId: string, clientId: string) {
    return prisma.managerClient.create({ data: { managerId, clientId } });
  }

  public async unlinkClient(managerId: string, clientId: string) {
    return prisma.managerClient.delete({
      where: { managerId_clientId: { managerId, clientId } },
    });
  }

  public async countClients(managerId: string): Promise<number> {
    return prisma.managerClient.count({ where: { managerId } });
  }

  public async hasAccess(managerId: string, clientId: string): Promise<boolean> {
    const link = await prisma.managerClient.findUnique({
      where: { managerId_clientId: { managerId, clientId } },
    });
    return !!link;
  }

  public async findManagersForClient(clientId: string) {
    const links = await prisma.managerClient.findMany({
      where: { clientId },
      select: { manager: { select: { id: true, name: true } } },
    });
    return links.map((l) => l.manager);
  }

  public async findAdminIds(): Promise<string[]> {
    const admins = await prisma.manager.findMany({
      where: { role: 'admin', active: true },
      select: { id: true },
    });
    return admins.map((a) => a.id);
  }
}

export default new ManagerRepository();
