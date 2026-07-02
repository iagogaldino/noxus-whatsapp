import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/error.middleware.js';
import type { AuthPayload } from '../middleware/auth.middleware.js';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
}

function toPublicUser(user: {
  _id: { toString(): string };
  email: string;
  name: string;
  role: 'admin' | 'employee';
}): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

export async function login(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'E-mail ou senha inválidos.');
  }

  if (user.status === 'inactive') {
    throw new AppError(403, 'Conta inativa. Contate o administrador.');
  }

  const payload: AuthPayload = {
    userId: user._id.toString(),
    email: user.email,
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

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
