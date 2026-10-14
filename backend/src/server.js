import { createServer } from 'node:http';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';

let server;
try {
  await connectDatabase();
  server = createServer(app);
  server.listen(env.port, () => console.info(`RuangAset API running on port ${env.port} (${env.nodeEnv})`));
} catch (error) {
  console.error('RuangAset failed to start:', error.message);
  process.exit(1);
}

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`${signal} received; shutting down gracefully`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
