import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.js';

export function adminMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.auth?.role !== 'admin') {
    next(new AppError(403, 'Acesso restrito a administradores.'));
    return;
  }
  next();
}
