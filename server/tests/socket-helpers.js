import { createServer } from 'node:http';
import { io as connectClient } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { createSocketServer } from '../src/sockets/index.js';
import { setIo } from '../src/sockets/emitter.js';

/**
 * Sobe Express + Socket.IO numa porta aleatória, como em produção.
 * @returns {Promise<{ app: import('express').Express, url: string, close: () => Promise<void> }>}
 */
export async function startServer() {
  const app = createApp();
  const httpServer = createServer(app);
  const io = createSocketServer(httpServer);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address();

  return {
    app,
    url: `http://localhost:${port}`,
    close: async () => {
      setIo(null);
      await io.close();
    },
  };
}

/**
 * Conecta um cliente e espera o servidor terminar de inicializar a conexão (evento "ready").
 * @param {string} url
 * @param {string} token
 * @returns {Promise<import('socket.io-client').Socket>}
 */
export function connect(url, token) {
  const socket = connectClient(url, { auth: { token }, transports: ['websocket'], forceNew: true });
  return new Promise((resolve, reject) => {
    socket.once('ready', () => resolve(socket));
    socket.once('connect_error', (err) => reject(err));
  });
}

/**
 * Espera o próximo evento (opcionalmente filtrado) ou falha após o timeout.
 * @param {import('socket.io-client').Socket} socket
 * @param {string} event
 * @param {(payload: any) => boolean} [predicate]
 */
export function waitFor(socket, event, predicate = () => true, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, listener);
      reject(new Error(`Timeout esperando "${event}"`));
    }, timeoutMs);
    function listener(payload) {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, listener);
      resolve(payload);
    }
    socket.on(event, listener);
  });
}

/**
 * Garante que um evento NÃO chega dentro da janela.
 * @param {import('socket.io-client').Socket} socket
 * @param {string} event
 */
export async function expectNoEvent(socket, event, windowMs = 300) {
  const received = [];
  const listener = (payload) => received.push(payload);
  socket.on(event, listener);
  await new Promise((resolve) => setTimeout(resolve, windowMs));
  socket.off(event, listener);
  if (received.length)
    throw new Error(`"${event}" não deveria ter chegado: ${JSON.stringify(received)}`);
}

/** emit com ack como Promise. @param {import('socket.io-client').Socket} socket */
export const emitWithAck = (socket, event, payload) =>
  socket.timeout(2000).emitWithAck(event, payload);
