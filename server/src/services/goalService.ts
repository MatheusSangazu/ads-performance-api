import goalRepository from '../repositories/goalRepository.js';
import type { GoalMetric } from '../generated/prisma/client.js';

class GoalService {
  public async setGoal(
    managerId: string,
    clientId: string,
    metric: GoalMetric,
    targetValue: number,
    month: string,
  ) {
    if (targetValue <= 0) throw new Error('Meta deve ser maior que zero.');
    return goalRepository.upsert(managerId, clientId, metric, targetValue, month);
  }

  public async getCurrent(managerId: string, clientId: string) {
    return goalRepository.findCurrent(managerId, clientId);
  }

  public async remove(id: string, managerId: string) {
    const goal = await goalRepository.findById(id);
    if (!goal) throw new Error('Meta nao encontrada.');
    if (goal.managerId !== managerId) throw new Error('Sem permissao.');
    return goalRepository.delete(id);
  }
}

export default new GoalService();
