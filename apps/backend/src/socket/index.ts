import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';
import { Server as HttpServer } from 'http';
import { setupStudentNamespace } from './namespaces/student';
import { setupProctorNamespace } from './namespaces/proctor';
import { setupAdminNamespace } from './namespaces/admin';

export const initializeSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Configured for unreliable client connections
    pingTimeout: 10000, 
    pingInterval: 5000,
  });

  // Redis Adapter for multi-instance horizontal scaling
  const pubClient = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Initialize modular Namespaces
  setupStudentNamespace(io);
  setupProctorNamespace(io);
  setupAdminNamespace(io);

  // Initialize PubSub listener bridging Phase 8 Worker Flags to Phase 9 Dashboards
  const { startAlertReceiver } = require('./alerts');
  startAlertReceiver(io);

  return io;
};
