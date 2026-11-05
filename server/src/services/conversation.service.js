import { Prisma } from '@prisma/client';
import { conversationRepository } from '../repositories/conversation.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { toMessageDTO } from './message.service.js';
import { AppError } from '../utils/AppError.js';

/**
 * Chave única de conversa direta: ids ordenados, então (A, B) e (B, A) geram a mesma chave.
 * @param {string} a
 * @param {string} b
 */
export function buildDirectKey(a, b) {
  return [a, b].sort().join(':');
}

/**
 * Formata a conversa do ponto de vista de quem pede: `participants` traz apenas os outros
 * membros, que é o que a UI exibe (nome/avatar do contato).
 * @param {Awaited<ReturnType<typeof conversationRepository.findByDirectKey>>} conversation
 * @param {string} viewerId
 * @param {number} [unreadCount=0]
 */
function toConversationDTO(conversation, viewerId, unreadCount = 0) {
  const [lastMessage] = conversation.messages ?? [];
  return {
    id: conversation.id,
    type: conversation.type,
    title: conversation.title,
    createdAt: conversation.createdAt,
    lastMessageAt: conversation.lastMessageAt,
    participants: conversation.participants.filter((p) => p.userId !== viewerId).map((p) => p.user),
    lastMessage: lastMessage ? toMessageDTO(lastMessage, conversation.participants) : null,
    unreadCount,
  };
}

export const conversationService = {
  /**
   * Lista as conversas do usuário com última mensagem e contagem de não lidas.
   * @param {string} userId
   */
  async list(userId) {
    const [conversations, unread] = await Promise.all([
      conversationRepository.findManyByUser(userId),
      conversationRepository.countUnreadByUser(userId),
    ]);
    return conversations.map((c) => toConversationDTO(c, userId, unread.get(c.id) ?? 0));
  },

  /**
   * Abre a conversa direta com outro usuário, criando-a se ainda não existir (idempotente).
   * @param {string} userId
   * @param {string} otherUserId
   * @returns {Promise<{ conversation: ReturnType<typeof toConversationDTO>, created: boolean }>}
   */
  async openDirect(userId, otherUserId) {
    if (userId === otherUserId) {
      throw new AppError('Não é possível conversar consigo mesmo', 400, 'SELF_CONVERSATION');
    }
    const other = await userRepository.findById(otherUserId);
    if (!other) throw AppError.notFound('Usuário não encontrado');

    const directKey = buildDirectKey(userId, otherUserId);
    const existing = await conversationRepository.findByDirectKey(directKey);
    if (existing) return { conversation: toConversationDTO(existing, userId), created: false };

    try {
      const conversation = await conversationRepository.createDirect({
        directKey,
        userIds: [userId, otherUserId],
      });
      return { conversation: toConversationDTO(conversation, userId), created: true };
    } catch (error) {
      // O outro usuário criou a mesma conversa no mesmo instante: usamos a dele.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const conversation = await conversationRepository.findByDirectKey(directKey);
        return { conversation: toConversationDTO(conversation, userId), created: false };
      }
      throw error;
    }
  },
};
