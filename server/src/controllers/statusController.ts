import type { Response } from 'express';
import prisma from '../config/db.js';
import healthCheckService from '../services/healthCheckService.js';
import clientRepository from '../repositories/clientRepository.js';
import type { AuthRequest } from '../middleware/auth.js';

class StatusController {
  public async getStatus(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const client = await prisma.client.findUnique({
      where: { actId },
      select: {
        clientName: true,
        accountStatus: true,
        disableReason: true,
        healthLastCheck: true,
      },
    });
    if (!client) {
      res.status(404).json({ error: 'Cliente não encontrado.' });
      return;
    }

    const labels: Record<number, string> = {
      1: 'Ativa',
      2: 'Desativada',
      3: 'Pendência de Pagamento',
      7: 'Análise de Risco',
      9: 'Período de Graça',
      100: 'Fechamento Pendente',
      101: 'Fechada',
    };

    res.json({
      actId,
      clientName: client.clientName,
      accountStatus: client.accountStatus,
      statusLabel: labels[client.accountStatus ?? 0] || 'Desconhecido',
      disableReason: client.disableReason,
      lastCheck: client.healthLastCheck?.toISOString() || null,
    });
  }

  public async refreshStatus(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const client = await clientRepository.findByActId(actId);
    if (!client) {
      res.status(404).json({ error: 'Cliente não encontrado.' });
      return;
    }

    const health = await healthCheckService.updateClientHealth(actId, client.accessToken);
    if (!health) {
      res.status(400).json({ error: 'Erro ao verificar status na Meta API.' });
      return;
    }

    const labels: Record<number, string> = {
      1: 'Ativa',
      2: 'Desativada',
      3: 'Pendência de Pagamento',
      7: 'Análise de Risco',
      9: 'Período de Graça',
      100: 'Fechamento Pendente',
      101: 'Fechada',
    };

    res.json({
      actId,
      accountStatus: health.accountStatus,
      statusLabel: labels[health.accountStatus] || 'Desconhecido',
      disableReason: health.disableReason,
      lastCheck: new Date().toISOString(),
    });
  }
}

export default new StatusController();
