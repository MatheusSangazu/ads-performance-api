import type { Request, Response } from 'express';
import settingsService from '../services/settingsService.js';

class SettingsController {
  public async getGlobalToken(_req: Request, res: Response): Promise<void> {
    const token = await settingsService.getGlobalToken();
    res.json({ globalToken: token });
  }

  public async setGlobalToken(req: Request, res: Response): Promise<void> {
    const { token } = req.body;
    const result = await settingsService.setGlobalToken(token);
    res.json(result);
  }
}

export default new SettingsController();
