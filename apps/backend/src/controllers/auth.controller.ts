import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service.js';
import { AppError } from '../middleware/error.middleware.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth?.userId) {
      throw new AppError(401, 'Não autorizado.');
    }

    const user = await authService.getMe(req.auth.userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
