import clientRepository from '../repositories/clientRepository.js';

class ClientService {
  public async saveClient(
    name: string,
    actId: string,
    token: string,
    customEventId?: string,
    isEcommerce: boolean = false,
  ) {
    const normalizedActId = actId.trim().startsWith('act_') ? actId.trim() : `act_${actId.trim()}`;
    await clientRepository.upsert({ name, actId: normalizedActId, token, customEventId, isEcommerce });
    return { success: true, message: `Cliente ${name} configurado com sucesso!` };
  }

  public async listClients() {
    return clientRepository.listAll();
  }

  public async updateToken(actId: string, token: string) {
    await clientRepository.updateToken(actId, token);
    return { success: true, message: 'Token atualizado com sucesso!' };
  }

  public async updateClient(
    oldActId: string,
    data: { actId?: string; clientName?: string; customEventId?: string },
  ) {
    if (data.actId && data.actId !== oldActId) {
      const existing = await clientRepository.findByActId(
        data.actId.startsWith('act_') ? data.actId : `act_${data.actId}`,
      );
      if (existing) throw new Error('Já existe um cliente com esse Act ID.');
    }
    await clientRepository.updateClient(oldActId, data);
    return { success: true, message: 'Cliente atualizado com sucesso!' };
  }

  public async deleteClient(actId: string) {
    const client = await clientRepository.findByActId(actId);
    if (!client) throw new Error(`Cliente ${actId} não encontrado.`);
    await clientRepository.deleteByActId(actId);
    return { success: true, message: `Cliente ${client.clientName} removido com sucesso!` };
  }
}

export default new ClientService();
