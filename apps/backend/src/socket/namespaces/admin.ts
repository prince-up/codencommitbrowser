import { Server } from 'socket.io';
import { AuthenticatedSocket, socketAuthMiddleware } from '../middlewares';

export const setupAdminNamespace = (io: Server) => {
  const adminNs = io.of('/admin');

  adminNs.use(socketAuthMiddleware(['INSTITUTION_ADMIN', 'SUPER_ADMIN']));

  adminNs.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[Socket] Admin connected: ${socket.user!.userId}`);
    
    // Admins join a global alerts room by default
    socket.join('system:alerts');

    socket.on('disconnect', () => {
      console.log(`[Socket] Admin disconnected`);
    });
  });
};
