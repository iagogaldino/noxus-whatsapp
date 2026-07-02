import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { authRoutes } from './routes/auth.routes.js';
import { sectorRoutes } from './routes/sector.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { whatsappRoutes } from './routes/whatsapp.routes.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/sectors', sectorRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/whatsapp', whatsappRoutes);

  app.use(errorMiddleware);

  return app;
}
