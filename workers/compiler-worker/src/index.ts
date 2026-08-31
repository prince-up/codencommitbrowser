import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
// Using standard PrismaClient instantiated independently for the worker process
const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

/**
 * Sandboxed Docker Execution
 * Threat Model Mitigation:
 * - --network none : Prevents data exfiltration and network attacks
 * - --memory 256m : Prevents memory exhaustion attacks
 * - --cpus 1.0 : Prevents CPU starvation
 * - --pids-limit 64 : Prevents fork bombs
 * - -v tmpDir:/app : Strictly mounts only the temporary execution context
 */
const runDockerSandbox = async (language: string, code: string, input: string): Promise<{output: string, error?: string, timeMs: number}> => {
  const tmpDir = path.join('/tmp', `sandbox-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  await fs.mkdir(tmpDir, { recursive: true });
  
  let fileName = '';
  let dockerImage = '';
  let runCmd = '';

  switch (language) {
    case 'PYTHON':
      fileName = 'main.py';
      dockerImage = 'python:3.10-alpine';
      runCmd = 'python main.py';
      break;
    case 'JAVASCRIPT':
      fileName = 'main.js';
      dockerImage = 'node:18-alpine';
      runCmd = 'node main.js';
      break;
    case 'CPP':
      fileName = 'main.cpp';
      dockerImage = 'gcc:13';
      runCmd = 'g++ main.cpp -o main && ./main';
      break;
    case 'JAVA':
      fileName = 'Main.java';
      dockerImage = 'openjdk:21-jdk-slim';
      runCmd = 'javac Main.java && java Main';
      break;
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
  
  await fs.writeFile(path.join(tmpDir, fileName), code);
  await fs.writeFile(path.join(tmpDir, 'input.txt'), input);

  const start = Date.now();
  try {
    const cmd = `docker run --rm --network none --memory 256m --cpus 1.0 --pids-limit 64 -v ${tmpDir}:/app -w /app ${dockerImage} sh -c "${runCmd} < input.txt"`;
    // Timeout applied at the host wrapper level to strictly kill hanging processes
    const { stdout, stderr } = await execAsync(cmd, { timeout: 5000 });
    
    return { output: stdout, timeMs: Date.now() - start, error: stderr };
  } catch (err: any) {
     if (err.killed) return { output: '', error: 'TIME_LIMIT', timeMs: 5000 };
     return { output: '', error: 'RUNTIME_ERROR', timeMs: Date.now() - start };
  } finally {
     // Always cleanup host filesystem
     await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
};

const compilerWorker = new Worker('compiler-queue', async (job: Job) => {
  const { submissionId } = job.data;
  
  console.log(`Processing submission: ${submissionId}`);

  await prisma.codeSubmission.update({
    where: { id: submissionId },
    data: { status: 'RUNNING' }
  });

  const submission = await prisma.codeSubmission.findUnique({
    where: { id: submissionId }
  });
  if (!submission) throw new Error('Submission not found');

  const testCases = await prisma.testCase.findMany({
    where: { questionId: submission.questionId }
  });

  let allPassed = true;

  for (const tc of testCases) {
    const { output, error, timeMs } = await runDockerSandbox(submission.language, submission.code, tc.input);
    
    let status = 'PASSED';
    if (error === 'TIME_LIMIT') status = 'TIME_LIMIT';
    else if (error) status = 'RUNTIME_ERROR';
    else if (output.trim() !== tc.expectedOutput.trim()) status = 'FAILED';

    if (status !== 'PASSED') allPassed = false;

    await prisma.submissionResult.create({
      data: {
        submissionId,
        testCaseId: tc.id,
        status: status as any,
        output: output.substring(0, 1000), // Enforce Output-size limit for DB persistence
        executionTimeMs: timeMs
      }
    });
  }

  await prisma.codeSubmission.update({
    where: { id: submissionId },
    data: { status: allPassed ? 'PASSED' : 'FAILED' }
  });

}, { connection, concurrency: 5 }); // strict concurrency limit to prevent unbounded Docker allocations

compilerWorker.on('completed', job => {
  console.log(`Job ${job.id} has completed!`);
});

compilerWorker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} has failed with ${err.message}`);
});

console.log('Compiler Worker running...');
