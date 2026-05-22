import prisma from '../config/db.js';

class CustomConversionRepository {
  public async findByClient(clientId: string) {
    return prisma.clientCustomConversion.findMany({
      where: { clientId },
      orderBy: { createdAt: 'asc' },
    });
  }

  public async create(clientId: string, customEventId: string, label: string) {
    return prisma.clientCustomConversion.create({
      data: { clientId, customEventId, label },
    });
  }

  public async delete(id: number, clientId: string) {
    return prisma.clientCustomConversion.delete({
      where: { id, clientId },
    });
  }

  public async batchUpsertAdConversions(
    records: {
      date: Date;
      clientId: string;
      adId: string;
      customEventId: string;
      count: number;
      value: number;
    }[],
  ) {
    if (records.length === 0) return;

    const values = records
      .map(
        (r) =>
          `('${r.date.toISOString().split('T')[0]}', '${r.clientId}', '${r.adId}', '${r.customEventId}', ${r.count}, ${r.value})`,
      )
      .join(',');

    const sql = `
      INSERT INTO ad_custom_conversions (date, client_id, ad_id, custom_event_id, \`count\`, \`value\`)
      VALUES ${values}
      ON DUPLICATE KEY UPDATE
        \`count\` = VALUES(\`count\`),
        \`value\` = VALUES(\`value\`)
    `;

    await prisma.$executeRawUnsafe(sql);
  }
}

export default new CustomConversionRepository();
