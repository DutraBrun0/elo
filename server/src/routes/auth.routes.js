import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authLimiter } from '../middlewares/rateLimit.js';
import { loginSchema, registerSchema } from '../validators/auth.schema.js';

export const authRoutes = Router();

authRoutes.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  authController.register,
);
authRoutes.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
authRoutes.get('/me', authenticate, authController.me);
