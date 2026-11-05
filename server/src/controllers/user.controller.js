import { userService } from '../services/user.service.js';

export const userController = {
  /** @type {import('express').RequestHandler} */
  async search(req, res) {
    const users = await userService.search(req.userId, req.validatedQuery);
    res.json({ users });
  },
};
