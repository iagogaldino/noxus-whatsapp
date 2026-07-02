import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as sectorService from '../services/sector.service.js';

const sectorBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const sectorUpdateSchema = sectorBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Informe ao menos um campo para atualizar.' },
);

export async function listSectors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const includeInactive = req.query.all === 'true' && req.auth?.role === 'admin';
    const sectors = await sectorService.listSectors({ includeInactive });
    res.json(sectors);
  } catch (err) {
    next(err);
  }
}

export async function getSector(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sector = await sectorService.getSectorById(req.params.id);
    res.json(sector);
  } catch (err) {
    next(err);
  }
}

export async function createSector(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = sectorBodySchema.parse(req.body ?? {});
    const sector = await sectorService.createSector(body);
    res.status(201).json(sector);
  } catch (err) {
    next(err);
  }
}

export async function updateSector(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = sectorUpdateSchema.parse(req.body ?? {});
    const sector = await sectorService.updateSector(req.params.id, body);
    res.json(sector);
  } catch (err) {
    next(err);
  }
}

export async function deleteSector(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await sectorService.deleteSector(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
