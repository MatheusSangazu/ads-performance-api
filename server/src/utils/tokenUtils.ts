import clientRepository from '../repositories/clientRepository.js';
import settingsRepository from '../repositories/settingsRepository.js';
import { fetchAllInsights } from '../integrations/metaApi.js';

export async function resolveToken(actId: string): Promise<{ accessToken: string; source: string }> {
  const client = await clientRepository.findByActId(actId);
  if (!client) throw new Error(`Cliente ${actId} não encontrado.`);

  const clientToken = client.accessToken?.trim();
  const globalToken = (await settingsRepository.get('global_access_token'))?.trim();

  if (clientToken && globalToken && clientToken !== globalToken) {
    try {
      const today = new Date().toISOString().split('T')[0];
      await fetchAllInsights(actId, clientToken, today, today);
      return { accessToken: clientToken, source: 'token do cliente' };
    } catch {
      console.log('[TOKEN] Token do cliente falhou, usando token global como fallback');
      return { accessToken: globalToken, source: 'token global (fallback)' };
    }
  }

  const accessToken = clientToken || globalToken;
  if (!accessToken) throw new Error(`Nenhum token disponível para o cliente ${actId}.`);
  return { accessToken, source: clientToken ? 'token do cliente' : 'token global' };
}
