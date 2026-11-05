import { messageService } from '../services/message.service.js';
import { receiptService } from '../services/receipt.service.js';
import { conversationRefSchema, socketSendMessageSchema } from '../validators/socket.schema.js';
import { emitToUsers } from './emitter.js';
import { handle } from './handler.js';
import { createSocketLimiter } from './rateLimit.js';

const sendLimiter = createSocketLimiter({ limit: 20, windowMs: 10_000 });

/**
 * Envia `receipt:update` para os outros participantes recalcularem o status das mensagens.
 * @param {import('../services/receipt.service.js').Receipt[]} receipts
 */
export function broadcastReceipts(receipts) {
  for (const { notifyUserIds, ...receipt } of receipts) {
    emitToUsers(notifyUserIds, 'receipt:update', receipt);
  }
}

/**
 * Distribui uma mensagem recém-criada aos destinatários e às outras abas do remetente.
 * @param {{ message: object, recipientIds: string[] }} sent
 * @param {string} senderId
 * @param {string} [exceptSocketId] Socket que enviou (ele já recebe a mensagem pelo ack).
 */
export function broadcastNewMessage({ message, recipientIds }, senderId, exceptSocketId) {
  emitToUsers(recipientIds, 'message:new', message);
  emitToUsers([senderId], 'message:new', message, { exceptSocketId });
}

/** @param {import('socket.io').Socket} socket */
export function registerMessageHandlers(socket) {
  const { userId } = socket.data;

  socket.on(
    'message:send',
    handle(socketSendMessageSchema, async ({ conversationId, content, tempId }) => {
      sendLimiter(socket);
      const sent = await messageService.send(userId, conversationId, { content });
      broadcastNewMessage(sent, userId, socket.id);
      return { tempId, message: sent.message };
    }),
  );

  socket.on(
    'conversation:delivered',
    handle(conversationRefSchema, async ({ conversationId }) => {
      broadcastReceipts(await receiptService.markDelivered(userId, conversationId));
    }),
  );

  socket.on(
    'conversation:read',
    handle(conversationRefSchema, async ({ conversationId }) => {
      broadcastReceipts(await receiptService.markRead(userId, conversationId));
      // As outras abas do próprio usuário também zeram o contador de não lidas.
      emitToUsers([userId], 'conversation:read', { conversationId }, { exceptSocketId: socket.id });
    }),
  );
}
