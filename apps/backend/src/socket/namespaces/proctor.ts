import { Server } from 'socket.io';
import { AuthenticatedSocket, socketAuthMiddleware } from '../middlewares';
import prisma from '../../db/prisma';

export const setupProctorNamespace = (io: Server) => {
  const proctorNs = io.of('/proctor');

  // Enforce access control: Only staff can connect
  proctorNs.use(socketAuthMiddleware(['PROCTOR', 'TEACHER', 'INSTITUTION_ADMIN']));

  proctorNs.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user!.userId;
    console.log(`[Socket] Proctor connected: ${userId}`);

    // Join general exam room to receive aggregated status updates
    socket.on('proctor:join', async (data: { examId: string }) => {
      // In production, verify proctor assignment to this exam via DB
      socket.join(`exam:${data.examId}`);
      console.log(`[Socket] Proctor ${userId} monitoring exam ${data.examId}`);
    });

    // Actively monitor a specific student's session (to receive live-frames)
    socket.on('proctor:monitor', async (data: { sessionId: string }) => {
      socket.join(`session:${data.sessionId}`);
      console.log(`[Socket] Proctor ${userId} monitoring session ${data.sessionId}`);
    });

    socket.on('proctor:unmonitor', (data: { sessionId: string }) => {
      socket.leave(`session:${data.sessionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Proctor disconnected: ${userId}`);
    });
  });
};
