import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../lib/token.js';
import { userRepository } from '../repositories/user.repository.js';
import { receiptService } from '../services/receipt.service.js';
import { setIo, userRoom } from './emitter.js';
import { broadcastReceipts, registerMessageHandlers } from './messages.js';
import { registerPresenceHandlers } from './presence.js';
import { registerTypingHandlers } from './typing.js';

/**
 * Middleware do handshake: só aceita conexões com JWT válido de um usuário existente.
 * O cliente envia o token em `io(url, { auth: { token } })`.
 * @param {import('socket.io').Socket} socket
 * @param {(err?: Error) => void} next
 */
export async function authenticateSocket(socket, next) {
  try {
    const userId = verifyAccessToken(socket.handshake.auth?.token ?? '');
    const user = await userRepository.findById(userId);
    if (!user) return next(new Error('UNAUTHORIZED'));
    socket.data.userId = userId;
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
}

/**
 * Cria o servidor Socket.IO sobre o mesmo servidor HTTP do Express.
 * @param {import('node:http').Server} httpServer
 * @returns {Server}
 */
export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
    maxHttpBufferSize: 64 * 1024,
  });

  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    const { userId } = socket.data;
    // Cada usuário tem uma sala própria; emitir para "a conversa" é emitir para a sala de cada
    // participante. Assim conversas novas funcionam sem precisar entrar/sair de salas.
    socket.join(userRoom(userId));

    registerMessageHandlers(socket);
    registerTypingHandlers(socket);

    try {
      await registerPresenceHandlers(socket);
      // Conectou: tudo o que chegou enquanto estava offline agora foi entregue.
      broadcastReceipts(await receiptService.markDelivered(userId));
      socket.emit('ready');
    } catch (error) {
      console.error('Falha ao inicializar conexão', error);
    }
  });

  setIo(io);
  return io;
}
