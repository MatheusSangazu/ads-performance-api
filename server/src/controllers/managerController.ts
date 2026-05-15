import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import managerRepository from '../repositories/managerRepository.js';
import { ManagerRole } from '../generated/prisma/client.js';

class ManagerController {
  public async list(_req: AuthRequest, res: Response) {
    try {
      const managers = await managerRepository.findAll();
      res.json(managers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async getById(req: AuthRequest, res: Response) {
    try {
      const manager = await managerRepository.findById(req.params.id);
      if (!manager) {
        res.status(404).json({ error: 'Gestor não encontrado.' });
        return;
      }
      res.json(manager);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async update(req: AuthRequest, res: Response) {
    try {
      const { plan, maxClients, active, role } = req.body;
      const data: any = {};
      if (plan !== undefined) data.plan = plan;
      if (maxClients !== undefined) data.maxClients = maxClients;
      if (active !== undefined) data.active = active;
      if (role !== undefined && Object.values(ManagerRole).includes(role)) data.role = role;

      const manager = await managerRepository.update(req.params.id, data);
      res.json(manager);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  public async deactivate(req: AuthRequest, res: Response) {
    try {
      await managerRepository.softDelete(req.params.id);
      res.json({ message: 'Gestor desativado.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  public async linkClient(req: AuthRequest, res: Response) {
    try {
      await managerRepository.linkClient(req.params.id, req.params.actId);
      res.json({ message: 'Cliente vinculado ao gestor.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  public async unlinkClient(req: AuthRequest, res: Response) {
    try {
      await managerRepository.unlinkClient(req.params.id, req.params.actId);
      res.json({ message: 'Cliente desvinculado do gestor.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default new ManagerController();
