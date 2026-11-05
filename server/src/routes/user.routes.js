import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { searchUsersQuerySchema } from '../validators/user.schema.js';

export const userRoutes = Router();

userRoutes.use(authenticate);
userRoutes.get('/search', validate({ query: searchUsersQuerySchema }), userController.search);
