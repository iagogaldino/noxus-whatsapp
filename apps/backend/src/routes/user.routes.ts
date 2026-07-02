import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export const userRoutes = Router();

userRoutes.use(authMiddleware, adminMiddleware);

userRoutes.get('/', userController.listUsers);
userRoutes.post('/', userController.createUser);
userRoutes.get('/:id', userController.getUser);
userRoutes.put('/:id', userController.updateUser);
userRoutes.delete('/:id', userController.deleteUser);
