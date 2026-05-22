import type { Response } from 'express';
import customConversionService from '../services/customConversionService.js';
import type { AuthRequest } from '../middleware/auth.js';

class CustomConversionController {
  public async list(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const conversions = await customConversionService.list(actId);
    res.json(conversions);
  }

  public async add(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const { custom_event_id, label } = req.body;
    try {
      const conv = await customConversionService.add(actId, custom_event_id, label);
      res.json(conv);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  public async remove(req: AuthRequest, res: Response): Promise<void> {
    const { actId, id } = req.params;
    try {
      await customConversionService.remove(Number(id), actId);
      res.json({ success: true, message: 'Conversão personalizada removida.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default new CustomConversionController();
