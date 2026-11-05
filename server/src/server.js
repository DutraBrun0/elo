import { createServer } from 'node:http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { createSocketServer } from './sockets/index.js';

const httpServer = createServer(createApp());
const io = createSocketServer(httpServer);

httpServer.listen(env.PORT, () => {
  console.info(`Elo API ouvindo em http://localhost:${env.PORT}`);
});

/** Encerra conexões abertas antes de sair (Docker envia SIGTERM no stop). */
async function shutdown(signal) {
  console.info(`${signal} recebido, encerrando...`);
  io.close();
  httpServer.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
