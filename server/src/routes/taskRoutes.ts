import { Router } from 'express';
import { z } from 'zod';
import taskController from '../controllers/taskController.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const createTaskSchema = z.object({
  clientId: z.string().optional(),
  title: z.string().min(1, 'Titulo é obrigatorio').max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  alertId: z.string().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
});

const updateStatusSchema = z.object({
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']),
});

const reorderSchema = z.object({
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']),
  orderedIds: z.array(z.string()),
});

router.get('/', authMiddleware, (req, res, next) => {
  taskController.list(req, res).catch(next);
});

router.get('/counts', authMiddleware, (req, res, next) => {
  taskController.counts(req, res).catch(next);
});

router.post('/', authMiddleware, validate(createTaskSchema), (req, res, next) => {
  taskController.create(req, res).catch(next);
});

router.post('/clear', authMiddleware, validate(updateStatusSchema), (req, res, next) => {
  taskController.clearByStatus(req, res).catch(next);
});

router.patch('/:id/status', authMiddleware, validate(updateStatusSchema), (req, res, next) => {
  taskController.updateStatus(req, res).catch(next);
});

router.patch('/:id/reorder', authMiddleware, validate(reorderSchema), (req, res, next) => {
  taskController.reorder(req, res).catch(next);
});

router.patch('/:id', authMiddleware, validate(updateTaskSchema), (req, res, next) => {
  taskController.update(req, res).catch(next);
});

router.delete('/:id', authMiddleware, (req, res, next) => {
  taskController.remove(req, res).catch(next);
});

export default router;
