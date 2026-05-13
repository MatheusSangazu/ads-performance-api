import type { Request, Response } from 'express';
import clientService from '../services/clientService.js';
import reportService from '../services/reportService.js';
import dashboardRepository from '../repositories/dashboardRepository.js';

class ClientController {
  public async create(req: Request, res: Response): Promise<void> {
    const { name, act_id, access_token, custom_event_id, is_ecommerce } = req.body;
    const result = await clientService.saveClient(
      name,
      act_id,
      access_token,
      custom_event_id,
      is_ecommerce ?? false,
    );
    res.json(result);
  }

  public async list(_req: Request, res: Response): Promise<void> {
    const clients = await clientService.listClients();
    res.json(clients);
  }

  public async metrics(_req: Request, res: Response): Promise<void> {
    const data = await dashboardRepository.getOverview();
    res.json(data);
  }

  public async updateToken(req: Request, res: Response): Promise<void> {
    const { actId } = req.params;
    const { access_token } = req.body;
    const result = await clientService.updateToken(actId, access_token);
    res.json(result);
  }

  public async remove(req: Request, res: Response): Promise<void> {
    const { actId } = req.params;
    const result = await clientService.deleteClient(actId);
    res.json(result);
  }

  public async downloadReport(req: Request, res: Response): Promise<void> {
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
