import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { resetDatabase } from '../helpers.js';
import { auth, openDirect, registerUser } from '../factories.js';

const app = createApp();

let ana;
let bia;
let caio;

beforeEach(async () => {
  await resetDatabase();
  [ana, bia, caio] = await Promise.all([
    registerUser(app, { username: 'ana' }),
    registerUser(app, { username: 'bia' }),
    registerUser(app, { username: 'caio' }),
  ]);
});
afterAll(() => prisma.$disconnect());

const send = (token, conversationId, content) =>
  request(app)
    .post(`/api/conversations/${conversationId}/messages`)
    .set(auth(token))
    .send({ content });

describe('POST /api/conversations/direct', () => {
  it('cria a conversa (201) e devolve a mesma nas próximas chamadas, de qualquer lado (200)', async () => {
    const first = await request(app)
      .post('/api/conversations/direct')
      .set(auth(ana.token))
      .send({ userId: bia.user.id });
    const again = await request(app)
      .post('/api/conversations/direct')
      .set(auth(bia.token))
      .send({ userId: ana.user.id });

    expect(first.status).toBe(201);
    expect(again.status).toBe(200);
    expect(again.body.conversation.id).toBe(first.body.conversation.id);
    expect(first.body.conversation.participants.map((p) => p.id)).toEqual([bia.user.id]);
    expect(await prisma.conversation.count()).toBe(1);
  });

  it('não duplica a conversa quando os dois abrem ao mesmo tempo', async () => {
    const [a, b] = await Promise.all([
      openDirect(app, ana.token, bia.user.id),
      openDirect(app, bia.token, ana.user.id),
    ]);

    expect(a.id).toBe(b.id);
    expect(await prisma.conversation.count()).toBe(1);
  });

  it('rejeita conversa consigo mesmo (400), usuário inexistente (404) e id malformado (422)', async () => {
    const self = await request(app)
      .post('/api/conversations/direct')
      .set(auth(ana.token))
      .send({ userId: ana.user.id });
    const unknown = await request(app)
      .post('/api/conversations/direct')
      .set(auth(ana.token))
      .send({ userId: '00000000-0000-4000-8000-000000000000' });
    const malformed = await request(app)
      .post('/api/conversations/direct')
      .set(auth(ana.token))
      .send({ userId: 'xyz' });

    expect(self.status).toBe(400);
    expect(unknown.status).toBe(404);
    expect(malformed.status).toBe(422);
  });
});

describe('GET /api/conversations', () => {
  it('ordena pela mensagem mais recente e traz última mensagem e não lidas', async () => {
    const withBia = await openDirect(app, ana.token, bia.user.id);
    const withCaio = await openDirect(app, ana.token, caio.user.id);

    await send(bia.token, withBia.id, 'oi Ana');
    await send(bia.token, withBia.id, 'tudo bem?');
    await send(ana.token, withCaio.id, 'e aí, Caio');

    const res = await request(app).get('/api/conversations').set(auth(ana.token));
    const [first, second] = res.body.conversations;

    expect(res.status).toBe(200);
    expect(first.id).toBe(withCaio.id);
    expect(first.lastMessage).toMatchObject({ content: 'e aí, Caio', status: 'sent' });
    expect(first.unreadCount).toBe(0);
    expect(second.id).toBe(withBia.id);
    expect(second.lastMessage.content).toBe('tudo bem?');
    expect(second.unreadCount).toBe(2);
  });

  it('não lista conversas de que o usuário não participa', async () => {
    await openDirect(app, bia.token, caio.user.id);
    const res = await request(app).get('/api/conversations').set(auth(ana.token));
    expect(res.body.conversations).toEqual([]);
  });
});

describe('mensagens', () => {
  let conversation;
  beforeEach(async () => {
    conversation = await openDirect(app, ana.token, bia.user.id);
  });

  it('envia mensagem com status inicial "sent"', async () => {
    const res = await send(ana.token, conversation.id, '  olá!  ');

    expect(res.status).toBe(201);
    expect(res.body.message).toMatchObject({
      content: 'olá!',
      senderId: ana.user.id,
      status: 'sent',
    });
  });

  it('valida o conteúdo da mensagem', async () => {
    const empty = await send(ana.token, conversation.id, '   ');
    const huge = await send(ana.token, conversation.id, 'x'.repeat(4001));

    expect(empty.status).toBe(422);
    expect(huge.status).toBe(422);
  });

  it('responde 404 para quem não participa da conversa', async () => {
    const read = await request(app)
      .get(`/api/conversations/${conversation.id}/messages`)
      .set(auth(caio.token));
    const write = await send(caio.token, conversation.id, 'intrometido');

    expect(read.status).toBe(404);
    expect(write.status).toBe(404);
  });

  it('reflete as marcas de leitura no status', async () => {
    await send(ana.token, conversation.id, 'leu?');
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: conversation.id, userId: bia.user.id } },
      data: { lastReadAt: new Date(Date.now() + 1000) },
    });

    const res = await request(app)
      .get(`/api/conversations/${conversation.id}/messages`)
      .set(auth(ana.token));
    expect(res.body.messages[0].status).toBe('read');
  });

  describe('paginação por cursor', () => {
    beforeEach(async () => {
      // 45 mensagens; as 10 primeiras com o mesmo createdAt para testar o desempate por id.
      const base = Date.now() - 60_000;
      await prisma.message.createMany({
        data: Array.from({ length: 45 }, (_, i) => ({
          conversationId: conversation.id,
          senderId: i % 2 ? ana.user.id : bia.user.id,
          content: `msg ${i}`,
          createdAt: new Date(i < 10 ? base : base + i * 1000),
        })),
      });
    });

    const page = (cursor, limit = 20) =>
      request(app)
        .get(`/api/conversations/${conversation.id}/messages`)
        .query({ limit, ...(cursor && { cursor }) })
        .set(auth(ana.token));

    it('percorre todo o histórico, da mais nova para a mais antiga, sem repetir nem pular', async () => {
      const seen = [];
      let cursor;
      let pages = 0;
      do {
        const res = await page(cursor);
        expect(res.status).toBe(200);
        seen.push(...res.body.messages);
        cursor = res.body.nextCursor;
        pages += 1;
      } while (cursor);

      expect(pages).toBe(3);
      expect(seen).toHaveLength(45);
      expect(new Set(seen.map((m) => m.id)).size).toBe(45);
      expect(seen[0].content).toBe('msg 44');
      const times = seen.map((m) => new Date(m.createdAt).getTime());
      expect(times).toEqual([...times].sort((a, b) => b - a));
    });

    it('não é afetada por mensagens novas chegando entre uma página e outra', async () => {
      const first = await page(undefined, 20);
      await send(bia.token, conversation.id, 'chegou agora');
      const second = await page(first.body.nextCursor, 20);

      const firstIds = new Set(first.body.messages.map((m) => m.id));
      expect(second.body.messages.some((m) => firstIds.has(m.id))).toBe(false);
      expect(second.body.messages[0].content).toBe('msg 24');
    });

    it('rejeita cursor adulterado', async () => {
      const res = await page('nao-e-um-cursor');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_CURSOR');
    });
  });
});
