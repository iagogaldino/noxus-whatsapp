import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as userService from '../services/user.service.js';

const userBodySchema = z.object({
  phone: z.string().min(10).max(20),
  name: z.string().min(1).max(120),
  role: z.enum(['admin', 'employee']),
  status: z.enum(['active', 'inactive']),
  sectorId: z.string().optional().nullable(),
  department: z.string().max(100).optional(),
});

const userUpdateSchema = userBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Informe ao menos um campo para atualizar.' },
);

export async function listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await userService.listUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = userBodySchema.parse(req.body ?? {});
    const user = await userService.createUser(body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = userUpdateSchema.parse(req.body ?? {});
    const user = await userService.updateUser(req.params.id, body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await userService.deleteUser(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
