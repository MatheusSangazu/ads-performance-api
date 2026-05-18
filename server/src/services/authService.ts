import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import managerRepository from '../repositories/managerRepository.js';
import refreshTokenRepository from '../repositories/refreshTokenRepository.js';
import inviteRepository from '../repositories/inviteRepository.js';
import { ManagerRole } from '../generated/prisma/client.js';
import { env } from '../config/env.js';

interface TokenPayload {
  sub: string;
  role: ManagerRole;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  private parseExpiry(exp: string): number {
    const match = exp.match(/^(\d+)([smhd])$/);
    if (!match) return 900;
    const [, val, unit] = match;
    const n = parseInt(val, 10);
    switch (unit) {
      case 's': return n;
      case 'm': return n * 60;
      case 'h': return n * 3600;
      case 'd': return n * 86400;
      default: return 900;
    }
  }

  private generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
  }

  private async generateRefreshToken(managerId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresSeconds = this.parseExpiry(env.JWT_REFRESH_EXPIRES_IN);

    await refreshTokenRepository.create({
      id: crypto.randomUUID(),
      managerId,
      tokenHash,
      expiresAt: new Date(Date.now() + expiresSeconds * 1000),
    });

    return token;
  }

  public async generateTokens(managerId: string, role: ManagerRole): Promise<AuthTokens> {
    const accessToken = this.generateAccessToken({ sub: managerId, role });
    const refreshToken = await this.generateRefreshToken(managerId);

    return { accessToken, refreshToken };
  }

  public async login(email: string, password: string) {
    const manager = await managerRepository.findByEmail(email);
    if (!manager) throw new Error('Email ou senha inválidos.');
    if (!manager.active) throw new Error('Conta desativada. Contate o administrador.');

    const valid = await bcrypt.compare(password, manager.passwordHash);
    if (!valid) throw new Error('Email ou senha inválidos.');

    const tokens = await this.generateTokens(manager.id, manager.role);
    return {
      ...tokens,
      manager: {
        id: manager.id, name: manager.name, email: manager.email,
        company: manager.company, role: manager.role, plan: manager.plan,
      },
    };
  }

  public async register(token: string, name: string, email: string, password: string) {
    const invite = await inviteRepository.findByToken(token);
    if (!invite) throw new Error('Convite inválido.');
    if (invite.used) throw new Error('Convite já foi utilizado.');
    if (invite.expiresAt < new Date()) throw new Error('Convite expirado.');
    if (invite.email && invite.email !== email) throw new Error('Este convite não corresponde ao email informado.');

    const existing = await managerRepository.findByEmail(email);
    if (existing) throw new Error('Email já cadastrado.');

    const passwordHash = await bcrypt.hash(password, 10);
    const manager = await managerRepository.create({
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash,
      plan: invite.plan,
      role: 'manager' as ManagerRole,
      agencyId: invite.createdBy,
    });

    await inviteRepository.markUsed(invite.id, manager.id);
    const tokens = await this.generateTokens(manager.id, manager.role);

    return {
      ...tokens,
      manager: {
        id: manager.id, name: manager.name, email: manager.email,
        company: manager.company, role: manager.role, plan: manager.plan,
      },
    };
  }

  public async refresh(token: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const stored = await refreshTokenRepository.findByTokenHash(tokenHash);

    if (!stored) {
      throw new Error('Refresh token inválido.');
    }

    if (stored.expiresAt < new Date()) {
      await refreshTokenRepository.delete(stored.id);
      throw new Error('Refresh token expirado.');
    }

    if (!stored.manager.active) throw new Error('Conta desativada.');

    try {
      await refreshTokenRepository.delete(stored.id);
    } catch {
      await refreshTokenRepository.deleteAllByManager(stored.managerId);
      console.error(`[SECURITY] Possível reuso de refresh token detectado para manager ${stored.managerId}. Todos os tokens revogados.`);
      throw new Error('Token reutilizado. Por segurança, faça login novamente.');
    }

    return this.generateTokens(stored.manager.id, stored.manager.role);
  }

  public async logout(token: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const stored = await refreshTokenRepository.findByTokenHash(tokenHash);
    if (stored) await refreshTokenRepository.delete(stored.id);
  }

  public verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  }

  public async updateProfile(managerId: string, data: { 
    name?: string; 
    company?: string; 
    password?: string; 
    phone?: string; 
    whatsappNotify?: boolean;
    healthCheckTimes?: string;
    weeklySummary?: boolean;
  }) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.company) updateData.company = data.company;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.whatsappNotify !== undefined) updateData.whatsappNotify = data.whatsappNotify;
    if (data.healthCheckTimes !== undefined) updateData.healthCheckTimes = data.healthCheckTimes;
    if (data.weeklySummary !== undefined) updateData.weeklySummary = data.weeklySummary;
    return managerRepository.update(managerId, updateData);
  }
}

export default new AuthService();
