import { AppError } from '../utils/AppError.js';

/**
 * Limite por conexão em janela deslizante simples (o express-rate-limit só cobre HTTP).
 * @param {{ limit: number, windowMs: number }} options
 * @returns {(socket: import('socket.io').Socket) => void} Lança AppError 429 ao estourar.
 */
export function createSocketLimiter({ limit, windowMs }) {
  const hits = new WeakMap();

  return (socket) => {
    const now = Date.now();
    const recent = (hits.get(socket) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      throw new AppError('Muitas mensagens em pouco tempo', 429, 'TOO_MANY_REQUESTS');
    }
    recent.push(now);
    hits.set(socket, recent);
  };
}
