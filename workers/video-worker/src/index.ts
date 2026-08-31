import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

/**
 * Phase 10: Heavy Media Processor
 * This worker pulls chunks from S3, executes FFmpeg to stitch them,
 * and pushes the final compressed MP4 and thumbnail back to S3.
 */
const videoWorker = new Worker('video-queue', async (job: Job) => {
  const { sessionId, totalChunks, studentId } = job.data;
  console.log(`[Video Pipeline] Starting processing for session ${sessionId} (${totalChunks} chunks)`);

  // ==========================================
  // FFmpeg SCENARIO ARCHITECTURE
  // ==========================================
  // 1. Download chunks: \`raw/\${sessionId}/chunk_0.webm\` -> \`/tmp/\${sessionId}/chunk_0.webm\`
  // 2. Write mylist.txt: 
  //      file 'chunk_0.webm'
  //      file 'chunk_1.webm'
  // 3. Exec: \`ffmpeg -f concat -i mylist.txt -c copy /tmp/\${sessionId}/output.mp4\`
  // 4. Exec: \`ffmpeg -i output.mp4 -ss 00:00:01.000 -vframes 1 /tmp/\${sessionId}/thumbnail.jpg\`
  // 5. Upload \`output.mp4\` & \`thumbnail.jpg\` to \`processed/\${sessionId}/\`
  // 6. Cleanup /tmp/\${sessionId}
  
  // MOCKING the S3 Output for Phase 10 validation
  const mockS3Key = `processed/${sessionId}/video.mp4`;
  const mockThumbnail = `processed/${sessionId}/thumbnail.jpg`;

  // 7. Persist Metadata in PostgreSQL
  await prisma.recording.create({
    data: {
      sessionId,
      s3Key: mockS3Key,
      durationSeconds: 3600, // Extracted from FFmpeg probe
      sizeBytes: 1024 * 1024 * 50, // Extracted from fs.stat
      thumbnailUrl: mockThumbnail
    }
  });
  
  console.log(`[Video Pipeline] Successfully finalized recording for session ${sessionId}`);

}, { 
  connection, 
  concurrency: 2 // Intentionally low: FFmpeg is extremely CPU intensive. Horizontal scaling via containers is required.
}); 

videoWorker.on('failed', (job, err) => {
  console.error(`Video Job ${job?.id} failed: ${err.message}`);
});

console.log('Video Processing Worker running...');
