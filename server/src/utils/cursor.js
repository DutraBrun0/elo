import { AppError } from './AppError.js';

/**
 * Cursor opaco de paginação: codifica (createdAt, id) do último item da página em base64url.
 * O `id` desempata mensagens criadas no mesmo milissegundo.
 * @param {{ createdAt: Date, id: string }} item
 * @returns {string}
 */
export function encodeCursor({ createdAt, id }) {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url');
}

/**
 * @param {string} cursor
 * @returns {{ createdAt: Date, id: string }}
 * @throws {AppError} 400 se o cursor tiver sido adulterado.
 */
export function decodeCursor(cursor) {
  const [iso, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  const createdAt = new Date(iso);
  if (!id || Number.isNaN(createdAt.getTime())) {
    throw new AppError('Cursor de paginação inválido', 400, 'INVALID_CURSOR');
  }
  return { createdAt, id };
}
