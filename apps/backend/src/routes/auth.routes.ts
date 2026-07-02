import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export const authRoutes = Router();

authRoutes.post('/login', authController.login);
authRoutes.get('/me', authMiddleware, authController.me);
