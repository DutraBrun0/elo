import request from 'supertest';
import { prisma } from '../../src/lib/prisma.js';
import { resetDatabase } from '../helpers.js';
import { auth, openDirect, registerUser } from '../factories.js';
import { connect, emitWithAck, expectNoEvent, startServer, waitFor } from '../socket-helpers.js';

let server;
let ana;
let bia;
let caio;
let conversation;
const sockets = [];

/** Conecta e registra o socket para ser fechado ao fim do teste. */
async function online(user) {
  const socket = await connect(server.url, user.token);
  sockets.push(socket);
  return socket;
}

beforeAll(async () => {
  server = await startServer();
});

beforeEach(async () => {
  await resetDatabase();
  [ana, bia, caio] = await Promise.all([
    registerUser(server.app, { username: 'ana' }),
    registerUser(server.app, { username: 'bia' }),
    registerUser(server.app, { username: 'caio' }),
  ]);
  conversation = await openDirect(server.app, ana.token, bia.user.id);
});

afterEach(async () => {
  sockets.splice(0).forEach((s) => s.disconnect());
  // Dá tempo para os handlers de "disconnect" do servidor rodarem antes do próximo teste.
  await new Promise((resolve) => setTimeout(resolve, 50));
});

afterAll(async () => {
  await server.close();
  await prisma.$disconnect();
});

describe('handshake', () => {
  it.each([
    ['sem token', undefined],
    ['com token inválido', 'abc.def.ghi'],
  ])('recusa conexão %s', async (_label, token) => {
    await expect(connect(server.url, token)).rejects.toThrow('UNAUTHORIZED');
  });

  it('recusa token de usuário que não existe mais', async () => {
    await prisma.user.delete({ where: { id: caio.user.id } });
    await expect(connect(server.url, caio.token)).rejects.toThrow('UNAUTHORIZED');
  });
});

describe('message:send', () => {
  it('confirma via ack com o tempId e entrega ao destinatário e às outras abas do remetente', async () => {
    const [anaTab1, anaTab2, biaSocket] = await Promise.all([
      online(ana),
      online(ana),
      online(bia),
    ]);

    const biaReceives = waitFor(biaSocket, 'message:new');
    const otherTabReceives = waitFor(anaTab2, 'message:new');
    const ack = await emitWithAck(anaTab1, 'message:send', {
      conversationId: conversation.id,
      content: 'oi, Bia!',
      tempId: 'tmp-1',
    });

    expect(ack).toMatchObject({ ok: true, tempId: 'tmp-1', message: { content: 'oi, Bia!' } });
    expect((await biaReceives).id).toBe(ack.message.id);
    expect((await otherTabReceives).id).toBe(ack.message.id);
    await expectNoEvent(anaTab1, 'message:new');
  });

  it('responde erro pelo ack para payload inválido ou conversa alheia', async () => {
    const caioSocket = await online(caio);

    const invalid = await emitWithAck(caioSocket, 'message:send', { conversationId: 'x' });
    const foreign = await emitWithAck(caioSocket, 'message:send', {
      conversationId: conversation.id,
      content: 'intrometido',
      tempId: 't',
    });

    expect(invalid).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(foreign).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(await prisma.message.count()).toBe(0);
  });

  it('limita rajadas de mensagens por conexão', async () => {
    const anaSocket = await online(ana);
    const acks = [];
    for (let i = 0; i < 21; i += 1) {
      acks.push(
        await emitWithAck(anaSocket, 'message:send', {
          conversationId: conversation.id,
          content: `spam ${i}`,
          tempId: `t${i}`,
        }),
      );
    }
    expect(acks.slice(0, 20).every((a) => a.ok)).toBe(true);
    expect(acks[20]).toMatchObject({ ok: false, error: { code: 'TOO_MANY_REQUESTS' } });
  });

  it('mensagens enviadas pela rota REST também chegam em tempo real', async () => {
    const biaSocket = await online(bia);
    const received = waitFor(biaSocket, 'message:new');

    await request(server.app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set(auth(ana.token))
      .send({ content: 'via REST' });

    expect((await received).content).toBe('via REST');
  });
});

describe('recibos de entrega e leitura', () => {
  const statusOfLastMessage = async () => {
    const res = await request(server.app)
      .get(`/api/conversations/${conversation.id}/messages`)
      .set(auth(ana.token));
    return res.body.messages[0].status;
  };

  it('sent → delivered → read, avisando o remetente a cada passo', async () => {
    const [anaSocket, biaSocket] = await Promise.all([online(ana), online(bia)]);

    await emitWithAck(anaSocket, 'message:send', {
      conversationId: conversation.id,
      content: 'chegou?',
      tempId: 't',
    });
    expect(await statusOfLastMessage()).toBe('sent');

    const delivered = waitFor(anaSocket, 'receipt:update');
    await emitWithAck(biaSocket, 'conversation:delivered', { conversationId: conversation.id });
    expect(await delivered).toMatchObject({ userId: bia.user.id, lastReadAt: null });
    expect(await statusOfLastMessage()).toBe('delivered');

    const read = waitFor(anaSocket, 'receipt:update', (r) => r.lastReadAt !== null);
    await emitWithAck(biaSocket, 'conversation:read', { conversationId: conversation.id });
    expect(await read).toMatchObject({ conversationId: conversation.id, userId: bia.user.id });
    expect(await statusOfLastMessage()).toBe('read');
  });

  it('ao conectar, marca como entregue o que chegou enquanto o usuário estava offline', async () => {
    const anaSocket = await online(ana);
    await emitWithAck(anaSocket, 'message:send', {
      conversationId: conversation.id,
      content: 'você está offline',
      tempId: 't',
    });

    const delivered = waitFor(anaSocket, 'receipt:update');
    await online(bia);

    expect(await delivered).toMatchObject({ userId: bia.user.id });
    expect(await statusOfLastMessage()).toBe('delivered');
  });

  it('não emite recibo quando não há nada novo para marcar', async () => {
    const [anaSocket, biaSocket] = await Promise.all([online(ana), online(bia)]);
    await emitWithAck(biaSocket, 'conversation:read', { conversationId: conversation.id });
    await expectNoEvent(anaSocket, 'receipt:update');
  });

  it('zera as não lidas nas outras abas de quem leu', async () => {
    const anaSocket = await online(ana);
    const [biaTab1, biaTab2] = await Promise.all([online(bia), online(bia)]);
    await emitWithAck(anaSocket, 'message:send', {
      conversationId: conversation.id,
      content: 'oi',
      tempId: 't',
    });

    const otherTab = waitFor(biaTab2, 'conversation:read');
    await emitWithAck(biaTab1, 'conversation:read', { conversationId: conversation.id });
    expect(await otherTab).toEqual({ conversationId: conversation.id });
  });
});

describe('digitando...', () => {
  it('repassa início e fim só para os outros participantes', async () => {
    const [anaSocket, biaSocket, caioSocket] = await Promise.all([
      online(ana),
      online(bia),
      online(caio),
    ]);

    const start = waitFor(biaSocket, 'typing:update');
    await emitWithAck(anaSocket, 'typing:start', { conversationId: conversation.id });
    expect(await start).toEqual({
      conversationId: conversation.id,
      userId: ana.user.id,
      isTyping: true,
    });

    const stop = waitFor(biaSocket, 'typing:update');
    await emitWithAck(anaSocket, 'typing:stop', { conversationId: conversation.id });
    expect((await stop).isTyping).toBe(false);

    await expectNoEvent(caioSocket, 'typing:update');
  });

  it('recusa digitação em conversa alheia', async () => {
    const caioSocket = await online(caio);
    const ack = await emitWithAck(caioSocket, 'typing:start', { conversationId: conversation.id });
    expect(ack).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});

describe('presença', () => {
  it('avisa os contatos quando o usuário entra e sai, com "visto por último"', async () => {
    const anaSocket = await online(ana);

    const cameOnline = waitFor(anaSocket, 'presence:update', (p) => p.online);
    const biaSocket = await online(bia);
    expect(await cameOnline).toEqual({ userId: bia.user.id, online: true, lastSeenAt: null });

    const wentOffline = waitFor(anaSocket, 'presence:update', (p) => !p.online);
    biaSocket.disconnect();
    const offline = await wentOffline;
    expect(offline.userId).toBe(bia.user.id);
    expect(new Date(offline.lastSeenAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('continua online enquanto houver alguma aba aberta', async () => {
    const anaSocket = await online(ana);
    const biaTab1 = await online(bia);
    await online(bia);

    biaTab1.disconnect();
    await expectNoEvent(anaSocket, 'presence:update');

    const { statuses } = await emitWithAck(anaSocket, 'presence:get', { userIds: [bia.user.id] });
    expect(statuses).toEqual([{ userId: bia.user.id, online: true, lastSeenAt: null }]);
  });

  it('não avisa quem não tem conversa com o usuário', async () => {
    const caioSocket = await online(caio);
    await online(bia);
    await expectNoEvent(caioSocket, 'presence:update');
  });
});
