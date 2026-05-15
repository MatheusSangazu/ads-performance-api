import type { Response } from 'express';
import alertService from '../services/alertService.js';
import type { AuthRequest } from '../middleware/auth.js';

class AlertController {
  public async list(req: AuthRequest, res: Response): Promise<void> {
    const managerId = req.manager!.id;
    const alerts = await alertService.list(managerId);
    res.json(alerts);
  }

  public async countUnread(req: AuthRequest, res: Response): Promise<void> {
    const managerId = req.manager!.id;
    const count = await alertService.countUnread(managerId);
    res.json({ count });
  }

  public async markRead(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const alert = await alertService.markRead(id);
    res.json(alert);
  }

  public async markAllRead(req: AuthRequest, res: Response): Promise<void> {
    const managerId = req.manager!.id;
    await alertService.markAllRead(managerId);
    res.json({ success: true });
  }

  public async dismiss(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const alert = await alertService.dismiss(id);
    res.json(alert);
  }
}

export default new AlertController();
