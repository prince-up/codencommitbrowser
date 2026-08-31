import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { AIFrameResult } from '../ai/analyzeFrame';

// AI Thresholds (Ideally fetched per-exam from PostgreSQL, kept here for Phase 8 architecture)
const THRESHOLDS = {
  NO_FACE_DURATION_MS: 5000,
  LOOKING_AWAY_DURATION_MS: 3000,
  LOOKING_AWAY_YAW: 25,
  COOLDOWN_MS: 10000 // Debouncing cooldown to reduce false positive spam
};

export class FlagEngine {
  constructor(private redis: IORedis, private prisma: PrismaClient) {}

  async process(sessionId: string, aiResult: AIFrameResult, timestamp: number, frameData: string) {
    await this.checkFaceCount(sessionId, aiResult.faceCount, timestamp, frameData);
    await this.checkHeadPose(sessionId, aiResult.headPose, timestamp, frameData);
    await this.checkDevice(sessionId, aiResult.phoneDetected, frameData);
  }

  private async checkFaceCount(sessionId: string, faceCount: number, timestamp: number, frameData: string) {
    const stateKey = `proctor_state:${sessionId}:no_face`;
    const lastEventKey = `proctor_cooldown:${sessionId}:NO_FACE_DETECTED`;

    if (faceCount === 0) {
      // Temporal smoothing: track duration of the violation before flagging
      const firstSeenStr = await this.redis.get(stateKey);
      if (!firstSeenStr) {
        await this.redis.set(stateKey, timestamp.toString(), 'EX', 60);
      } else {
        const firstSeen = parseInt(firstSeenStr, 10);
        const duration = timestamp - firstSeen;

        if (duration >= THRESHOLDS.NO_FACE_DURATION_MS) {
          const inCooldown = await this.redis.get(lastEventKey);
          if (!inCooldown) {
            await this.generateEvent(sessionId, 'NO_FACE_DETECTED', 'HIGH', 0.95, duration, null, frameData);
            await this.redis.set(lastEventKey, '1', 'PX', THRESHOLDS.COOLDOWN_MS);
          }
        }
      }
    } else {
      // Reset temporal smoothing state immediately if compliance is restored
      await this.redis.del(stateKey);
    }

    if (faceCount > 1) {
      const inCooldown = await this.redis.get(`proctor_cooldown:${sessionId}:MULTIPLE_FACES`);
      if (!inCooldown) {
         await this.generateEvent(sessionId, 'MULTIPLE_FACES', 'HIGH', 0.98, 0, { faceCount }, frameData);
         await this.redis.set(`proctor_cooldown:${sessionId}:MULTIPLE_FACES`, '1', 'PX', THRESHOLDS.COOLDOWN_MS);
      }
    }
  }

  private async checkHeadPose(sessionId: string, headPose: AIFrameResult['headPose'], timestamp: number, frameData: string) {
    if (!headPose) return;

    const stateKey = `proctor_state:${sessionId}:looking_away`;
    const lastEventKey = `proctor_cooldown:${sessionId}:LOOKING_AWAY`;

    if (Math.abs(headPose.yaw) > THRESHOLDS.LOOKING_AWAY_YAW) {
       const firstSeenStr = await this.redis.get(stateKey);
       if (!firstSeenStr) {
         await this.redis.set(stateKey, timestamp.toString(), 'EX', 60);
       } else {
         const firstSeen = parseInt(firstSeenStr, 10);
         const duration = timestamp - firstSeen;

         if (duration >= THRESHOLDS.LOOKING_AWAY_DURATION_MS) {
           const inCooldown = await this.redis.get(lastEventKey);
           if (!inCooldown) {
             await this.generateEvent(sessionId, 'LOOKING_AWAY', 'MEDIUM', 0.91, duration, headPose, frameData);
             await this.redis.set(lastEventKey, '1', 'PX', THRESHOLDS.COOLDOWN_MS);
           }
         }
       }
    } else {
       await this.redis.del(stateKey);
    }
  }

  private async checkDevice(sessionId: string, phoneDetected: boolean, frameData: string) {
    if (!phoneDetected) return;
    
    const inCooldown = await this.redis.get(`proctor_cooldown:${sessionId}:PHONE_DETECTED`);
    if (!inCooldown) {
       await this.generateEvent(sessionId, 'PHONE_DETECTED', 'HIGH', 0.89, 0, null, frameData);
       await this.redis.set(`proctor_cooldown:${sessionId}:PHONE_DETECTED`, '1', 'PX', THRESHOLDS.COOLDOWN_MS);
    }
  }

  private async generateEvent(sessionId: string, eventType: string, severity: 'LOW'|'MEDIUM'|'HIGH', confidence: number, durationMs: number, metadata: any, frameData: string) {
    console.log(`[FlagEngine] 🚩 ${severity} FLAG: ${eventType} in Session ${sessionId}`);
    
    // In Phase 10, frameData will be uploaded to S3.
    const mockS3Url = `https://codenbrowser-s3-bucket.s3.amazonaws.com/evidence/${sessionId}/${Date.now()}.jpg`;

    await this.prisma.proctoringEvent.create({
      data: {
        sessionId,
        eventType,
        severity,
        confidence,
        durationMs,
        metadata: metadata || {},
        evidenceUrl: mockS3Url
      }
    });

    // Notify backend WebSocket nodes via PubSub
    this.redis.publish('proctoring-alerts', JSON.stringify({ sessionId, eventType, severity }));
  }
}
