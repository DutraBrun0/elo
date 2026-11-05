import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const common = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  handler: (_req, res) =>
    res.status(429).json({
      error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas requisições, tente mais tarde' },
    }),
};

/** Limite geral da API: 300 requisições a cada 15 minutos por IP. */
export const apiLimiter = rateLimit({ ...common, windowMs: 15 * 60 * 1000, limit: 300 });

/** Limite estrito para login/cadastro, contra força bruta: 10 tentativas a cada 15 minutos. */
export const authLimiter = rateLimit({ ...common, windowMs: 15 * 60 * 1000, limit: 10 });
