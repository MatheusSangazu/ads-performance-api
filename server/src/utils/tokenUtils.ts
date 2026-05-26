import clientRepository from '../repositories/clientRepository.js';

export async function resolveToken(actId: string): Promise<{ accessToken: string; source: string }> {
  const client = await clientRepository.findByActId(actId);
  if (!client) throw new Error(`Cliente ${actId} não encontrado.`);

  const accessToken = client.accessToken?.trim();
  if (!accessToken) throw new Error(`Cliente ${actId} não possui token configurado. Cadastre o token no card do cliente.`);
  return { accessToken, source: 'token do cliente' };
}
