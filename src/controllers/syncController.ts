import type { Request, Response } from 'express';
import syncService from '../services/syncService.js';
import breakdownSyncService from '../services/breakdownSyncService.js';
import type { BreakdownType } from '../types/index.js';

class SyncController {
  public async manualSync(req: Request, res: Response): Promise<void> {
    const { act_id, since, until } = req.body;
    const result = await syncService.syncAccount(act_id, since, until);
    res.json(result);
  }

  public async syncBreakdown(req: Request, res: Response): Promise<void> {
    const { act_id, since, until, type } = req.body;
    const validTypes: BreakdownType[] = ['audience', 'placement', 'region'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `Tipo inválido. Use: ${validTypes.join(', ')}` });
      return;
    }
    const result = await breakdownSyncService.syncBreakdown(act_id, since, until, type);
    res.json(result);
  }

  public async syncAllBreakdowns(req: Request, res: Response): Promise<void> {
    const { act_id, since, until } = req.body;
    const results = await breakdownSyncService.syncAllBreakdowns(act_id, since, until);
    res.json(results);
  }
}

export default new SyncController();
