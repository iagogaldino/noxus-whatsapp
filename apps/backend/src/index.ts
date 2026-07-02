import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDb } from './db/connect.js';

async function main() {
  await connectDb();

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
