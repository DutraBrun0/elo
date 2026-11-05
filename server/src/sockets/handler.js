import { ZodError, z } from 'zod';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

/**
 * Envolve um handler de evento: valida o payload, captura erros e responde pelo
 * `ack` no mesmo formato da API REST (`{ ok, ...dados }` ou `{ ok: false, error }`).
 * @param {import('zod').ZodType | null} schema
 * @param {(payload: any) => Promise<object | void>} fn
 */
export function handle(schema, fn) {
  return async (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    try {
      const data = schema ? schema.parse(payload) : payload;
      const result = await fn(data);
      reply({ ok: true, ...result });
    } catch (error) {
      reply({ ok: false, error: toSocketError(error) });
    }
  };
}

/** @param {unknown} error */
function toSocketError(error) {
  if (error instanceof AppError) return { code: error.code, message: error.message };
  if (error instanceof ZodError) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos',
      details: z.flattenError(error).fieldErrors,
    };
  }
  if (env.NODE_ENV !== 'test') console.error(error);
  return { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' };
}
