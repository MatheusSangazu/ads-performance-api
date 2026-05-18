import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[ERROR] Erro:', err.message);
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Erro interno do servidor.' });
  } else {
    res.status(500).json({ error: err.message || 'Erro interno do servidor.' });
  }
}
