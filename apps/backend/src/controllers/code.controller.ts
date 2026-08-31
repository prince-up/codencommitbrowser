import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { compilerQueue } from '../queue/compiler.queue';
import { z } from 'zod';

const submitCodeSchema = z.object({
  questionId: z.string().uuid(),
  language: z.enum(['CPP', 'JAVA', 'PYTHON', 'JAVASCRIPT']),
  code: z.string().max(50000), // Security: 50KB limit to prevent massive payload attacks
});

export const submitCode = async (req: Request, res: Response) => {
  try {
    const data = submitCodeSchema.parse(req.body);
    
    // Verify session is active
    const session = await prisma.examSession.findFirst({
      where: { studentId: req.user!.userId, status: 'IN_PROGRESS' },
      include: { exam: true }
    });

    if (!session) return res.status(403).json({ error: 'No active exam session' });

    // Create tracking record
    const submission = await prisma.codeSubmission.create({
      data: {
        studentId: req.user!.userId,
        questionId: data.questionId,
        language: data.language,
        code: data.code,
        status: 'QUEUED'
      }
    });

    // Offload to BullMQ Redis Queue
    await compilerQueue.add('compile-and-run', { submissionId: submission.id });

    res.status(202).json({ message: 'Code submitted and queued', submissionId: submission.id });
  } catch (error: any) {
    res.status(400).json({ error: error.errors || 'Failed to submit code' });
  }
};

export const getSubmission = async (req: Request, res: Response) => {
  try {
    const submission = await prisma.codeSubmission.findUnique({
      where: { id: req.params.id, studentId: req.user!.userId },
      include: { results: true }
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    res.status(200).json(submission);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};
