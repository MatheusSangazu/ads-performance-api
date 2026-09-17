import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import summaryAutomationService from '../services/summaryAutomationService.js';

class SummaryAutomationController {
  public async list(req: AuthRequest, res: Response): Promise<void> {
    const schedules = await summaryAutomationService.list(req.manager!.id, req.params.actId);
    res.json(schedules);
  }

  public async create(req: AuthRequest, res: Response): Promise<void> {
    const schedule = await summaryAutomationService.create(req.manager!.id, req.params.actId, req.body);
    res.status(201).json(schedule);
  }

  public async update(req: AuthRequest, res: Response): Promise<void> {
    const schedule = await summaryAutomationService.update(
      req.manager!.id,
      req.params.actId,
      req.params.scheduleId,
      req.body,
    );
    res.json(schedule);
  }

  public async remove(req: AuthRequest, res: Response): Promise<void> {
    const result = await summaryAutomationService.remove(
      req.manager!.id,
      req.params.actId,
      req.params.scheduleId,
    );
    res.json(result);
  }

  public async preview(req: AuthRequest, res: Response): Promise<void> {
    const result = await summaryAutomationService.preview(req.params.actId, req.body);
    res.json(result);
  }

  public async sendTest(req: AuthRequest, res: Response): Promise<void> {
    const result = await summaryAutomationService.sendTest(req.params.actId, req.body);
    res.json(result);
  }
}

export default new SummaryAutomationController();
