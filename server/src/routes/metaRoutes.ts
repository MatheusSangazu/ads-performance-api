import { Router } from 'express';
import metaController from '../controllers/metaController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/authorize', authMiddleware, (req, res) => metaController.authorize(req, res));
router.get('/callback', (req, res) => metaController.callback(req, res));
router.get('/setup', authMiddleware, (req, res) => metaController.setup(req, res));
router.post('/import', authMiddleware, (req, res) => metaController.importAccounts(req, res));
router.get('/ad-accounts', authMiddleware, (req, res) => metaController.adAccounts(req, res));

export default router;
