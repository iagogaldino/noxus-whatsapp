import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service.js';
import { AppError } from '../middleware/error.middleware.js';

const requestOtpSchema = z.object({
  phone: z.string().min(10).max(20),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(20),
  code: z.string().min(4).max(4),
});

export async function requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone } = requestOtpSchema.parse(req.body);
    const result = await authService.requestOtp(phone);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone, code } = verifyOtpSchema.parse(req.body);
    const result = await authService.verifyOtp(phone, code);
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
