import type { Response } from 'express';
import balanceService from '../services/balanceService.js';
import type { AuthRequest } from '../middleware/auth.js';

class BalanceController {
  public async getBalance(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const balance = await balanceService.getBalance(actId);
    res.json(balance);
  }

  public async refreshBalance(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const balance = await balanceService.refreshBalance(actId);
    if (!balance) {
      res.status(400).json({ error: 'Erro ao buscar saldo na Meta API.' });
      return;
    }
    res.json(balance);
  }

  public async updateSettings(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const { is_boleto, balance_threshold } = req.body;
    const result = await balanceService.updateSettings(actId, {
      isBoleto: is_boleto,
      balanceThreshold: balance_threshold,
    });
    res.json(result);
  }
}

export default new BalanceController();
