import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../db/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.utils';
import { loginSchema, registerSchema } from '@codenbrowser/validation';

export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const existingUser = await prisma.user.findUnique({ where: { email: validatedData.email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validatedData.password, salt);

    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash,
        institutionId: validatedData.institutionId,
        role: validatedData.role || 'STUDENT',
      },
    });

    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (error: any) {
    res.status(400).json({ error: error.errors || 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
      institutionId: user.institutionId,
    });
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        institutionId: user.institutionId,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.errors || 'Login failed' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token provided' });

    const payload = verifyRefreshToken(token);

    const storedToken = await prisma.refreshToken.findUnique({ where: { token } });
    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    // Token rotation
    await prisma.refreshToken.delete({ where: { token } });

    const newAccessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
      institutionId: user.institutionId,
    });
    const newRefreshToken = generateRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }
    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
};
