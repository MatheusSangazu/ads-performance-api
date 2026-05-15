import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import authService from '../services/authService.js';
import managerRepository from '../repositories/managerRepository.js';

class AuthController {
  public async login(req: AuthRequest, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email e senha são obrigatórios.' });
        return;
      }
      const result = await authService.login(email, password);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  }

  public async register(req: AuthRequest, res: Response) {
    try {
      const { token } = req.params;
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres.' });
        return;
      }
      const result = await authService.register(token, name, email, password);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  public async refresh(req: AuthRequest, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token é obrigatório.' });
        return;
      }
      const tokens = await authService.refresh(refreshToken);
      res.json(tokens);
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  }

  public async logout(req: AuthRequest, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) await authService.logout(refreshToken);
      res.json({ message: 'Logout realizado com sucesso.' });
    } catch {
      res.json({ message: 'Logout realizado.' });
    }
  }

  public async me(req: AuthRequest, res: Response) {
    try {
      const manager = await managerRepository.findById(req.manager!.id);
      if (!manager) {
        res.status(404).json({ error: 'Gestor não encontrado.' });
        return;
      }
      res.json({
        id: manager.id, name: manager.name, email: manager.email,
        company: manager.company, role: manager.role, plan: manager.plan, active: manager.active,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, company, password } = req.body;
      if (password && password.length < 6) {
        res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres.' });
        return;
      }
      const manager = await authService.updateProfile(req.manager!.id, { name, company, password });
      res.json({
        id: manager.id, name: manager.name, email: manager.email,
        company: manager.company, role: manager.role, plan: manager.plan,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default new AuthController();
