import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt.utils';
import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireRole = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

export const requirePermission = (permissionCheck: (req: Request) => boolean) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !permissionCheck(req)) {
      return res.status(403).json({ error: 'Forbidden: Action not allowed' });
    }
    next();
  };
};
