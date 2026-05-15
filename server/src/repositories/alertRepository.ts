import prisma from '../config/db.js';
import type { AlertType, AlertSeverity } from '../generated/prisma/client.js';

class AlertRepository {
  public async create(data: {
    managerId: string;
    clientId: string;
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
  }) {
    return prisma.alert.create({
      data: { id: crypto.randomUUID(), ...data },
    });
  }

  public async findByManager(managerId: string, includeDismissed = false) {
    return prisma.alert.findMany({
      where: {
        managerId,
        ...(includeDismissed ? {} : { dismissed: false }),
      },
      orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  public async countUnread(managerId: string) {
    return prisma.alert.count({
      where: { managerId, read: false, dismissed: false },
    });
  }

  public async markRead(id: string) {
    return prisma.alert.update({ where: { id }, data: { read: true } });
  }

  public async markAllRead(managerId: string) {
    return prisma.alert.updateMany({
      where: { managerId, read: false, dismissed: false },
      data: { read: true },
    });
  }

  public async dismiss(id: string) {
    return prisma.alert.update({
      where: { id },
      data: { dismissed: true },
    });
  }

  public async findDuplicate(managerId: string, clientId: string, type: AlertType, since: Date) {
    return prisma.alert.findFirst({
      where: {
        managerId,
        clientId,
        type,
        createdAt: { gte: since },
      },
    });
  }
}

export default new AlertRepository();
