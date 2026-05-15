import type { Response } from 'express';
import budgetService from '../services/budgetService.js';
import type { AuthRequest } from '../middleware/auth.js';

class BudgetController {
  public async getCurrent(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const managerId = req.manager!.id;
    const budget = await budgetService.getCurrent(managerId, actId);
    res.json(budget);
  }

  public async setBudget(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const managerId = req.manager!.id;
    const { month, budgetAmount } = req.body;
    const budget = await budgetService.setBudget(managerId, actId, month, budgetAmount);
    res.json(budget);
  }

  public async getHistory(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const managerId = req.manager!.id;
    const history = await budgetService.getHistory(managerId, actId);
    res.json(history);
  }
}

export default new BudgetController();
