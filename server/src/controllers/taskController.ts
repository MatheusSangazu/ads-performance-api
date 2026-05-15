import type { Response } from 'express';
import taskService from '../services/taskService.js';
import type { AuthRequest } from '../middleware/auth.js';

class TaskController {
  public async list(req: AuthRequest, res: Response): Promise<void> {
    const managerId = req.manager!.id;
    const { status, clientId, priority } = req.query;
    const tasks = await taskService.list(managerId, {
      status: status as any,
      clientId: clientId as string,
      priority: priority as any,
    });
    res.json(tasks);
  }

  public async counts(req: AuthRequest, res: Response): Promise<void> {
    const managerId = req.manager!.id;
    const counts = await taskService.counts(managerId);
    res.json(counts);
  }

  public async create(req: AuthRequest, res: Response): Promise<void> {
    const managerId = req.manager!.id;
    const { clientId, title, description, priority, dueDate, alertId } = req.body;
    const task = await taskService.create(managerId, {
      clientId,
      title,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      alertId,
    });
    res.status(201).json(task);
  }

  public async update(req: AuthRequest, res: Response): Promise<void> {
    const managerId = req.manager!.id;
    const { id } = req.params;
    const { title, description, priority, dueDate, clientId } = req.body;
    const task = await taskService.update(id, managerId, {
      title,
      description,
      priority,
      dueDate: dueDate === null ? null : dueDate ? new Date(dueDate) : undefined,
      clientId: clientId === null ? null : clientId,
    });
    res.json(task);
  }

  public async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    const managerId = req.manager!.id;
    const { id } = req.params;
    const { status } = req.body;
    const task = await taskService.updateStatus(id, managerId, status);
    res.json(task);
  }

  public async reorder(req: AuthRequest, res: Response): Promise<void> {
    const managerId = req.manager!.id;
    const { status, orderedIds } = req.body;
    await taskService.reorder(managerId, status, orderedIds);
    res.json({ success: true });
  }

  public async remove(req: AuthRequest, res: Response): Promise<void> {
    const managerId = req.manager!.id;
    const { id } = req.params;
    await taskService.remove(id, managerId);
    res.json({ success: true });
  }

  public async clearByStatus(req: AuthRequest, res: Response): Promise<void> {
    const managerId = req.manager!.id;
    const { status } = req.body;
    const result = await taskService.clearByStatus(managerId, status);
    res.json({ success: true, deleted: result.count });
  }
}

export default new TaskController();
