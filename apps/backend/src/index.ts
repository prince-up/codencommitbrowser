import { createServer } from 'http';
import app from './app';
import { initializeSocket } from './socket';

const PORT = process.env.PORT || 4000;

// Create raw HTTP server to attach both Express and Socket.IO
const httpServer = createServer(app);

// Initialize WebSockets
initializeSocket(httpServer);

const server = httpServer.listen(PORT, () => {
  console.log(`🚀 API and WebSocket Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
