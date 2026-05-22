import { Router } from 'express';
import { z } from 'zod';
import clientController from '../controllers/clientController.js';
import budgetController from '../controllers/budgetController.js';
import goalController from '../controllers/goalController.js';
import balanceController from '../controllers/balanceController.js';
import customConversionController from '../controllers/customConversionController.js';
import statusController from '../controllers/statusController.js';
import projectionController from '../controllers/projectionController.js';
import summaryController from '../controllers/summaryController.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware, clientAccess } from '../middleware/auth.js';
import { checkClientLimit } from '../middleware/planMiddleware.js';
import { requireFeature } from '../middleware/planMiddleware.js';

const router = Router();

const createClientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  act_id: z.string().min(1, 'Act ID é obrigatório'),
  access_token: z.string().min(1, 'Access Token é obrigatório'),
  custom_event_id: z.string().optional(),
  client_type: z.enum(['lead_gen', 'ecommerce', 'infoproduct', 'messaging', 'local']).optional(),
});

const updateTokenSchema = z.object({
  access_token: z.string().min(1, 'Access Token é obrigatório'),
});

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  act_id: z.string().min(1).optional(),
  custom_event_id: z.string().optional(),
});

const updateClientTypeSchema = z.object({
  clientType: z.enum(['lead_gen', 'ecommerce', 'infoproduct', 'messaging', 'local']),
});

const setBudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato: YYYY-MM'),
  budgetAmount: z.number().positive('Orçamento deve ser maior que zero'),
});

const setGoalSchema = z.object({
  metric: z.enum(['leads', 'cpl', 'roas', 'ctr', 'clicks', 'impressions', 'purchases', 'purchase_value', 'messaging', 'cpmsg']),
  targetValue: z.number().positive('Meta deve ser maior que zero'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato: YYYY-MM'),
});

const balanceSettingsSchema = z.object({
  is_boleto: z.boolean().optional(),
  balance_threshold: z.number().positive('Threshold deve ser maior que zero').optional(),
});

const addCustomConversionSchema = z.object({
  custom_event_id: z.string().min(1, 'Custom Event ID é obrigatório'),
  label: z.string().min(1, 'Label é obrigatório'),
});

router.post('/', authMiddleware, checkClientLimit, validate(createClientSchema), (req, res, next) => {
  clientController.create(req, res).catch(next);
});

router.get('/', authMiddleware, (req, res, next) => {
  clientController.list(req, res).catch(next);
});

router.get('/metrics', authMiddleware, (req, res, next) => {
  clientController.metrics(req, res).catch(next);
});

router.get('/:actId/budget', authMiddleware, clientAccess, requireFeature('budgetGoals'), (req, res, next) => {
  budgetController.getCurrent(req, res).catch(next);
});

router.post('/:actId/budget', authMiddleware, clientAccess, requireFeature('budgetGoals'), validate(setBudgetSchema), (req, res, next) => {
  budgetController.setBudget(req, res).catch(next);
});

router.get('/:actId/budget/history', authMiddleware, clientAccess, requireFeature('budgetGoals'), (req, res, next) => {
  budgetController.getHistory(req, res).catch(next);
});

router.get('/:actId/goals', authMiddleware, clientAccess, requireFeature('budgetGoals'), (req, res, next) => {
  goalController.getCurrent(req, res).catch(next);
});

router.post('/:actId/goals', authMiddleware, clientAccess, requireFeature('budgetGoals'), validate(setGoalSchema), (req, res, next) => {
  goalController.setGoal(req, res).catch(next);
});

router.delete('/:actId/goals/:id', authMiddleware, clientAccess, requireFeature('budgetGoals'), (req, res, next) => {
  goalController.remove(req, res).catch(next);
});

router.get('/:actId/balance', authMiddleware, clientAccess, (req, res, next) => {
  balanceController.getBalance(req, res).catch(next);
});

router.post('/:actId/balance/refresh', authMiddleware, clientAccess, (req, res, next) => {
  balanceController.refreshBalance(req, res).catch(next);
});

router.patch('/:actId/balance-settings', authMiddleware, clientAccess, validate(balanceSettingsSchema), (req, res, next) => {
  balanceController.updateSettings(req, res).catch(next);
});

router.get('/:actId/custom-conversions', authMiddleware, clientAccess, (req, res, next) => {
  customConversionController.list(req, res).catch(next);
});

router.post('/:actId/custom-conversions', authMiddleware, clientAccess, validate(addCustomConversionSchema), (req, res, next) => {
  customConversionController.add(req, res).catch(next);
});

router.delete('/:actId/custom-conversions/:id', authMiddleware, clientAccess, (req, res, next) => {
  customConversionController.remove(req, res).catch(next);
});

router.get('/:actId/status', authMiddleware, clientAccess, (req, res, next) => {
  statusController.getStatus(req, res).catch(next);
});

router.post('/:actId/status/refresh', authMiddleware, clientAccess, (req, res, next) => {
  statusController.refreshStatus(req, res).catch(next);
});

router.get('/:actId/goal-projection', authMiddleware, clientAccess, (req, res, next) => {
  projectionController.getProjection(req, res).catch(next);
});

router.patch('/:actId', authMiddleware, clientAccess, validate(updateClientSchema), (req, res, next) => {
  clientController.update(req, res).catch(next);
});

router.patch('/:actId/token', authMiddleware, clientAccess, validate(updateTokenSchema), (req, res, next) => {
  clientController.updateToken(req, res).catch(next);
});

router.patch('/:actId/type', authMiddleware, clientAccess, validate(updateClientTypeSchema), (req, res, next) => {
  clientController.updateType(req, res).catch(next);
});

router.delete('/:actId', authMiddleware, clientAccess, (req, res, next) => {
  clientController.remove(req, res).catch(next);
});

router.get('/:actId/download', authMiddleware, clientAccess, (req, res, next) => {
  clientController.downloadReport(req, res).catch(next);
});

router.post('/:actId/summary', authMiddleware, clientAccess, (req, res, next) => {
  summaryController.sendClientSummary(req, res).catch(next);
});

export default router;
