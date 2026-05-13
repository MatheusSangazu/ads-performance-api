import prisma from '../config/db.js';

class SettingsRepository {
  public async get(key: string): Promise<string | null> {
    const setting = await prisma.appSettings.findUnique({ where: { key } });
    return setting?.value ?? null;
  }

  public async set(key: string, value: string) {
    return prisma.appSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}

export default new SettingsRepository();
