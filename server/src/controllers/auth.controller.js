import { authService } from '../services/auth.service.js';

// No Express 5, erros lançados em handlers async chegam sozinhos ao errorHandler,
// por isso não há try/catch nem wrapper asyncHandler aqui.
export const authController = {
  /** @type {import('express').RequestHandler} */
  async register(req, res) {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  },

  /** @type {import('express').RequestHandler} */
  async login(req, res) {
    const result = await authService.login(req.body);
    res.json(result);
  },

  /** @type {import('express').RequestHandler} */
  async me(req, res) {
    const user = await authService.getProfile(req.userId);
    res.json({ user });
  },
};
