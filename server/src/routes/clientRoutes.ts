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
import summaryAutomationController from '../controllers/summaryAutomationController.js';
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
  client_type: z.enum(['lead_gen', 'ecommerce', 'infoproduct', 'messaging', 'delivery']).optional(),
});

const updateTokenSchema = z.object({
  access_token: z.string().trim().min(1, 'Access Token é obrigatório'),
});

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  act_id: z.string().min(1).optional(),
  custom_event_id: z.string().optional(),
});

const updateClientTypeSchema = z.object({
  clientType: z.enum(['lead_gen', 'ecommerce', 'infoproduct', 'messaging', 'delivery']),
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

const summaryScheduleBaseSchema = z.object({
  name: z.string().trim().min(1, 'Nome da rotina é obrigatório').max(100),
  enabled: z.boolean(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  sendTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido'),
  weekDay: z.number().int().min(0).max(6).nullable().optional(),
  monthDay: z.number().int().min(1).max(31).nullable().optional(),
  period: z.enum(['yesterday', 'previous_week', 'previous_month', 'month_to_date', 'last_7_days']),
  destinationType: z.enum(['phone', 'group']),
  destination: z.string().trim().min(1, 'Destino é obrigatório').max(160),
  template: z.string().trim().min(1, 'Mensagem é obrigatória').max(10000),
});

const summaryScheduleSchema = summaryScheduleBaseSchema.superRefine((data, ctx) => {
  if (data.frequency === 'weekly' && data.weekDay == null) {
    ctx.addIssue({ code: 'custom', path: ['weekDay'], message: 'Escolha o dia da semana' });
  }
  if (data.frequency === 'monthly' && data.monthDay == null) {
    ctx.addIssue({ code: 'custom', path: ['monthDay'], message: 'Escolha o dia do mês' });
  }
  if (data.destinationType === 'phone' && !/^\d{10,15}$/.test(data.destination.replace(/\D/g, ''))) {
    ctx.addIssue({ code: 'custom', path: ['destination'], message: 'Informe telefone com DDI e DDD' });
  }
  if (data.destinationType === 'group' && !/^[0-9-]+(?:@g\.us)?$/.test(data.destination.replace(/\s/g, ''))) {
    ctx.addIssue({ code: 'custom', path: ['destination'], message: 'ID de grupo inválido' });
  }
});

const summaryPreviewSchema = summaryScheduleBaseSchema.pick({
  period: true,
  template: true,
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

router.patch('/tokens/all', authMiddleware, validate(updateTokenSchema), (req, res, next) => {
  clientController.updateTokenForAll(req, res).catch(next);
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

router.get('/:actId/summary-automations', authMiddleware, clientAccess, requireFeature('whatsapp'), (req, res, next) => {
  summaryAutomationController.list(req, res).catch(next);
});

router.post('/:actId/summary-automations', authMiddleware, clientAccess, requireFeature('whatsapp'), validate(summaryScheduleSchema), (req, res, next) => {
  summaryAutomationController.create(req, res).catch(next);
});

router.put('/:actId/summary-automations/:scheduleId', authMiddleware, clientAccess, requireFeature('whatsapp'), validate(summaryScheduleSchema), (req, res, next) => {
  summaryAutomationController.update(req, res).catch(next);
});

router.delete('/:actId/summary-automations/:scheduleId', authMiddleware, clientAccess, requireFeature('whatsapp'), (req, res, next) => {
  summaryAutomationController.remove(req, res).catch(next);
});

router.post('/:actId/summary-automations/preview', authMiddleware, clientAccess, requireFeature('whatsapp'), validate(summaryPreviewSchema), (req, res, next) => {
  summaryAutomationController.preview(req, res).catch(next);
});

router.post('/:actId/summary-automations/test', authMiddleware, clientAccess, requireFeature('whatsapp'), validate(summaryScheduleSchema), (req, res, next) => {
  summaryAutomationController.sendTest(req, res).catch(next);
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

router.get('/:actId/download/pdf', authMiddleware, clientAccess, (req, res, next) => {
  clientController.downloadPdf(req, res).catch(next);
});

router.post('/:actId/summary', authMiddleware, clientAccess, (req, res, next) => {
  summaryController.sendClientSummary(req, res).catch(next);
});

export default router;
