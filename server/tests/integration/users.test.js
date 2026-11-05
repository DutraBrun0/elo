import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { resetDatabase } from '../helpers.js';
import { auth, registerUser } from '../factories.js';

const app = createApp();

let me;
beforeEach(async () => {
  await resetDatabase();
  me = await registerUser(app, { name: 'Ana Souza', username: 'ana' });
  await registerUser(app, { name: 'Mariana Lima', username: 'mari' });
  await registerUser(app, { name: 'Bruno Alves', username: 'bruno' });
});
afterAll(() => prisma.$disconnect());

describe('GET /api/users/search', () => {
  it('encontra por username ou nome, sem diferenciar maiúsculas', async () => {
    const res = await request(app).get('/api/users/search?q=AN').set(auth(me.token));

    expect(res.status).toBe(200);
    expect(res.body.users.map((u) => u.username)).toEqual(['mari']);
  });

  it('nunca retorna o próprio usuário nem dados sensíveis', async () => {
    const res = await request(app).get('/api/users/search?q=a').set(auth(me.token));
    const usernames = res.body.users.map((u) => u.username);

    expect(usernames).not.toContain('ana');
    expect(res.body.users[0]).not.toHaveProperty('email');
    expect(res.body.users[0]).not.toHaveProperty('passwordHash');
  });

  it('respeita o limite', async () => {
    const res = await request(app).get('/api/users/search?q=a&limit=1').set(auth(me.token));
    expect(res.body.users).toHaveLength(1);
  });

  it('exige termo de busca e autenticação', async () => {
    const empty = await request(app).get('/api/users/search?q=').set(auth(me.token));
    const anonymous = await request(app).get('/api/users/search?q=a');

    expect(empty.status).toBe(422);
    expect(anonymous.status).toBe(401);
  });
});
