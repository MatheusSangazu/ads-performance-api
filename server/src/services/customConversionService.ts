import customConversionRepository from '../repositories/customConversionRepository.js';
import prisma from '../config/db.js';

class CustomConversionService {
  public async list(clientId: string) {
    return customConversionRepository.findByClient(clientId);
  }

  public async add(clientId: string, customEventId: string, label: string) {
    const existing = await prisma.clientCustomConversion.findFirst({
      where: { clientId, customEventId },
    });
    if (existing) {
      throw new Error('Essa conversão personalizada já está configurada para este cliente.');
    }
    return customConversionRepository.create(clientId, customEventId, label);
  }

  public async remove(id: number, clientId: string) {
    const conv = await prisma.clientCustomConversion.findUnique({ where: { id } });
    if (!conv || conv.clientId !== clientId) {
      throw new Error('Conversão personalizada não encontrada.');
    }
    return customConversionRepository.delete(id, clientId);
  }
}

export default new CustomConversionService();
