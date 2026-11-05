import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { resetDatabase } from '../helpers.js';
import { registerUser } from '../factories.js';

const app = createApp();

const validUser = {
  name: 'Ada Lovelace',
  username: 'Ada.L',
  email: '  ADA@Elo.dev ',
  password: 'senha-forte-123',
};

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('POST /api/auth/register', () => {
  it('cria o usuário, normaliza e-mail/username e devolve token', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'Ada Lovelace', username: 'ada.l' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user).not.toHaveProperty('email');
  });

  it('guarda a senha como hash bcrypt, nunca em texto puro', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const stored = await prisma.user.findUnique({ where: { email: 'ada@elo.dev' } });

    expect(stored.passwordHash).not.toBe(validUser.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('rejeita dados inválidos com 422 e detalhes por campo', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', username: 'a b', email: 'nao-e-email', password: '123' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.details)).toEqual(
      expect.arrayContaining(['name', 'username', 'email', 'password']),
    );
  });

  it('retorna 409 para e-mail já cadastrado', async () => {
    await registerUser(app, { email: 'dup@elo.dev' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'dup@elo.dev' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('retorna 409 para username já em uso', async () => {
    await registerUser(app, { username: 'ada.l' });
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_TAKEN');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => request(app).post('/api/auth/register').send(validUser));

  it.each([['ada@elo.dev'], ['ADA.L']])('autentica com %s', async (login) => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.username).toBe('ada.l');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('retorna 401 genérico para senha errada e para usuário inexistente', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ login: 'ada@elo.dev', password: 'errada-123' });
    const unknownUser = await request(app)
      .post('/api/auth/login')
      .send({ login: 'ninguem@elo.dev', password: 'errada-123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownUser.body.error.message);
  });
});

describe('GET /api/auth/me', () => {
  it('devolve o usuário do token', async () => {
    const { token, user } = await registerUser(app);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it.each([
    ['sem cabeçalho', undefined],
    ['com esquema errado', 'Basic abc'],
    ['com token inválido', 'Bearer abc.def.ghi'],
  ])('retorna 401 %s', async (_label, header) => {
    const req = request(app).get('/api/auth/me');
    if (header) req.set('Authorization', header);
    const res = await req;

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
