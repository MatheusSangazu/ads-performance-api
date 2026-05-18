import prisma from '../config/db.js';

export interface CreateInviteData {
  id: string;
  token: string;
  email?: string;
  plan: string;
  createdBy: string;
  expiresAt: Date;
}

class InviteRepository {
  public async create(data: CreateInviteData) {
    return prisma.invite.create({ data });
  }

  public async findByToken(token: string) {
    return prisma.invite.findUnique({ where: { token } });
  }

  public async markUsed(id: string, usedById: string) {
    return prisma.invite.update({
      where: { id },
      data: { used: true, usedById, usedAt: new Date() },
    });
  }

  public async findAll() {
    return prisma.invite.findMany({
      select: {
        id: true, token: true, email: true, plan: true,
        used: true, usedAt: true, expiresAt: true, createdAt: true,
        creator: { select: { id: true, name: true } },
        usedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async delete(id: string) {
    return prisma.invite.delete({ where: { id } });
  }
}

export default new InviteRepository();
