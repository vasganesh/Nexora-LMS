/**
 * State Transition Service
 * 
 * Detects state changes across learning intervals:
 * - PROGRESSING -> STRUGGLING
 * - STRUGGLING -> RECOVERING
 * - RECOVERING -> MASTERING
 * - MASTERING -> FORGETTING
 * - FORGETTING -> RECOVERING
 * - RECOVERING -> PROGRESSING
 * 
 * Avoids unnecessary repeated duplicate transitions and stores full transition history.
 */

import { prisma } from '../lib/prisma.js';
import { LearnerStateType, StatePredictionResult } from './learnerStateService.js';

export interface TransitionEvent {
  hasTransitioned: boolean;
  fromState: LearnerStateType | null;
  toState: LearnerStateType;
  confidence: number;
  triggerReasons: string[];
  transitionRecordId?: string;
}

export class StateTransitionService {
  /**
   * Evaluates if a meaningful state transition has occurred, and persists it.
   */
  public static async recordTransitionIfChanged(
    studentId: string,
    topicId: string,
    prediction: StatePredictionResult,
    previousState?: LearnerStateType | null
  ): Promise<TransitionEvent> {
    const newState = prediction.state;
    const oldState = previousState || null;

    // Check if the state actually changed
    const hasChanged = oldState !== null && oldState !== newState;

    if (!hasChanged && oldState !== null) {
      return {
        hasTransitioned: false,
        fromState: oldState,
        toState: newState,
        confidence: prediction.confidence,
        triggerReasons: prediction.explanationFactors
      };
    }

    // Meaningful transition detected or initial entry
    try {
      const record = await prisma.stateTransition.create({
        data: {
          studentId,
          topicId,
          previousState: oldState || 'PROGRESSING',
          newState: newState,
          confidence: prediction.confidence,
          reason: prediction.explanationFactors.join('; '),
          triggerFeatures: prediction.featureVector as any
        }
      });

      return {
        hasTransitioned: true,
        fromState: oldState,
        toState: newState,
        confidence: prediction.confidence,
        triggerReasons: prediction.explanationFactors,
        transitionRecordId: record.id
      };
    } catch (error) {
      console.error('Error persisting state transition:', error);
      return {
        hasTransitioned: hasChanged,
        fromState: oldState,
        toState: newState,
        confidence: prediction.confidence,
        triggerReasons: prediction.explanationFactors
      };
    }
  }

  /**
   * Retrieves full chronological transition history for a student on a specific topic or overall
   */
  public static async getTransitionTimeline(studentId: string, topicId?: string) {
    return prisma.stateTransition.findMany({
      where: {
        studentId,
        ...(topicId ? { topicId } : {})
      },
      include: {
        topic: true
      },
      orderBy: { timestamp: 'desc' },
      take: 25
    });
  }
}
