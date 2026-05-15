import taskRepository from '../repositories/taskRepository.js';
import type { TaskStatus, TaskPriority } from '../generated/prisma/client.js';

class TaskService {
  public async create(managerId: string, data: {
    clientId?: string;
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: Date;
    alertId?: string;
  }) {
    const status: TaskStatus = 'backlog';
    const maxPos = await taskRepository.findMaxPosition(managerId, status);
    return taskRepository.create({
      managerId,
      ...data,
      status,
      position: maxPos + 1,
    });
  }

  public async list(managerId: string, filters?: {
    status?: TaskStatus;
    clientId?: string;
    priority?: TaskPriority;
  }) {
    return taskRepository.findByManager(managerId, filters);
  }

  public async update(id: string, managerId: string, data: {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: Date | null;
    clientId?: string | null;
  }) {
    const task = await taskRepository.findById(id);
    if (!task || task.managerId !== managerId) {
      throw new Error('Tarefa não encontrada.');
    }
    return taskRepository.update(id, data);
  }

  public async updateStatus(id: string, managerId: string, status: TaskStatus) {
    const task = await taskRepository.findById(id);
    if (!task || task.managerId !== managerId) {
      throw new Error('Tarefa não encontrada.');
    }

    const maxPos = await taskRepository.findMaxPosition(managerId, status);
    return taskRepository.updatePosition(id, maxPos + 1, status);
  }

  public async reorder(managerId: string, status: TaskStatus, orderedIds: string[]) {
    const tasks = await taskRepository.findByManager(managerId, { status });
    const taskIds = new Set(tasks.map((t) => t.id));

    const validIds = orderedIds.filter((id) => taskIds.has(id));
    if (validIds.length === 0) return;

    return taskRepository.reorder(managerId, status, validIds);
  }

  public async remove(id: string, managerId: string) {
    const task = await taskRepository.findById(id);
    if (!task || task.managerId !== managerId) {
      throw new Error('Tarefa não encontrada.');
    }
    return taskRepository.delete(id);
  }

  public async counts(managerId: string) {
    return taskRepository.countByStatus(managerId);
  }

  public async clearByStatus(managerId: string, status: TaskStatus) {
    return taskRepository.deleteByStatus(managerId, status);
  }
}

export default new TaskService();
