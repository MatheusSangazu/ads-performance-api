import type { Request, Response } from 'express';
import crypto from 'crypto';
import type { AuthRequest } from '../middleware/auth.js';
import { env } from '../config/env.js';
import * as metaAuthService from '../services/metaAuthService.js';

class MetaController {
  authorize(req: AuthRequest, res: Response) {
    if (!req.manager) {
      res.status(401).json({ error: 'Não autenticado.' });
      return;
    }

    const state = Buffer.from(
      JSON.stringify({
        managerId: req.manager.id,
        nonce: crypto.randomBytes(8).toString('hex'),
      })
    ).toString('base64url');

    const url = metaAuthService.getAuthorizationUrl(state);
    res.json({ url });
  }

  async callback(req: Request, res: Response) {
    const { code, state, error, error_reason } = req.query;
    const frontendUrl = env.CORS_ORIGIN || `http://localhost:5173`;

    if (error) {
      res.redirect(`${frontendUrl}/clients?meta_error=${encodeURIComponent(String(error_reason || error))}`);
      return;
    }

    if (!code || !state) {
      res.status(400).send('Parâmetros inválidos no callback.');
      return;
    }

    try {
      const { setupId } = await metaAuthService.processOAuthCallback(code as string);
      res.redirect(`${frontendUrl}/clients?meta_setup=${setupId}`);
    } catch (err: any) {
      console.error('[Meta OAuth] Erro no callback:', err.message);
      res.redirect(`${frontendUrl}/clients?meta_error=callback_failed`);
    }
  }

  async setup(req: AuthRequest, res: Response) {
    if (!req.manager) {
      res.status(401).json({ error: 'Não autenticado.' });
      return;
    }

    const { setupId } = req.query;
    if (!setupId || typeof setupId !== 'string') {
      res.status(400).json({ error: 'setupId é obrigatório.' });
      return;
    }

    const data = metaAuthService.getSetupData(setupId);
    if (!data) {
      res.status(410).json({ error: 'Sessão expirada. Conecte novamente.' });
      return;
    }

    const limit = await metaAuthService.getManagerLimit(req.manager.id);

    res.json({ setupId, accounts: data.accounts, limit });
  }

  async importAccounts(req: AuthRequest, res: Response) {
    if (!req.manager) {
      res.status(401).json({ error: 'Não autenticado.' });
      return;
    }

    const { setupId, accountIds } = req.body;
    if (!setupId || !Array.isArray(accountIds) || accountIds.length === 0) {
      res.status(400).json({ error: 'setupId e accountIds são obrigatórios.' });
      return;
    }

    try {
      const result = await metaAuthService.importAccounts(
        req.manager.id,
        setupId,
        accountIds
      );
      res.json(result);
    } catch (err: any) {
      console.error('[Meta OAuth] Erro ao importar contas:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  async adAccounts(req: AuthRequest, res: Response) {
    if (!req.manager) {
      res.status(401).json({ error: 'Não autenticado.' });
      return;
    }

    const { act_id } = req.query;
    if (!act_id || typeof act_id !== 'string') {
      res.status(400).json({ error: 'act_id é obrigatório.' });
      return;
    }

    try {
      const client = await metaAuthService.getClientByActId(act_id);
      if (!client) {
        res.status(404).json({ error: 'Cliente não encontrado.' });
        return;
      }

      const accounts = await metaAuthService.getAdAccounts(client.accessToken);
      res.json({ accounts });
    } catch (err: any) {
      console.error('[Meta OAuth] Erro ao buscar ad accounts:', err.message);
      res.status(500).json({ error: 'Erro ao buscar contas de anúncio.' });
    }
  }
}

export default new MetaController();
