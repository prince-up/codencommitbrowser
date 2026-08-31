import { Router } from 'express';
import { getUploadUrl, finalizeRecording } from '../controllers/recording.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Students fetch a signed URL to upload their MediaRecorder chunks directly to S3
router.post('/recordings/upload-url', requireAuth, requireRole(['STUDENT']), getUploadUrl);

// Students trigger this when the exam ends to kick off the FFmpeg stitch process
router.post('/recordings/finalize', requireAuth, requireRole(['STUDENT']), finalizeRecording);

export default router;
