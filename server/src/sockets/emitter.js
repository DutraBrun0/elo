/**
 * Ponte entre o restante da aplicação (ex.: controllers REST) e o Socket.IO, sem
 * que eles precisem conhecer o servidor. Sem `io` (testes HTTP puros), vira no-op.
 * @type {import('socket.io').Server | null}
 */
let io = null;

/** @param {import('socket.io').Server | null} server */
export function setIo(server) {
  io = server;
}

/** Sala pessoal do usuário: todas as abas/dispositivos dele entram nela. @param {string} userId */
export const userRoom = (userId) => `user:${userId}`;

/**
 * Emite um evento para todas as conexões de cada usuário.
 * @param {string[]} userIds
 * @param {string} event
 * @param {unknown} payload
 * @param {{ exceptSocketId?: string }} [options] Não reenvia para o socket que originou o evento.
 */
export function emitToUsers(userIds, event, payload, { exceptSocketId } = {}) {
  if (!io || userIds.length === 0) return;
  let target = io.to(userIds.map(userRoom));
  if (exceptSocketId) target = target.except(exceptSocketId);
  target.emit(event, payload);
}
