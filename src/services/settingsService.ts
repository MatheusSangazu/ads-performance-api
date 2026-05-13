import settingsRepository from '../repositories/settingsRepository.js';

class SettingsService {
  public async getGlobalToken(): Promise<string | null> {
    return settingsRepository.get('global_access_token');
  }

  public async setGlobalToken(token: string) {
    await settingsRepository.set('global_access_token', token);
    return { success: true, message: 'Token global atualizado com sucesso!' };
  }
}

export default new SettingsService();
