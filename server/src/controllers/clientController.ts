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

    if (req.manager) {
      await managerRepository.linkClient(req.manager.id, act_id);
    }

    res.json(result);
  }

  public async list(req: AuthRequest, res: Response): Promise<void> {
    let clientIds: string[];

    if (req.manager?.role === 'agency') {
      clientIds = await managerRepository.getAgencyClientIds(req.manager.id);
    } else {
      clientIds = await managerRepository.getClientIds(req.manager!.id);
    }

    const allClients = await clientService.listClients();
    const filtered = allClients.filter((c: any) => clientIds.includes(c.actId));
    res.json(filtered);
  }

  public async metrics(req: AuthRequest, res: Response): Promise<void> {
    const { since, until, clientId } = req.query;
    const filters = {
      since: since as string,
      until: until as string,
      specificClientId: clientId as string,
    };

    let clientIds: string[] | undefined;
    if (req.manager?.role === 'agency') {
      clientIds = await managerRepository.getAgencyClientIds(req.manager.id);
    } else {
      clientIds = await managerRepository.getClientIds(req.manager!.id);
    }

    const data = await dashboardRepository.getOverview(clientIds.length > 0 ? clientIds : undefined, filters);
    res.json(data);
  }

  public async updateToken(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const { access_token } = req.body;
    const result = await clientService.updateToken(actId, access_token);
    res.json(result);
  }

  public async update(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const { act_id, name, custom_event_id } = req.body;
    const result = await clientService.updateClient(actId, {
      actId: act_id,
      clientName: name,
      customEventId: custom_event_id,
    });
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
