import { getConversationOrFail } from '../services/message.service.js';
import { conversationRefSchema } from '../validators/socket.schema.js';
import { emitToUsers } from './emitter.js';
import { handle } from './handler.js';

/**
 * Repassa "digitando..." aos outros participantes. Eventos de digitação são frequentes,
 * então a checagem de participação é feita uma vez por conversa e guardada no socket.
 * Nada é persistido: o cliente expira o indicador sozinho se o "stop" se perder.
 * @param {import('socket.io').Socket} socket
 */
export function registerTypingHandlers(socket) {
  const { userId } = socket.data;
  /** @type {Map<string, string[]>} conversationId → outros participantes */
  const recipientsCache = new Map();

  async function recipientsOf(conversationId) {
    if (!recipientsCache.has(conversationId)) {
      const conversation = await getConversationOrFail(conversationId, userId);
      const others = conversation.participants.map((p) => p.userId).filter((id) => id !== userId);
      recipientsCache.set(conversationId, others);
    }
    return recipientsCache.get(conversationId);
  }

  for (const [event, isTyping] of [
    ['typing:start', true],
    ['typing:stop', false],
  ]) {
    socket.on(
      event,
      handle(conversationRefSchema, async ({ conversationId }) => {
        const recipients = await recipientsOf(conversationId);
        emitToUsers(recipients, 'typing:update', { conversationId, userId, isTyping });
      }),
    );
  }
}
