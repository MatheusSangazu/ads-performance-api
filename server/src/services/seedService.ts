import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import managerRepository from '../repositories/managerRepository.js';
import { env } from '../config/env.js';

class SeedService {
  public async seedAdmin() {
    const existing = await managerRepository.findByEmail(env.ADMIN_EMAIL);
    if (existing) {
      console.log('[SEED] Admin já existe, pulando...');
      return;
    }

    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
    await managerRepository.create({
      id: crypto.randomUUID(),
      name: 'Administrador',
      email: env.ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
      plan: 'admin',
    });

    console.log('[SEED] Admin criado com sucesso.');
  }
}

export default new SeedService();
