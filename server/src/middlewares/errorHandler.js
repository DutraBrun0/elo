import { ZodError, z } from 'zod';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

/**
 * Middleware centralizado de erros. Todas as respostas de erro seguem o formato
 * `{ error: { code, message, details? } }`.
 * @type {import('express').ErrorRequestHandler}
 */
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: z.flattenError(err).fieldErrors,
      },
    });
  }

  // JSON malformado no body (lançado pelo express.json()).
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON inválido' } });
  }

  if (env.NODE_ENV !== 'test') console.error(err);
  return res
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
}

/** Responde 404 para qualquer rota não registrada. @type {import('express').RequestHandler} */
export function notFoundHandler(req, res) {
  res
    .status(404)
    .json({ error: { code: 'NOT_FOUND', message: `Rota ${req.method} ${req.path} não existe` } });
}
