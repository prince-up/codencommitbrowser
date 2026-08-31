import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

// Queue dedicated to heavy AI frame analysis
export const proctoringQueue = new Queue('proctoring-queue', { 
  connection,
  defaultJobOptions: {
    removeOnComplete: true, // Do not bloat Redis memory with millions of processed frames
    removeOnFail: 1000      // Keep a small buffer of failed jobs for debugging
  }
});
