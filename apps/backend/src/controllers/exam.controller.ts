import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { createExamSchema, submitAnswerSchema } from '@codenbrowser/validation';

export const createExam = async (req: Request, res: Response) => {
  try {
    const data = createExamSchema.parse(req.body);
    const exam = await prisma.exam.create({
      data: {
        ...data,
        institutionId: req.user!.institutionId,
      }
    });
    res.status(201).json(exam);
  } catch (error: any) {
    res.status(400).json({ error: error.errors || 'Failed to create exam' });
  }
};

export const getExam = async (req: Request, res: Response) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: {
        questions: {
          include: {
            options: req.user!.role !== 'STUDENT',
          }
        }
      }
    });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    res.status(200).json(exam);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const startExam = async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;
    const studentId = req.user!.userId;

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    let session = await prisma.examSession.findFirst({
      where: { examId, studentId }
    });

    if (session) {
      return res.status(400).json({ error: 'Session already exists', session });
    }

    session = await prisma.examSession.create({
      data: {
        examId,
        studentId,
        status: 'IN_PROGRESS',
        startTime: new Date()
      }
    });

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start exam' });
  }
};

export const submitAnswer = async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const data = submitAnswerSchema.parse(req.body);
    
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId, studentId: req.user!.userId },
      include: { exam: true }
    });

    if (!session || session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Invalid or inactive session' });
    }

    // Verify time limit (server-authoritative)
    const elapsedMinutes = (new Date().getTime() - session.startTime!.getTime()) / 60000;
    if (elapsedMinutes > session.exam.durationMinutes) {
      await prisma.examSession.update({ where: { id: sessionId }, data: { status: 'TIME_LIMIT' }});
      return res.status(403).json({ error: 'Time limit exceeded' });
    }

    // Upsert answer
    const answer = await prisma.answer.findFirst({
      where: { sessionId, questionId: data.questionId }
    });

    if (answer) {
      await prisma.answer.update({
        where: { id: answer.id },
        data: { textResponse: data.textResponse, selectedOptionId: data.selectedOptionId }
      });
    } else {
      await prisma.answer.create({
        data: {
          sessionId,
          questionId: data.questionId,
          textResponse: data.textResponse,
          selectedOptionId: data.selectedOptionId
        }
      });
    }

    res.status(200).json({ message: 'Answer saved' });
  } catch (error: any) {
    res.status(400).json({ error: error.errors || 'Failed to submit answer' });
  }
};

export const submitExam = async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;
    const session = await prisma.examSession.findFirst({
      where: { examId, studentId: req.user!.userId, status: 'IN_PROGRESS' }
    });

    if (!session) return res.status(404).json({ error: 'Active session not found' });

    await prisma.examSession.update({
      where: { id: session.id },
      data: { status: 'SUBMITTED', endTime: new Date() }
    });

    res.status(200).json({ message: 'Exam submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit exam' });
  }
};

export const getSession = async (req: Request, res: Response) => {
  try {
    const session = await prisma.examSession.findUnique({
      where: { id: req.params.id, studentId: req.user!.userId },
      include: { answers: true }
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
