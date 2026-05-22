import type { Response } from 'express';
import clientService from '../services/clientService.js';
import reportService from '../services/reportService.js';
import dashboardRepository from '../repositories/dashboardRepository.js';
import managerRepository from '../repositories/managerRepository.js';
import type { AuthRequest } from '../middleware/auth.js';

class ClientController {
  public async create(req: AuthRequest, res: Response): Promise<void> {
    const { name, act_id, access_token, custom_event_id, client_type } = req.body;
    const cleanActId = act_id.trim();
    const normalizedActId = cleanActId.startsWith('act_') ? cleanActId : `act_${cleanActId}`;
    const result = await clientService.saveClient(
      name,
      cleanActId,
      access_token,
      custom_event_id,
      client_type ?? 'lead_gen',
    );

    if (req.manager) {
      await managerRepository.linkClient(req.manager.id, normalizedActId);
    }

    res.json(result);
  }

  private async getAccessibleClientIds(req: AuthRequest): Promise<string[]> {
    if (req.manager?.role === 'admin' || req.manager?.role === 'agency') {
      return managerRepository.getAgencyClientIds(req.manager!.id);
    }

    return managerRepository.getClientIds(req.manager!.id);
  }

  public async list(req: AuthRequest, res: Response): Promise<void> {
    const clientIds = await this.getAccessibleClientIds(req);
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

    const clientIds = await this.getAccessibleClientIds(req);

    const data = await dashboardRepository.getOverview(clientIds, filters);
    res.json(data);
  }

  public async updateToken(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const { access_token } = req.body;
    const result = await clientService.updateToken(actId, access_token);
    res.json(result);
  }

  public async updateType(req: AuthRequest, res: Response): Promise<void> {
    const { actId } = req.params;
    const { clientType } = req.body;
    const result = await clientService.updateType(actId, clientType);
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
