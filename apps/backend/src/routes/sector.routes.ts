import { Router } from 'express';
import * as sectorController from '../controllers/sector.controller.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export const sectorRoutes = Router();

sectorRoutes.use(authMiddleware);

sectorRoutes.get('/', sectorController.listSectors);
sectorRoutes.get('/:id', adminMiddleware, sectorController.getSector);
sectorRoutes.post('/', adminMiddleware, sectorController.createSector);
sectorRoutes.put('/:id', adminMiddleware, sectorController.updateSector);
sectorRoutes.delete('/:id', adminMiddleware, sectorController.deleteSector);
