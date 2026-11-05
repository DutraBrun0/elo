import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { userRepository } from '../repositories/user.repository.js';
import { signAccessToken } from '../lib/token.js';
import { AppError } from '../utils/AppError.js';

const SALT_ROUNDS = 10;
// Hash fixo usado quando o usuário não existe, para que o login leve o mesmo tempo
// nos dois casos e não revele quais e-mails estão cadastrados (timing attack).
const DUMMY_HASH = bcrypt.hashSync('senha-que-nao-existe', SALT_ROUNDS);

/** @typedef {import('../repositories/user.repository.js').PublicUser} PublicUser */
/** @typedef {{ user: PublicUser, token: string }} AuthResult */

export const authService = {
  /**
   * Cadastra um usuário e já devolve um token (login automático após o cadastro).
   * @param {{ name: string, username: string, email: string, password: string }} input
   * @returns {Promise<AuthResult>}
   * @throws {AppError} 409 se e-mail ou username já estiverem em uso.
   */
  async register({ name, username, email, password }) {
    const taken = await userRepository.findTakenFields({ email, username });
    if (taken.email) throw AppError.conflict('E-mail já cadastrado', 'EMAIL_TAKEN');
    if (taken.username) throw AppError.conflict('Nome de usuário indisponível', 'USERNAME_TAKEN');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
      const user = await userRepository.create({ name, username, email, passwordHash });
      return { user, token: signAccessToken(user.id) };
    } catch (error) {
      // Dois cadastros simultâneos podem passar pela checagem acima; a constraint única decide.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw AppError.conflict('E-mail ou nome de usuário já cadastrado', 'USER_TAKEN');
      }
      throw error;
    }
  },

  /**
   * Autentica por e-mail ou username. A mensagem de erro é genérica de propósito.
   * @param {{ login: string, password: string }} input
   * @returns {Promise<AuthResult>}
   * @throws {AppError} 401 se as credenciais forem inválidas.
   */
  async login({ login, password }) {
    const found = await userRepository.findByLoginWithPassword(login);
    const valid = await bcrypt.compare(password, found?.passwordHash ?? DUMMY_HASH);

    if (!found || !valid) throw AppError.unauthorized('E-mail/usuário ou senha incorretos');

    const { passwordHash: _omit, ...user } = found;
    return { user, token: signAccessToken(user.id) };
  },

  /**
   * @param {string} userId
   * @returns {Promise<PublicUser>}
   */
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.unauthorized('Usuário não existe mais');
    return user;
  },
};
