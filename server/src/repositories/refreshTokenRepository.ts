import prisma from '../config/db.js';

class RefreshTokenRepository {
  public async create(data: { id: string; managerId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data });
  }

  public async findByTokenHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash }, include: { manager: true } });
  }

  public async delete(id: string) {
    return prisma.refreshToken.delete({ where: { id } });
  }

  public async deleteAllByManager(managerId: string) {
    return prisma.refreshToken.deleteMany({ where: { managerId } });
  }

  public async deleteExpired() {
    return prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}

export default new RefreshTokenRepository();
