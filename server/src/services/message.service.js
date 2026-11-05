import { messageRepository } from '../repositories/message.repository.js';
import { conversationRepository } from '../repositories/conversation.repository.js';
import { deriveMessageStatus } from '../utils/messageStatus.js';
import { decodeCursor, encodeCursor } from '../utils/cursor.js';
import { AppError } from '../utils/AppError.js';

/**
 * @typedef {object} MessageDTO
 * @property {string} id
 * @property {string} conversationId
 * @property {string} senderId
 * @property {'TEXT' | 'IMAGE'} type
 * @property {string | null} content
 * @property {string | null} imageUrl
 * @property {Date} createdAt
 * @property {import('../utils/messageStatus.js').MessageStatus} status
 */

/**
 * @param {import('@prisma/client').Message} message
 * @param {import('../utils/messageStatus.js').Watermark[]} participants
 * @returns {MessageDTO}
 */
export function toMessageDTO(message, participants) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    type: message.type,
    content: message.content,
    imageUrl: message.imageUrl,
    createdAt: message.createdAt,
    status: deriveMessageStatus(message, participants),
  };
}

/**
 * Garante que o usuário participa da conversa. Responde 404 (e não 403) para não
 * revelar que uma conversa alheia existe.
 * @param {string} conversationId
 * @param {string} userId
 */
export async function getConversationOrFail(conversationId, userId) {
  const conversation = await conversationRepository.findByIdForUser(conversationId, userId);
  if (!conversation) throw AppError.notFound('Conversa não encontrada');
  return conversation;
}

export const messageService = {
  /**
   * Histórico paginado por cursor, da mensagem mais nova para a mais antiga.
   * @param {string} userId
   * @param {string} conversationId
   * @param {{ cursor?: string, limit: number }} params
   * @returns {Promise<{ messages: MessageDTO[], nextCursor: string | null }>}
   */
  async list(userId, conversationId, { cursor, limit }) {
    const conversation = await getConversationOrFail(conversationId, userId);
    const rows = await messageRepository.findPage({
      conversationId,
      limit,
      cursor: cursor ? decodeCursor(cursor) : undefined,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      messages: page.map((m) => toMessageDTO(m, conversation.participants)),
      nextCursor: hasMore ? encodeCursor(page.at(-1)) : null,
    };
  },

  /**
   * Persiste uma mensagem de texto. Usado pela rota REST e, depois, pelo Socket.IO.
   * @param {string} userId
   * @param {string} conversationId
   * @param {{ content: string }} input
   * @returns {Promise<{ message: MessageDTO, recipientIds: string[] }>}
   */
  async send(userId, conversationId, { content }) {
    const conversation = await getConversationOrFail(conversationId, userId);
    const message = await messageRepository.createText({
      conversationId,
      senderId: userId,
      content,
    });

    return {
      message: toMessageDTO(message, conversation.participants),
      recipientIds: conversation.participants.map((p) => p.userId).filter((id) => id !== userId),
    };
  },
};
