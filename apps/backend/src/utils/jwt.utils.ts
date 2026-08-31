import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  role: Role;
  institutionId: string;
}

export const generateAccessToken = (payload: JwtPayload) => {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET as string, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as { userId: string };
};
