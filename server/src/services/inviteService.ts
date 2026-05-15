import crypto from 'node:crypto';
import inviteRepository from '../repositories/inviteRepository.js';

class InviteService {
  public async create(createdBy: string, plan: string, email?: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return inviteRepository.create({
      id: crypto.randomUUID(),
      token,
      email: email || undefined,
      plan,
      createdBy,
      expiresAt,
    });
  }

  public async verify(token: string) {
    const invite = await inviteRepository.findByToken(token);
    if (!invite) return { valid: false, error: 'Convite inválido.' };
    if (invite.used) return { valid: false, error: 'Convite já utilizado.' };
    if (invite.expiresAt < new Date()) return { valid: false, error: 'Convite expirado.' };
    return { valid: true, invite };
  }

  public async listAll() {
    return inviteRepository.findAll();
  }

  public async revoke(id: string) {
    return inviteRepository.delete(id);
  }
}

export default new InviteService();
