import type { Request, Response } from 'express';
import syncService from '../services/syncService.js';

class SyncController {
  public async manualSync(req: Request, res: Response): Promise<void> {
    const { act_id, since, until } = req.body;
    const result = await syncService.syncAccount(act_id, since, until);
    res.json(result);
  }
}

export default new SyncController();
