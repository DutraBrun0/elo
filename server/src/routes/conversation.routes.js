import { Router } from 'express';
import { conversationController } from '../controllers/conversation.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import {
  conversationParamsSchema,
  listMessagesQuerySchema,
  openDirectSchema,
  sendMessageSchema,
} from '../validators/conversation.schema.js';

export const conversationRoutes = Router();

conversationRoutes.use(authenticate);

conversationRoutes.get('/', conversationController.list);
conversationRoutes.post(
  '/direct',
  validate({ body: openDirectSchema }),
  conversationController.openDirect,
);
conversationRoutes.get(
  '/:conversationId/messages',
  validate({ params: conversationParamsSchema, query: listMessagesQuerySchema }),
  conversationController.listMessages,
);
conversationRoutes.post(
  '/:conversationId/messages',
  validate({ params: conversationParamsSchema, body: sendMessageSchema }),
  conversationController.sendMessage,
);
