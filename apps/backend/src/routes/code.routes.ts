import { Router } from 'express';
import { submitCode, getSubmission } from '../controllers/code.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.post('/code/submit', requireAuth, requireRole(['STUDENT']), submitCode);
router.get('/submissions/:id', requireAuth, requireRole(['STUDENT', 'TEACHER']), getSubmission);

export default router;
