import { conversationService } from '../services/conversation.service.js';
import { messageService } from '../services/message.service.js';
import { broadcastNewMessage } from '../sockets/messages.js';

export const conversationController = {
  /** @type {import('express').RequestHandler} */
  async list(req, res) {
    const conversations = await conversationService.list(req.userId);
    res.json({ conversations });
  },

  /** 201 quando a conversa é criada, 200 quando já existia. @type {import('express').RequestHandler} */
  async openDirect(req, res) {
    const { conversation, created } = await conversationService.openDirect(
      req.userId,
      req.body.userId,
    );
    res.status(created ? 201 : 200).json({ conversation });
  },

  /** @type {import('express').RequestHandler} */
  async listMessages(req, res) {
    const page = await messageService.list(
      req.userId,
      req.params.conversationId,
      req.validatedQuery,
    );
    res.json(page);
  },

  /** @type {import('express').RequestHandler} */
  async sendMessage(req, res) {
    const sent = await messageService.send(req.userId, req.params.conversationId, req.body);
    broadcastNewMessage(sent, req.userId);
    res.status(201).json({ message: sent.message });
  },
};
