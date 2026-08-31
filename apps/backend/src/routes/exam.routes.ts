import { Router } from 'express';
import { createExam, getExam, startExam, submitExam, submitAnswer, getSession } from '../controllers/exam.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Exam Administration (Teachers/Admins)
router.post('/exams', requireAuth, requireRole(['TEACHER', 'INSTITUTION_ADMIN', 'SUPER_ADMIN']), createExam);
router.get('/exams/:id', requireAuth, getExam); 

// Exam Session Flow (Students)
router.post('/exams/:id/start', requireAuth, requireRole(['STUDENT']), startExam);
router.post('/exams/:id/submit', requireAuth, requireRole(['STUDENT']), submitExam);

// Answers and Session state
router.post('/sessions/:id/answers', requireAuth, requireRole(['STUDENT']), submitAnswer);
router.get('/sessions/:id', requireAuth, requireRole(['STUDENT', 'PROCTOR', 'TEACHER']), getSession);

export default router;
