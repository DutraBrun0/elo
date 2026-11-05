import { userRepository } from '../repositories/user.repository.js';

export const userService = {
  /**
   * Busca usuários para iniciar conversa, sem incluir quem está buscando.
   * @param {string} requesterId
   * @param {{ q: string, limit: number }} params
   */
  search(requesterId, { q, limit }) {
    return userRepository.search({ query: q.toLowerCase(), excludeId: requesterId, limit });
  },
};
