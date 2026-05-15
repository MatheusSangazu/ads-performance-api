import budgetRepository from '../repositories/budgetRepository.js';

class BudgetService {
  public async setBudget(managerId: string, clientId: string, month: string, budgetAmount: number) {
    if (budgetAmount <= 0) throw new Error('Orçamento deve ser maior que zero.');
    return budgetRepository.upsert(managerId, clientId, month, budgetAmount);
  }

  public async getCurrent(managerId: string, clientId: string) {
    return budgetRepository.findCurrent(managerId, clientId);
  }

  public async getHistory(managerId: string, clientId: string) {
    return budgetRepository.findHistory(managerId, clientId);
  }
}

export default new BudgetService();
