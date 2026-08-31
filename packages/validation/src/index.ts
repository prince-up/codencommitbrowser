import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  institutionId: z.string().uuid(),
  role: z.enum(['STUDENT', 'PROCTOR', 'TEACHER', 'INSTITUTION_ADMIN', 'SUPER_ADMIN']).optional(),
});

export const createExamSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  durationMinutes: z.number().positive(),
});

export const submitAnswerSchema = z.object({
  questionId: z.string().uuid(),
  textResponse: z.string().optional(),
  selectedOptionId: z.string().uuid().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateExamInput = z.infer<typeof createExamSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
