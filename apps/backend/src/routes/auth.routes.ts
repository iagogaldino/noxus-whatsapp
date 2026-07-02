import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export const authRoutes = Router();

authRoutes.post('/otp/request', authController.requestOtp);
authRoutes.post('/otp/verify', authController.verifyOtp);
authRoutes.get('/me', authMiddleware, authController.me);
