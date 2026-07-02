import { Router } from 'express';
import * as whatsappController from '../controllers/whatsapp.controller.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export const whatsappRoutes = Router();

whatsappRoutes.use(authMiddleware);

// Chat routes (any authenticated user)
whatsappRoutes.get('/status', whatsappController.getConnectionStatus);
whatsappRoutes.get('/conversations', whatsappController.listConversations);
whatsappRoutes.get('/contacts', whatsappController.getContacts);
whatsappRoutes.get('/conversations/:jid/messages', whatsappController.getConversationMessages);
whatsappRoutes.post('/messages/send', whatsappController.sendMessage);

// Admin-only instance management
whatsappRoutes.get('/instances', adminMiddleware, whatsappController.listInstances);
whatsappRoutes.post('/instances', adminMiddleware, whatsappController.createInstance);
whatsappRoutes.post(
  '/instances/:id/pairing/start',
  adminMiddleware,
  whatsappController.startPairing,
);
whatsappRoutes.get('/instances/:id/status', adminMiddleware, whatsappController.getStatus);
whatsappRoutes.get('/instances/:id/qr', adminMiddleware, whatsappController.getQr);
whatsappRoutes.post('/instances/:id/logout', adminMiddleware, whatsappController.logout);
