import { presenceService } from '../services/presence.service.js';
import { presenceQuerySchema } from '../validators/socket.schema.js';
import { emitToUsers } from './emitter.js';
import { handle } from './handler.js';

/**
 * Online/offline: avisa os contatos só na primeira conexão e na última desconexão do usuário.
 * @param {import('socket.io').Socket} socket
 */
export async function registerPresenceHandlers(socket) {
  const { userId } = socket.data;

  socket.on(
    'presence:get',
    handle(presenceQuerySchema, async ({ userIds }) => ({
      statuses: await presenceService.getStatuses(userIds),
    })),
  );

  socket.on('disconnect', async () => {
    try {
      const lastSeenAt = await presenceService.disconnect(userId);
      if (lastSeenAt) {
        const audience = await presenceService.audienceOf(userId);
        emitToUsers(audience, 'presence:update', { userId, online: false, lastSeenAt });
      }
    } catch (error) {
      console.error('Falha ao registrar desconexão', error);
    }
  });

  if (presenceService.connect(userId)) {
    const audience = await presenceService.audienceOf(userId);
    emitToUsers(audience, 'presence:update', { userId, online: true, lastSeenAt: null });
  }
}
