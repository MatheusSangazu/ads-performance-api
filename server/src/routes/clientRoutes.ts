import { Router } from 'express';
import { z } from 'zod';
import clientController from '../controllers/clientController.js';
import budgetController from '../controllers/budgetController.js';
import goalController from '../controllers/goalController.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const createClientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  act_id: z.string().min(1, 'Act ID é obrigatório'),
  access_token: z.string().min(1, 'Access Token é obrigatório'),
  custom_event_id: z.string().optional(),
  is_ecommerce: z.boolean().optional(),
});

const updateTokenSchema = z.object({
  access_token: z.string().min(1, 'Access Token é obrigatório'),
});

const setBudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato: YYYY-MM'),
  budgetAmount: z.number().positive('Orçamento deve ser maior que zero'),
});

const setGoalSchema = z.object({
  metric: z.enum(['leads', 'cpl', 'roas', 'ctr', 'clicks', 'impressions', 'purchases', 'purchase_value']),
  targetValue: z.number().positive('Meta deve ser maior que zero'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato: YYYY-MM'),
});

router.post('/', authMiddleware, validate(createClientSchema), (req, res, next) => {
  clientController.create(req, res).catch(next);
});

router.get('/', authMiddleware, (req, res, next) => {
  clientController.list(req, res).catch(next);
});

router.get('/metrics', authMiddleware, (req, res, next) => {
  clientController.metrics(req, res).catch(next);
});

router.get('/:actId/budget', authMiddleware, (req, res, next) => {
  budgetController.getCurrent(req, res).catch(next);
});

router.post('/:actId/budget', authMiddleware, validate(setBudgetSchema), (req, res, next) => {
  budgetController.setBudget(req, res).catch(next);
});

router.get('/:actId/budget/history', authMiddleware, (req, res, next) => {
  budgetController.getHistory(req, res).catch(next);
});

router.get('/:actId/goals', authMiddleware, (req, res, next) => {
  goalController.getCurrent(req, res).catch(next);
});

router.post('/:actId/goals', authMiddleware, validate(setGoalSchema), (req, res, next) => {
  goalController.setGoal(req, res).catch(next);
});

router.delete('/:actId/goals/:id', authMiddleware, (req, res, next) => {
  goalController.remove(req, res).catch(next);
});

router.patch('/:actId/token', authMiddleware, validate(updateTokenSchema), (req, res, next) => {
  clientController.updateToken(req, res).catch(next);
});

router.delete('/:actId', authMiddleware, (req, res, next) => {
  clientController.remove(req, res).catch(next);
});

router.get('/:actId/download', authMiddleware, (req, res, next) => {
  clientController.downloadReport(req, res).catch(next);
});

export default router;
