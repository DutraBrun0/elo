import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Gera um JWT de acesso para o usuário.
 * @param {string} userId
 * @returns {string}
 */
export function signAccessToken(userId) {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

/**
 * Valida um JWT e devolve o id do usuário. Usado tanto no HTTP quanto no handshake do Socket.IO.
 * @param {string} token
 * @returns {string} userId (claim `sub`)
 * @throws {jwt.JsonWebTokenError | jwt.TokenExpiredError} se o token for inválido ou expirado.
 */
export function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  return /** @type {string} */ (payload.sub);
}
