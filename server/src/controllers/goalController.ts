import type { Response } from 'express';
import goalService from '../services/goalService.js';
import type { AuthRequest } from '../middleware/auth.js';

class GoalController {
  public async getCurrent(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const managerId = req.manager!.id;
    const goals = await goalService.getCurrent(managerId, actId);
    res.json(goals);
  }

  public async setGoal(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const managerId = req.manager!.id;
    const { metric, targetValue, month } = req.body;
    const goal = await goalService.setGoal(managerId, actId, metric, targetValue, month);
    res.json(goal);
  }

  public async remove(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const managerId = req.manager!.id;
    await goalService.remove(id, managerId);
    res.json({ success: true });
  }
}

export default new GoalController();
