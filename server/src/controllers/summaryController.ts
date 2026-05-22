import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import summaryService from '../services/summaryService.js';

class SummaryController {
  public async sendClientSummary(req: AuthRequest, res: Response) {
    const { actId } = req.params;
    const managerId = req.manager!.id;

    const result = await summaryService.sendClientSummary(managerId, actId);
    res.json(result);
  }
}

export default new SummaryController();
