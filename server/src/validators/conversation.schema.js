import { z } from 'zod';

export const conversationParamsSchema = z.object({
  conversationId: z.uuid('Id de conversa inválido'),
});

export const openDirectSchema = z.object({
  userId: z.uuid('Id de usuário inválido'),
});

export const listMessagesQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'A mensagem não pode estar vazia')
    .max(4000, 'A mensagem deve ter no máximo 4000 caracteres'),
});
