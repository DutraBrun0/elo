import { conversationRepository } from '../repositories/conversation.repository.js';
import { getConversationOrFail } from './message.service.js';

/**
 * @typedef {object} Receipt
 * @property {string} conversationId
 * @property {string} userId Quem recebeu/leu.
 * @property {Date | null} lastDeliveredAt
 * @property {Date | null} lastReadAt
 * @property {string[]} notifyUserIds Demais participantes, que precisam recalcular o status.
 */

const isBehind = (watermark, lastMessageAt) =>
  watermark === null || watermark.getTime() < lastMessageAt.getTime();

/**
 * Avança a marca escolhida em cada participação que ficou para trás. Participações já
 * em dia são ignoradas, então nenhum evento é emitido à toa.
 * @param {'delivered' | 'read'} kind
 * @param {string} userId
 * @param {string} [conversationId]
 * @returns {Promise<Receipt[]>}
 */
async function advance(kind, userId, conversationId) {
  const now = new Date();
  const participations = await conversationRepository.findParticipations(userId, conversationId);
  const field = kind === 'read' ? 'lastReadAt' : 'lastDeliveredAt';

  const pending = participations.filter((p) => isBehind(p[field], p.conversation.lastMessageAt));

  return Promise.all(
    pending.map(async (p) => {
      // Ler implica ter recebido: a leitura também avança a marca de entrega.
      const data =
        kind === 'read' ? { lastReadAt: now, lastDeliveredAt: now } : { lastDeliveredAt: now };
      const updated = await conversationRepository.updateWatermarks(p.conversationId, userId, data);
      return {
        ...updated,
        notifyUserIds: p.conversation.participants
          .map((x) => x.userId)
          .filter((id) => id !== userId),
      };
    }),
  );
}

export const receiptService = {
  /**
   * Marca como entregues as mensagens pendentes. Sem `conversationId`, vale para todas as
   * conversas (usado quando o usuário conecta).
   * @param {string} userId
   * @param {string} [conversationId]
   */
  async markDelivered(userId, conversationId) {
    if (conversationId) await getConversationOrFail(conversationId, userId);
    return advance('delivered', userId, conversationId);
  },

  /**
   * Marca como lidas todas as mensagens da conversa (o usuário está com ela aberta).
   * @param {string} userId
   * @param {string} conversationId
   */
  async markRead(userId, conversationId) {
    await getConversationOrFail(conversationId, userId);
    return advance('read', userId, conversationId);
  },
};
