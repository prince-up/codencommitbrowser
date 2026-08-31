import { Socket } from 'socket.io';
import { verifyAccessToken, JwtPayload } from '../utils/jwt.utils';

export interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

export const socketAuthMiddleware = (roles: string[]) => {
  return (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    // Attempt to extract token from handshake auth payload or headers
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }

    try {
      const payload = verifyAccessToken(token);
      if (roles.length > 0 && !roles.includes(payload.role)) {
        return next(new Error('Authorization error: Insufficient permissions'));
      }
      socket.user = payload;
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  };
};
