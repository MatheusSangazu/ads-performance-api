import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import inviteService from '../services/inviteService.js';

class InviteController {
  public async create(req: AuthRequest, res: Response) {
    try {
      const { email, plan } = req.body;
      if (!plan) {
        res.status(400).json({ error: 'Plano é obrigatório.' });
        return;
      }
      const invite = await inviteService.create(req.manager!.id, plan, email);
      res.status(201).json(invite);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  public async list(_req: AuthRequest, res: Response) {
    try {
      const invites = await inviteService.listAll();
      res.json(invites);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async verify(req: AuthRequest, res: Response) {
    try {
      const result = await inviteService.verify(req.params.token);
      if (!result.valid) {
        res.status(400).json({ error: (result as any).error });
        return;
      }
      res.json({ valid: true, invite: result.invite });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  public async revoke(req: AuthRequest, res: Response) {
    try {
      await inviteService.revoke(req.params.id);
      res.json({ message: 'Convite revogado.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default new InviteController();
