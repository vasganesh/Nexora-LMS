/**
 * Forgetting Detection Service
 * 
 * Implements retention decay modeling (inspired by Ebbinghaus forgetting curve).
 * Detects MASTERING -> FORGETTING transitions:
 * - Student previously reached mastery (>80% accuracy) on topic
 * - Time elapsed since last mastery session
 * - Recent quiz error or high hesitation indicates knowledge retention loss
 * - Computes forgetting risk score (0.0 - 1.0)
 * - Configurable thresholds to suggest concept revision before permanent loss.
 */

import { prisma } from '../lib/prisma.js';

export interface ForgettingEvaluationResult {
  isForgetting: boolean;
  retentionScore: number; // 0.0 (lost) to 1.0 (perfect)
  forgettingScore: number; // 0.0 to 1.0
  daysSinceLastActivity: number;
  priorMasteryLevel: number;
  recommendation?: string;
  reason?: string;
}

export class ForgettingDetectionService {
  // Configurable thresholds
  public static readonly DECAY_HALF_LIFE_DAYS = 7; // standard knowledge retention half-life
  public static readonly FORGETTING_ALERT_THRESHOLD = 0.45; // when retention drops below 45% of peak
  public static readonly MASTERY_THRESHOLD = 0.80;

  /**
   * Evaluates if a student is undergoing forgetting in a topic
   */
  public static async evaluateForgetting(
    studentId: string,
    topicId: string,
    currentScore: number
  ): Promise<ForgettingEvaluationResult> {
    try {
      const masteryRecord = await prisma.conceptMastery.findUnique({
        where: {
          studentId_topicId: { studentId, topicId }
        }
      });

      if (!masteryRecord || masteryRecord.masteryScore < this.MASTERY_THRESHOLD) {
        // Not previously mastered, so traditional forgetting doesn't apply
        return {
          isForgetting: false,
          retentionScore: 1.0,
          forgettingScore: 0.0,
          daysSinceLastActivity: 0,
          priorMasteryLevel: masteryRecord ? masteryRecord.masteryScore : 0.0
        };
      }

      // Calculate elapsed days
      const lastActive = masteryRecord.lastAttemptAt || masteryRecord.updatedAt;
      const elapsedMs = Date.now() - new Date(lastActive).getTime();
      const elapsedDays = Math.max(0.1, elapsedMs / (1000 * 60 * 60 * 24));

      // Ebbinghaus exponential decay model: R = e^(-t / S)
      // where S is the retention stability factor (derived from attempts & mastery)
      const stability = this.DECAY_HALF_LIFE_DAYS * (1 + masteryRecord.correctCount * 0.2);
      const theoreticalRetention = Math.exp(-elapsedDays / stability);

      // Empirical performance factor: combine theoretical decay with current score
      const empiricalRetention = (theoreticalRetention * 0.4) + (currentScore * 0.6);
      const forgettingScore = Math.max(0, Math.min(1.0, 1.0 - empiricalRetention));

      const isForgetting = 
        forgettingScore >= this.FORGETTING_ALERT_THRESHOLD &&
        currentScore < 0.65;

      let reason = '';
      let recommendation = '';

      if (isForgetting) {
        reason = `Prior mastery was ${Math.round(masteryRecord.masteryScore * 100)}%, but ${Math.round(elapsedDays)} days elapsed and recent quiz score dropped to ${Math.round(currentScore * 100)}%. Retention risk: ${Math.round(forgettingScore * 100)}%`;
        recommendation = 'Concept Revision & Spaced Retrieval Practice';
      }

      return {
        isForgetting,
        retentionScore: Math.round(empiricalRetention * 100) / 100,
        forgettingScore: Math.round(forgettingScore * 100) / 100,
        daysSinceLastActivity: Math.round(elapsedDays * 10) / 10,
        priorMasteryLevel: masteryRecord.masteryScore,
        recommendation: isForgetting ? recommendation : undefined,
        reason: isForgetting ? reason : undefined
      };
    } catch (error) {
      console.error('Error evaluating forgetting detection:', error);
      return {
        isForgetting: false,
        retentionScore: 1.0,
        forgettingScore: 0.0,
        daysSinceLastActivity: 0,
        priorMasteryLevel: 0.0
      };
    }
  }

  /**
   * Updates or logs concept mastery progress
   */
  public static async updateConceptMastery(
    studentId: string,
    topicId: string,
    score: number,
    isCorrect: boolean
  ) {
    try {
      const existing = await prisma.conceptMastery.findUnique({
        where: {
          studentId_topicId: { studentId, topicId }
        }
      });

      const newAttempts = (existing?.attemptsCount || 0) + 1;
      const newCorrect = (existing?.correctCount || 0) + (isCorrect ? 1 : 0);
      
      // Moving average mastery score
      const oldScore = existing?.masteryScore || score;
      const alpha = 0.3; // smoothing factor
      const updatedMastery = Math.min(1.0, Math.max(0.0, (alpha * score) + ((1 - alpha) * oldScore)));

      return await prisma.conceptMastery.upsert({
        where: {
          studentId_topicId: { studentId, topicId }
        },
        update: {
          masteryScore: Math.round(updatedMastery * 100) / 100,
          attemptsCount: newAttempts,
          correctCount: newCorrect,
          retentionScore: Math.round(updatedMastery * 100),
          lastAttemptAt: new Date(),
          ...(updatedMastery >= 0.85 ? { lastMasteredAt: new Date() } : {})
        },
        create: {
          studentId,
          topicId,
          masteryScore: Math.round(score * 100) / 100,
          attemptsCount: 1,
          correctCount: isCorrect ? 1 : 0,
          retentionScore: Math.round(score * 100),
          lastAttemptAt: new Date(),
          ...(score >= 0.85 ? { lastMasteredAt: new Date() } : {})
        }
      });
    } catch (error) {
      console.error('Error updating concept mastery:', error);
      return null;
    }
  }
}
