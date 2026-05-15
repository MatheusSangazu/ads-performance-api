import { Router } from 'express';
import { z } from 'zod';
import clientController from '../controllers/clientController.js';
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

router.post('/', authMiddleware, validate(createClientSchema), (req, res, next) => {
  clientController.create(req, res).catch(next);
});

router.get('/', authMiddleware, (req, res, next) => {
  clientController.list(req, res).catch(next);
});

router.get('/metrics', authMiddleware, (req, res, next) => {
  clientController.metrics(req, res).catch(next);
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
