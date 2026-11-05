import { verifyAccessToken } from '../lib/token.js';
import { AppError } from '../utils/AppError.js';

/**
 * Exige `Authorization: Bearer <jwt>` e popula `req.userId`.
 * @type {import('express').RequestHandler}
 */
export function authenticate(req, _res, next) {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    throw AppError.unauthorized('Token de acesso ausente');
  }

  try {
    req.userId = verifyAccessToken(token);
  } catch {
    throw AppError.unauthorized('Token inválido ou expirado');
  }
  next();
}
