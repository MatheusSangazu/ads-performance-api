import settingsRepository from '../repositories/settingsRepository.js';

class SettingsService {
  public async getAutoSync(): Promise<boolean> {
    const val = await settingsRepository.get('auto_sync_enabled');
    return val === 'true';
  }

  public async setAutoSync(enabled: boolean) {
    await settingsRepository.set('auto_sync_enabled', String(enabled));
    return {
      success: true,
      message: enabled ? 'Auto-sync ativado!' : 'Auto-sync desativado.',
    };
  }
}

export default new SettingsService();
