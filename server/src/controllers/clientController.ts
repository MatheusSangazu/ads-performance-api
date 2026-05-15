import type { Request, Response } from 'express';
import clientService from '../services/clientService.js';
import reportService from '../services/reportService.js';
import dashboardRepository from '../repositories/dashboardRepository.js';
import managerRepository from '../repositories/managerRepository.js';
import type { AuthRequest } from '../middleware/auth.js';

class ClientController {
  public async create(req: AuthRequest, res: Response): Promise<void> {
    const { name, act_id, access_token, custom_event_id, is_ecommerce } = req.body;
    const result = await clientService.saveClient(
      name,
      act_id,
      access_token,
      custom_event_id,
      is_ecommerce ?? false,
    );

    if (req.manager && req.manager.role !== 'admin') {
      await managerRepository.linkClient(req.manager.id, act_id);
    }

    res.json(result);
  }

  public async list(req: AuthRequest, res: Response): Promise<void> {
    if (req.manager?.role === 'admin') {
      const clients = await clientService.listClients();
      res.json(clients);
      return;
    }

    const clientIds = await managerRepository.getClientIds(req.manager!.id);
    const allClients = await clientService.listClients();
    const filtered = allClients.filter((c: any) => clientIds.includes(c.actId));
    res.json(filtered);
  }

  public async metrics(req: AuthRequest, res: Response): Promise<void> {
    if (req.manager?.role === 'admin') {
      const data = await dashboardRepository.getOverview();
      res.json(data);
      return;
    }

    const clientIds = await managerRepository.getClientIds(req.manager!.id);
    const data = await dashboardRepository.getOverview(clientIds);
    res.json(data);
  }

  public async updateToken(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const { access_token } = req.body;
    const result = await clientService.updateToken(actId, access_token);
    res.json(result);
  }

  public async remove(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const result = await clientService.deleteClient(actId);
    res.json(result);
  }

  public async downloadReport(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const workbook = await reportService.generateExcel(actId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=relatorio_${actId}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}

export default new ClientController();
