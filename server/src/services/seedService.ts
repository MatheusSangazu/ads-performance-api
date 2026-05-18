import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import managerRepository from '../repositories/managerRepository.js';
import prisma from '../config/db.js';
import { env } from '../config/env.js';

class SeedService {
  public async seedAdmin() {
    const existing = await managerRepository.findByEmail(env.ADMIN_EMAIL);
    if (existing) {
      console.log('[SEED] Admin já existe, pulando...');
      await this.fixAdminPlan(existing.id);
      return;
    }

    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
    await managerRepository.create({
      id: crypto.randomUUID(),
      name: 'Administrador',
      email: env.ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
      plan: 'pro',
    });

    console.log('[SEED] Admin criado com sucesso.');
  }

  private async fixAdminPlan(adminId: string) {
    const admin = await prisma.manager.findUnique({
      where: { id: adminId },
      select: { plan: true },
    });

    if (admin?.plan === 'admin') {
      await prisma.manager.update({
        where: { id: adminId },
        data: { plan: 'pro' },
      });
      console.log('[SEED] Plano do admin corrigido para "pro".');
    }

    const allClientIds = await prisma.client.findMany({ select: { actId: true } });
    const existingLinks = await prisma.managerClient.findMany({
      where: { managerId: adminId },
      select: { clientId: true },
    });
    const linkedIds = new Set(existingLinks.map((l) => l.clientId));
    const unlinked = allClientIds.filter((c) => !linkedIds.has(c.actId));

    if (unlinked.length > 0) {
      await prisma.managerClient.createMany({
        data: unlinked.map((c) => ({ managerId: adminId, clientId: c.actId })),
      });
      console.log(`[SEED] ${unlinked.length} cliente(s) vinculado(s) ao admin.`);
    }
  }
}

export default new SeedService();
