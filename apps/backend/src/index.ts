import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDb } from './db/connect.js';
import { bootstrapWhatsAppSocket } from './services/whatsapp-socket-bridge.js';
import { createNoxusSocketServer } from './socket/noxus-socket.js';

async function main() {
  await connectDb();

  const app = createApp();
  const httpServer = createServer(app);

  createNoxusSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
    void bootstrapWhatsAppSocket();
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
