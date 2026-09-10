/**
 * Learner State Service
 * 
 * Classifies students into the 5 core states:
 * 1. PROGRESSING - Moving forward steadily with normal progress
 * 2. MASTERING - High accuracy, quick confident response, low hesitation
 * 3. STRUGGLING - Repeated errors, high hesitation, prolonged response times
 * 4. RECOVERING - Previous difficulty followed by recent accuracy gains
 * 5. FORGETTING - Previously mastered topic showing sudden accuracy drop & delay
 */

import { prisma } from '../lib/prisma.js';
import { LearnerFeatureVector, LearnerFeatureService } from './learnerFeatureService.js';

export type LearnerStateType = 
  | 'PROGRESSING'
  | 'MASTERING'
  | 'STRUGGLING'
  | 'RECOVERING'
  | 'FORGETTING';

export interface StatePredictionResult {
  state: LearnerStateType;
  confidence: number; // 0.0 to 1.0
  probabilities: Record<LearnerStateType, number>;
  explanationFactors: string[];
  featureVector: LearnerFeatureVector;
  isFallback: boolean; // Cold start vs Edge AI
}

import { execFile } from 'child_process';
import path from 'path';

export class LearnerStateService {
  /**
   * Invokes the trained Edge AI Python model if available,
   * falling back gracefully to the deterministic calibrated evaluator.
   */
  public static async predictStateWithEdgeAI(
    vector: LearnerFeatureVector,
    previousState?: LearnerStateType | null,
    topicName?: string
  ): Promise<StatePredictionResult> {
    const pythonScript = path.join(process.cwd(), 'edge-ai', 'predict.py');
    const payload = {
      ...vector,
      topic_name: topicName || 'Academic Concept',
      previous_state: previousState
    };

    return new Promise<StatePredictionResult>((resolve) => {
      execFile('python3', [pythonScript, JSON.stringify(payload)], { timeout: 1500 }, (error, stdout) => {
        if (!error && stdout) {
          try {
            const edgeResult = JSON.parse(stdout.trim());
            return resolve({
              state: edgeResult.state as LearnerStateType,
              confidence: edgeResult.confidence,
              probabilities: edgeResult.probabilities,
              explanationFactors: edgeResult.explanation_factors || LearnerFeatureService.generateExplanationFactors(vector, edgeResult.state),
              featureVector: vector,
              isFallback: false
            });
          } catch (parseErr) {
            // Fall through to deterministic evaluator
          }
        }
        // Graceful fallback to calibrated deterministic evaluation
        const fallbackResult = this.predictState(vector, previousState);
        fallbackResult.isFallback = true;
        resolve(fallbackResult);
      });
    });
  }

  /**
   * Evaluates feature vector to predict the 5 learner states
   * with full multi-class probabilities & calibrated confidence.
   */
  public static predictState(
    vector: LearnerFeatureVector,
    previousState?: LearnerStateType | null
  ): StatePredictionResult {
    // Multi-factor weighted evidence accumulators
    const scores: Record<LearnerStateType, number> = {
      PROGRESSING: 0.2, // baseline prior
      MASTERING: 0.1,
      STRUGGLING: 0.1,
      RECOVERING: 0.05,
      FORGETTING: 0.05
    };

    // Factor 1: Immediate correctness & streak
    if (vector.correctness === 1) {
      if (vector.recentAccuracy >= 0.85 && vector.hesitationIndex <= 0.35) {
        scores.MASTERING += 0.45;
        scores.PROGRESSING += 0.25;
      } else {
        scores.PROGRESSING += 0.40;
      }

      // If they were previously STRUGGLING or FORGETTING, and now got it correct -> RECOVERING transition
      if (previousState === 'STRUGGLING' || previousState === 'FORGETTING') {
        scores.RECOVERING += 0.70;
        scores.MASTERING = 0.05; // Cannot jump directly from struggling to mastering in a single question
      }
    } else {
      // Incorrect answer
      if (vector.errorStreak >= 2 || vector.hesitationIndex >= 0.60) {
        scores.STRUGGLING += 0.50;
      } else {
        scores.STRUGGLING += 0.30;
        scores.PROGRESSING += 0.10;
      }

      // If previously mastered, check for forgetting
      if (
        (previousState === 'MASTERING' || vector.historicalAccuracy >= 0.80) &&
        vector.recentAccuracy < 0.60
      ) {
        scores.FORGETTING += 0.55;
      }
    }

    // Factor 2: Hesitation Index influence
    if (vector.hesitationIndex >= 0.70) {
      scores.STRUGGLING += 0.25;
      scores.FORGETTING += 0.15;
      scores.MASTERING -= 0.20;
    } else if (vector.hesitationIndex <= 0.25) {
      scores.MASTERING += 0.25;
      scores.STRUGGLING -= 0.20;
    }

    // Factor 3: Option switching & delay
    if (vector.optionSwitchCount >= 3) {
      scores.STRUGGLING += 0.15;
    }

    // Prevent negative weights
    for (const key of Object.keys(scores) as LearnerStateType[]) {
      scores[key] = Math.max(0.01, scores[key]);
    }

    // Softmax normalization into probabilities
    const sumScores = Object.values(scores).reduce((a, b) => a + b, 0);
    const probabilities: Record<LearnerStateType, number> = {
      PROGRESSING: Math.round((scores.PROGRESSING / sumScores) * 1000) / 1000,
      MASTERING: Math.round((scores.MASTERING / sumScores) * 1000) / 1000,
      STRUGGLING: Math.round((scores.STRUGGLING / sumScores) * 1000) / 1000,
      RECOVERING: Math.round((scores.RECOVERING / sumScores) * 1000) / 1000,
      FORGETTING: Math.round((scores.FORGETTING / sumScores) * 1000) / 1000
    };

    // Determine highest probability state
    let topState: LearnerStateType = 'PROGRESSING';
    let maxProb = -1;

    for (const [stateKey, prob] of Object.entries(probabilities) as [LearnerStateType, number][]) {
      if (prob > maxProb) {
        maxProb = prob;
        topState = stateKey;
      }
    }

    const confidence = Math.min(0.98, Math.max(0.55, maxProb));
    const explanationFactors = LearnerFeatureService.generateExplanationFactors(vector, topState);

    return {
      state: topState,
      confidence: Math.round(confidence * 100) / 100,
      probabilities,
      explanationFactors,
      featureVector: vector,
      isFallback: false
    };
  }

  /**
   * Persists or updates the current learner state in Prisma database
   */
  public static async saveLearnerState(
    studentId: string,
    topicId: string,
    prediction: StatePredictionResult,
    previousState?: LearnerStateType | null
  ) {
    try {
      const existing = await prisma.learnerState.findUnique({
        where: {
          studentId_topicId: { studentId, topicId }
        }
      });

      if (existing) {
        return await prisma.learnerState.update({
          where: { id: existing.id },
          data: {
            previousState: existing.currentState,
            currentState: prediction.state,
            confidence: prediction.confidence,
            reason: prediction.explanationFactors.join('; '),
            features: prediction.featureVector as any,
            updatedAt: new Date()
          }
        });
      } else {
        return await prisma.learnerState.create({
          data: {
            studentId,
            topicId,
            currentState: prediction.state,
            previousState: previousState || null,
            confidence: prediction.confidence,
            reason: prediction.explanationFactors.join('; '),
            features: prediction.featureVector as any
          }
        });
      }
    } catch (error) {
      console.error('Error in saveLearnerState:', error);
      return null;
    }
  }

  /**
   * Retrieves current learner states for a student across all topics
   */
  public static async getStudentLearnerStates(studentId: string) {
    return prisma.learnerState.findMany({
      where: { studentId },
      include: {
        topic: {
          include: {
            chapter: {
              include: {
                unit: {
                  include: {
                    subject: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  /**
   * Retrieves single topic learner state
   */
  public static async getTopicLearnerState(studentId: string, topicId: string) {
    return prisma.learnerState.findUnique({
      where: {
        studentId_topicId: { studentId, topicId }
      },
      include: {
        topic: true
      }
    });
  }
}
