import request from 'supertest';

let sequence = 0;

/**
 * Cadastra um usuário pela própria API e devolve `{ user, token }`.
 * @param {import('express').Express} app
 * @param {Partial<{ name: string, username: string, email: string, password: string }>} [overrides]
 */
export async function registerUser(app, overrides = {}) {
  sequence += 1;
  const body = {
    name: `Usuária ${sequence}`,
    username: `user${sequence}`,
    email: `user${sequence}@elo.dev`,
    password: 'senha-forte-123',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`Falha ao criar usuário: ${JSON.stringify(res.body)}`);
  return res.body;
}

/** Gera o cabeçalho Authorization para o Supertest. @param {string} token */
export const auth = (token) => ({ Authorization: `Bearer ${token}` });

/**
 * Cria uma conversa direta entre dois usuários pela API.
 * @param {import('express').Express} app
 * @param {string} token Token de quem abre a conversa.
 * @param {string} otherUserId
 */
export async function openDirect(app, token, otherUserId) {
  const res = await request(app)
    .post('/api/conversations/direct')
    .set(auth(token))
    .send({ userId: otherUserId });
  return res.body.conversation;
}
