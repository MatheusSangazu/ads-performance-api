import prisma from '../config/db.js';
import type { TaskStatus, TaskPriority } from '../generated/prisma/client.js';

class TaskRepository {
  public async create(data: {
    managerId: string;
    clientId?: string;
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: Date;
    alertId?: string;
    position?: number;
  }) {
    return prisma.task.create({
      data: {
        id: crypto.randomUUID(),
        ...data,
      },
    });
  }

  public async findByManager(
    managerId: string,
    filters?: {
      status?: TaskStatus;
      clientId?: string;
      priority?: TaskPriority;
    },
  ) {
    return prisma.task.findMany({
      where: {
        managerId,
        ...filters,
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });
  }

  public async findById(id: string) {
    return prisma.task.findUnique({ where: { id } });
  }

  public async update(id: string, data: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: Date | null;
    clientId?: string | null;
  }) {
    return prisma.task.update({ where: { id }, data });
  }

  public async updateStatus(id: string, status: TaskStatus) {
    return prisma.task.update({ where: { id }, data: { status } });
  }

  public async updatePosition(id: string, position: number, status?: TaskStatus) {
    return prisma.task.update({
      where: { id },
      data: { position, ...(status ? { status } : {}) },
    });
  }

  public async delete(id: string) {
    return prisma.task.delete({ where: { id } });
  }

  public async findMaxPosition(managerId: string, status: TaskStatus) {
    const result = await prisma.task.aggregate({
      where: { managerId, status },
      _max: { position: true },
    });
    return result._max.position ?? -1;
  }

  public async reorder(managerId: string, status: TaskStatus, orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      prisma.task.update({
        where: { id },
        data: { position: index },
      }),
    );
    return prisma.$transaction(updates);
  }

  public async countByStatus(managerId: string) {
    const tasks = await prisma.task.findMany({
      where: { managerId },
      select: { status: true },
    });
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  }

  public async deleteByStatus(managerId: string, status: TaskStatus) {
    return prisma.task.deleteMany({
      where: { managerId, status },
    });
  }
}

export default new TaskRepository();
