import { prisma } from '../lib/prisma.js';

/** Campos seguros para expor na API — nunca inclui passwordHash. */
export const publicUserSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  lastSeenAt: true,
};

/**
 * @typedef {object} PublicUser
 * @property {string} id
 * @property {string} name
 * @property {string} username
 * @property {string | null} avatarUrl
 * @property {Date} lastSeenAt
 */

export const userRepository = {
  /**
   * @param {{ name: string, username: string, email: string, passwordHash: string }} data
   * @returns {Promise<PublicUser>}
   */
  create(data) {
    return prisma.user.create({ data, select: publicUserSelect });
  },

  /** @param {string} id @returns {Promise<PublicUser | null>} */
  findById(id) {
    return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  },

  /**
   * Busca pelo e-mail ou username, incluindo o hash da senha (uso exclusivo do login).
   * @param {string} login
   */
  findByLoginWithPassword(login) {
    return prisma.user.findFirst({
      where: { OR: [{ email: login }, { username: login }] },
      select: { ...publicUserSelect, passwordHash: true },
    });
  },

  /**
   * Indica quais campos únicos já estão em uso.
   * @param {{ email: string, username: string }} fields
   * @returns {Promise<{ email: boolean, username: boolean }>}
   */
  async findTakenFields({ email, username }) {
    const users = await prisma.user.findMany({
      where: { OR: [{ email }, { username }] },
      select: { email: true, username: true },
    });
    return {
      email: users.some((u) => u.email === email),
      username: users.some((u) => u.username === username),
    };
  },

  /**
   * Busca usuários por username ou nome (no SQLite, `contains` usa LIKE, que já ignora
   * maiúsculas/minúsculas em ASCII).
   * @param {{ query: string, excludeId: string, limit: number }} params
   * @returns {Promise<PublicUser[]>}
   */
  search({ query, excludeId, limit }) {
    return prisma.user.findMany({
      where: {
        id: { not: excludeId },
        OR: [{ username: { contains: query } }, { name: { contains: query } }],
      },
      select: publicUserSelect,
      orderBy: { username: 'asc' },
      take: limit,
    });
  },

  /** @param {string} id @param {Date} lastSeenAt */
  updateLastSeen(id, lastSeenAt) {
    return prisma.user.update({ where: { id }, data: { lastSeenAt }, select: { id: true } });
  },

  /**
   * @param {string[]} ids
   * @returns {Promise<{ id: string, lastSeenAt: Date }[]>}
   */
  findLastSeen(ids) {
    return prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, lastSeenAt: true },
    });
  },
};
