import { Server } from 'socket.io';
import { AuthenticatedSocket, socketAuthMiddleware } from '../middlewares';
import prisma from '../../db/prisma';

// Frame rate limiter state map (in-memory per node for efficiency)
const frameRateLimits = new Map<string, number>();
const FRAME_RATE_LIMIT_MS = 1000; // Max 1 frame per second

export const setupStudentNamespace = (io: Server) => {
  const studentNs = io.of('/student');

  // Authorize only students for this namespace
  studentNs.use(socketAuthMiddleware(['STUDENT']));

  studentNs.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user!.userId;
    console.log(`[Socket] Student connected: ${userId}`);

    // Join specific exam and session rooms
    socket.on('student:join', async (data: { examId: string, sessionId: string }) => {
      try {
        const session = await prisma.examSession.findUnique({
          where: { id: data.sessionId, studentId: userId, examId: data.examId }
        });
        
        if (session) {
          socket.join(`exam:${data.examId}`);
          socket.join(`session:${data.sessionId}`);
          socket.emit('exam:status', { status: session.status });
          console.log(`[Socket] Student ${userId} joined session ${data.sessionId}`);
        }
      } catch (err) {
        socket.emit('error', 'Failed to join session');
      }
    });

    // Handle high-volume proctoring frames
    socket.on('proctoring-frame', async (data: { sessionId: string, frameData: string, timestamp: number, resolution: string }) => {
      const now = Date.now();
      const lastFrame = frameRateLimits.get(socket.id) || 0;
      
      // Strict Rate Limiting: drop frames that arrive faster than FRAME_RATE_LIMIT_MS
      if (now - lastFrame < FRAME_RATE_LIMIT_MS) {
        return; 
      }
      frameRateLimits.set(socket.id, now);

      // Phase 7: Push the frame payload to the background Proctoring Pipeline
      // The API server immediately yields and does no heavy AI processing itself
      try {
        const { proctoringQueue } = await import('../../queue/proctoring.queue');
        await proctoringQueue.add('analyze-frame', {
          sessionId: data.sessionId,
          studentId: userId,
          frameData: data.frameData, // Usually Base64 JPEG
          timestamp: data.timestamp,
          resolution: data.resolution
        });
      } catch (err) {
        console.error('[Socket] Failed to push frame to AI queue', err);
      }
      
      // Real-time broadcast to proctors actively monitoring this specific session
      socket.to(`session:${data.sessionId}`).emit('live-frame', {
        studentId: userId,
        frameData: data.frameData,
        timestamp: data.timestamp
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Student disconnected: ${userId}`);
      frameRateLimits.delete(socket.id);
      // Socket.IO automatically handles leaving rooms on disconnect
    });
  });
};
