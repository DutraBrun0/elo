import { prisma } from '../lib/prisma.js';
import { publicUserSelect } from './user.repository.js';

/** Participantes com marcas d'água (para derivar status) e dados públicos do usuário. */
const participantsInclude = {
  participants: {
    select: {
      userId: true,
      role: true,
      lastDeliveredAt: true,
      lastReadAt: true,
      user: { select: publicUserSelect },
    },
  },
};

const lastMessageInclude = {
  messages: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1 },
};

export const conversationRepository = {
  /** @param {string} directKey */
  findByDirectKey(directKey) {
    return prisma.conversation.findUnique({
      where: { directKey },
      include: { ...participantsInclude, ...lastMessageInclude },
    });
  },

  /**
   * Cria uma conversa direta com os dois participantes numa única operação.
   * @param {{ directKey: string, userIds: [string, string] }} params
   */
  createDirect({ directKey, userIds }) {
    return prisma.conversation.create({
      data: {
        type: 'DIRECT',
        directKey,
        participants: { create: userIds.map((userId) => ({ userId })) },
      },
      include: { ...participantsInclude, ...lastMessageInclude },
    });
  },

  /**
   * Conversas do usuário, mais recentes primeiro, já com a última mensagem.
   * @param {string} userId
   */
  findManyByUser(userId) {
    return prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: { ...participantsInclude, ...lastMessageInclude },
      orderBy: { lastMessageAt: 'desc' },
    });
  },

  /**
   * Conversa só é retornada se o usuário participar dela.
   * @param {string} conversationId
   * @param {string} userId
   */
  findByIdForUser(conversationId, userId) {
    return prisma.conversation.findFirst({
      where: { id: conversationId, participants: { some: { userId } } },
      include: participantsInclude,
    });
  },

  /**
   * Conta mensagens não lidas de todas as conversas do usuário em UMA consulta
   * (evita N+1 na lista de conversas).
   * @param {string} userId
   * @returns {Promise<Map<string, number>>} conversationId → não lidas
   */
  async countUnreadByUser(userId) {
    const rows = await prisma.$queryRaw`
      SELECT m."conversationId" AS "conversationId", COUNT(*) AS "count"
      FROM "Message" m
      JOIN "ConversationParticipant" p
        ON p."conversationId" = m."conversationId" AND p."userId" = ${userId}
      WHERE m."senderId" <> ${userId}
        AND (p."lastReadAt" IS NULL OR m."createdAt" > p."lastReadAt")
      GROUP BY m."conversationId"
    `;
    return new Map(rows.map((row) => [row.conversationId, Number(row.count)]));
  },

  /**
   * Ids de todos os usuários com quem o usuário tem alguma conversa (destinatários de presença).
   * @param {string} userId
   * @returns {Promise<string[]>}
   */
  async findContactIds(userId) {
    const rows = await prisma.conversationParticipant.findMany({
      where: { conversation: { participants: { some: { userId } } }, userId: { not: userId } },
      select: { userId: true },
      distinct: ['userId'],
    });
    return rows.map((row) => row.userId);
  },

  /**
   * Participações do usuário com o necessário para decidir se as marcas d'água precisam avançar.
   * @param {string} userId
   * @param {string} [conversationId] Limita a uma conversa.
   */
  findParticipations(userId, conversationId) {
    return prisma.conversationParticipant.findMany({
      where: { userId, ...(conversationId && { conversationId }) },
      select: {
        conversationId: true,
        lastDeliveredAt: true,
        lastReadAt: true,
        conversation: {
          select: { lastMessageAt: true, participants: { select: { userId: true } } },
        },
      },
    });
  },

  /**
   * Atualiza as marcas d'água de entrega/leitura de um participante.
   * @param {string} conversationId
   * @param {string} userId
   * @param {{ lastDeliveredAt?: Date, lastReadAt?: Date }} data
   */
  updateWatermarks(conversationId, userId, data) {
    return prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data,
      select: { conversationId: true, userId: true, lastDeliveredAt: true, lastReadAt: true },
    });
  },
};
