import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/error.middleware.js';
import type { AuthPayload } from '../middleware/auth.middleware.js';
import * as otpService from './otp.service.js';

export interface PublicUser {
  id: string;
  phone: string;
  name: string;
  role: 'admin' | 'employee';
}

function toPublicUser(user: {
  _id: { toString(): string };
  phone: string;
  name: string;
  role: 'admin' | 'employee';
}): PublicUser {
  return {
    id: user._id.toString(),
    phone: user.phone,
    name: user.name,
    role: user.role,
  };
}

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export async function requestOtp(phone: string) {
  return otpService.requestOtp(phone);
}

export async function verifyOtp(phone: string, code: string) {
  const { phone: normalizedPhone } = await otpService.verifyOtp(phone, code);

  const user = await User.findOne({ phone: normalizedPhone });
  if (!user) {
    throw new AppError(403, 'Telefone não cadastrado. Contate o administrador.');
  }

  if (user.status === 'inactive') {
    throw new AppError(403, 'Conta inativa. Contate o administrador.');
  }

  const payload: AuthPayload = {
    userId: user._id.toString(),
    phone: user.phone,
    role: user.role,
  };

  return {
    token: signToken(payload),
    user: toPublicUser(user),
  };
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(401, 'Não autorizado.');
  }

  if (user.status === 'inactive') {
    throw new AppError(403, 'Conta inativa. Contate o administrador.');
  }

  return toPublicUser(user);
}
