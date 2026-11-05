import { userRepository } from '../repositories/user.repository.js';
import { conversationRepository } from '../repositories/conversation.repository.js';

/**
 * Conexões abertas por usuário. Contamos sockets (e não um booleano) para que fechar
 * uma de várias abas não deixe o usuário "offline".
 * Limitação consciente: vive na memória de um único processo. Com várias instâncias,
 * isso iria para o Redis junto com o @socket.io/redis-adapter.
 * @type {Map<string, number>}
 */
const connections = new Map();

/** @typedef {{ userId: string, online: boolean, lastSeenAt: Date | null }} PresenceStatus */

export const presenceService = {
  /**
   * Registra uma conexão. Retorna `true` se o usuário acabou de ficar online (primeira aba).
   * @param {string} userId
   * @returns {boolean}
   */
  connect(userId) {
    const count = (connections.get(userId) ?? 0) + 1;
    connections.set(userId, count);
    return count === 1;
  },

  /**
   * Remove uma conexão. Quando era a última, grava o "visto por último" e retorna o horário.
   * @param {string} userId
   * @returns {Promise<Date | null>} `lastSeenAt` se o usuário ficou offline; `null` se segue online.
   */
  async disconnect(userId) {
    const count = (connections.get(userId) ?? 1) - 1;
    if (count > 0) {
      connections.set(userId, count);
      return null;
    }
    connections.delete(userId);
    const lastSeenAt = new Date();
    await userRepository.updateLastSeen(userId, lastSeenAt);
    return lastSeenAt;
  },

  /** @param {string} userId */
  isOnline(userId) {
    return connections.has(userId);
  },

  /** Usuários que devem ser avisados quando `userId` entra ou sai. @param {string} userId */
  audienceOf(userId) {
    return conversationRepository.findContactIds(userId);
  },

  /**
   * Status atual de vários usuários (estado inicial da UI).
   * @param {string[]} userIds
   * @returns {Promise<PresenceStatus[]>}
   */
  async getStatuses(userIds) {
    const users = await userRepository.findLastSeen(userIds);
    return users.map((u) => ({
      userId: u.id,
      online: connections.has(u.id),
      lastSeenAt: connections.has(u.id) ? null : u.lastSeenAt,
    }));
  },
};
