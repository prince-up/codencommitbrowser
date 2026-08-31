import { Request, Response } from 'express';
import { generatePresignedUrl } from '../utils/s3.utils';
import { videoQueue } from '../queue/video.queue';
import prisma from '../db/prisma';

export const getUploadUrl = async (req: Request, res: Response) => {
  try {
    const { sessionId, chunkIndex } = req.body; 
    
    // Structure: raw/{sessionId}/chunk_{index}.webm
    const key = `raw/${sessionId}/chunk_${chunkIndex}.webm`;
    const url = await generatePresignedUrl(key, 'video/webm');
    
    res.json({ url, key });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate S3 upload URL' });
  }
};

export const finalizeRecording = async (req: Request, res: Response) => {
  try {
    const { sessionId, totalChunks } = req.body;
    
    // We do NOT process the video here. We offload it to the video-worker.
    await videoQueue.add('process-recording', {
      sessionId,
      totalChunks,
      studentId: req.user!.userId
    });
    
    res.json({ message: 'Recording queued for FFmpeg processing' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to queue recording' });
  }
};
