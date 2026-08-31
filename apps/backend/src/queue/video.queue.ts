import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

// Queue dedicated to CPU-heavy FFmpeg video concatenation
export const videoQueue = new Queue('video-queue', { connection });
