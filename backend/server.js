import http from 'node:http';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { env } from './src/config/env.js';
import { initializeSockets } from './src/sockets/index.js';

const startServer = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  initializeSockets(httpServer);

  httpServer.listen(env.port, () => {
    console.info(`[server] TaskFlow Pro API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.info(`[server] Received ${signal}. Closing HTTP server...`);
    httpServer.close(() => {
      console.info('[server] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer();

