import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { analyzeFrame } from './ai/analyzeFrame';
import { FlagEngine } from './engine/flagEngine';

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

const flagEngine = new FlagEngine(connection, prisma);

/**
 * Phase 8: AI Proctoring Worker
 * Integrates temporal smoothing, debouncing, and ML inference.
 */
const proctoringWorker = new Worker('proctoring-queue', async (job: Job) => {
  const { sessionId, studentId, frameData, timestamp, resolution } = job.data;
  
  // 1. Run AI Inference on the frame
  const aiResult = await analyzeFrame(frameData);

  // 2. Pass AI data through the deterministic Flag Engine
  // Engine handles temporal smoothing (cooldowns, 3s thresholds, etc.)
  await flagEngine.process(sessionId, aiResult, timestamp, frameData);

}, { connection, concurrency: 10 }); 

proctoringWorker.on('failed', (job, err) => {
  console.error(`Proctoring Job ${job?.id} failed: ${err.message}`);
});

console.log('Proctoring AI Worker running...');
