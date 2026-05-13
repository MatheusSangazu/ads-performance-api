import clientRepository from '../repositories/clientRepository.js';

class ClientService {
  public async saveClient(
    name: string,
    actId: string,
    token: string,
    customEventId?: string,
    isEcommerce: boolean = false,
  ) {
    await clientRepository.upsert({ name, actId, token, customEventId, isEcommerce });
    return { success: true, message: `Cliente ${name} configurado com sucesso!` };
  }

  public async listClients() {
    return clientRepository.listAll();
  }

  public async updateToken(actId: string, token: string) {
    await clientRepository.updateToken(actId, token);
    return { success: true, message: 'Token atualizado com sucesso!' };
  }

  public async deleteClient(actId: string) {
    const client = await clientRepository.findByActId(actId);
    if (!client) throw new Error(`Cliente ${actId} não encontrado.`);
    await clientRepository.deleteByActId(actId);
    return { success: true, message: `Cliente ${client.clientName} removido com sucesso!` };
  }
}

export default new ClientService();
