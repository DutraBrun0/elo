import { z } from 'zod';
import { sendMessageSchema } from './conversation.schema.js';

export const conversationRefSchema = z.object({
  conversationId: z.uuid('Id de conversa inválido'),
});

export const socketSendMessageSchema = conversationRefSchema.extend({
  content: sendMessageSchema.shape.content,
  /** Id gerado no cliente para casar a mensagem otimista com a confirmada. */
  tempId: z.string().min(1).max(64),
});

export const presenceQuerySchema = z.object({
  userIds: z.array(z.uuid()).max(100),
});
