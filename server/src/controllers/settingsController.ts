import type { Request, Response } from 'express';
import settingsService from '../services/settingsService.js';
import schedulerService from '../services/schedulerService.js';

class SettingsController {
  public async getAutoSync(_req: Request, res: Response): Promise<void> {
    const enabled = await settingsService.getAutoSync();
    res.json({
      enabled,
      schedulerRunning: schedulerService.isRunning(),
    });
  }

  public async setAutoSync(req: Request, res: Response): Promise<void> {
    const { enabled } = req.body;
    const result = await settingsService.setAutoSync(enabled);
    if (enabled) {
      schedulerService.start();
    } else {
      schedulerService.stop();
    }
    res.json(result);
  }

  public async triggerSyncAll(_req: Request, res: Response): Promise<void> {
    const result = await schedulerService.syncAllClients();
    res.json(result);
  }
}

export default new SettingsController();
