import { prisma } from '../lib/prisma.js';

export const messageRepository = {
  /**
   * Página de mensagens da mais nova para a mais antiga, começando após o cursor.
   * Busca `limit + 1` para saber se existe próxima página sem um COUNT extra.
   * @param {{ conversationId: string, limit: number, cursor?: { createdAt: Date, id: string } }} params
   */
  findPage({ conversationId, limit, cursor }) {
    return prisma.message.findMany({
      where: {
        conversationId,
        ...(cursor && {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
  },

  /**
   * Cria a mensagem e, na mesma transação, atualiza a ordenação da conversa e marca
   * a mensagem como lida pelo próprio remetente.
   * @param {{ conversationId: string, senderId: string, content: string }} data
   */
  createText({ conversationId, senderId, content }) {
    return prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: { conversationId, senderId, content, type: 'TEXT' },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: message.createdAt },
      });
      await tx.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId: senderId } },
        data: { lastReadAt: message.createdAt, lastDeliveredAt: message.createdAt },
      });
      return message;
    });
  },
};
