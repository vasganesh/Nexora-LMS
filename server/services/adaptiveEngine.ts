/**
 * Self-Adaptive Intervention Engine
 * 
 * Implements the Minimum Intervention Principle across 7 levels:
 * LEVEL 0: Normal learning (No intervention needed)
 * LEVEL 1: Hint (Quick scaffold)
 * LEVEL 2: Explanation (Conceptual clarification)
 * LEVEL 3: Worked Example (Step-by-step demonstrated solution)
 * LEVEL 4: Guided Practice (Interactive breakdown with scaffolding)
 * LEVEL 5: Concept Revision (Review prerequisite or foundational theory)
 * LEVEL 6: Teacher Intervention (Human-in-the-loop teacher assistance)
 * 
 * Uses confidence-aware thresholds:
 * >= 0.80 -> Automatic adaptive intervention
 * 0.60 - 0.79 -> Conservative adaptation
 * < 0.60 -> Cautious / teacher monitoring
 */

import { LearnerStateType, StatePredictionResult } from './learnerStateService.js';
import { prisma } from '../lib/prisma.js';

export type InterventionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface AdaptiveInterventionDecision {
  level: InterventionLevel;
  levelName: string;
  recommendation: string;
  reason: string;
  confidence: number;
  autoExecute: boolean;
  requiresTeacherReview: boolean;
  suggestedActionPayload?: {
    hintText?: string;
    explanationText?: string;
    workedExampleSteps?: string[];
    revisionTopic?: string;
  };
}

export class AdaptiveEngine {
  // Configurable thresholds
  public static readonly HIGH_CONFIDENCE_THRESHOLD = 0.80;
  public static readonly MODERATE_CONFIDENCE_THRESHOLD = 0.60;

  /**
   * Decides the intervention level using the Minimum Intervention Principle
   */
  public static async determineIntervention(
    studentId: string,
    topicId: string,
    prediction: StatePredictionResult,
    topicName?: string
  ): Promise<AdaptiveInterventionDecision> {
    const { state, confidence, explanationFactors, featureVector } = prediction;

    // Fetch student's recent intervention history on this topic to honor progressive escalation
    let lastInterventionLevel: InterventionLevel = 0;
    try {
      const recentInterventions = await prisma.adaptiveIntervention.findMany({
        where: { studentId, topicId },
        orderBy: { timestamp: 'desc' },
        take: 5
      });
      if (recentInterventions.length > 0) {
        lastInterventionLevel = (recentInterventions[0].interventionLevel as InterventionLevel);
      }
    } catch (dbErr) {
      // Safe fallback if database query is in mock/test environment
    }

    const currentConcept = topicName || 'this topic';

    // 1. If student is MASTERING or PROGRESSING nicely -> Level 0
    if (state === 'MASTERING' || (state === 'PROGRESSING' && featureVector.correctness === 1)) {
      return {
        level: 0,
        levelName: 'Normal Learning',
        recommendation: `Proceed to next challenge in ${currentConcept}. High confidence mastery maintained.`,
        reason: explanationFactors[0] || 'Steady academic performance with decisive responses.',
        confidence,
        autoExecute: true,
        requiresTeacherReview: false
      };
    }

    // 2. If student is FORGETTING -> Level 5 (Concept Revision)
    if (state === 'FORGETTING') {
      return {
        level: 5,
        levelName: 'Concept Revision',
        recommendation: `Spaced review recommended for ${currentConcept} to restore retention.`,
        reason: explanationFactors.join('. ') || 'Long retention interval with noticeable performance decay.',
        confidence,
        autoExecute: confidence >= this.HIGH_CONFIDENCE_THRESHOLD,
        requiresTeacherReview: confidence < this.MODERATE_CONFIDENCE_THRESHOLD,
        suggestedActionPayload: {
          revisionTopic: currentConcept
        }
      };
    }

    // 3. If student is RECOVERING -> Level 1 (Light reassurance or subtle hint)
    if (state === 'RECOVERING') {
      return {
        level: 1,
        levelName: 'Hint & Positive Reinforcement',
        recommendation: `Provide a quick affirmation or light hint to consolidate recovery in ${currentConcept}.`,
        reason: 'Student showed recent correct answer after prior difficulty.',
        confidence,
        autoExecute: true,
        requiresTeacherReview: false,
        suggestedActionPayload: {
          hintText: `Great turnaround! Remember the core formula for ${currentConcept}.`
        }
      };
    }

    // 4. If student is STRUGGLING -> Apply Minimum Intervention Principle escalation
    if (state === 'STRUGGLING') {
      let targetLevel: InterventionLevel = 1;

      // Minimum Intervention Principle Escalation:
      // First struggle -> Level 1 (Hint)
      // Still struggling -> Level 2 (Explanation)
      // Repeated errors (streak >= 3) -> Level 3 (Worked Example)
      // Persistent difficulty (last level was 3) -> Level 4 (Guided Practice)
      // Severe/unresolved difficulty (last level was 4 or 5) -> Level 6 (Teacher Intervention)

      if (lastInterventionLevel === 0) {
        targetLevel = 1; // Start minimally
      } else if (lastInterventionLevel === 1) {
        targetLevel = 2; // Step up to explanation
      } else if (lastInterventionLevel === 2) {
        targetLevel = 3; // Step up to worked example
      } else if (lastInterventionLevel === 3) {
        targetLevel = 4; // Guided practice
      } else if (lastInterventionLevel >= 4) {
        targetLevel = 6; // Escalate to teacher
      }

      // Fast-track escalation if error streak is very high (>= 4)
      if (featureVector.errorStreak >= 4 && targetLevel < 5) {
        targetLevel = 6;
      }

      const autoExecute = confidence >= this.HIGH_CONFIDENCE_THRESHOLD && targetLevel < 6;
      const requiresTeacherReview = targetLevel === 6 || confidence < this.MODERATE_CONFIDENCE_THRESHOLD;

      const levelDescriptions: Record<InterventionLevel, { name: string; rec: string }> = {
        0: { name: 'Normal Learning', rec: 'Continue quiz.' },
        1: { name: 'Hint', rec: `Provide strategic conceptual hint for ${currentConcept}.` },
        2: { name: 'Explanation', rec: `Display concise conceptual breakdown of key rules in ${currentConcept}.` },
        3: { name: 'Worked Example', rec: `Show step-by-step worked solution demonstrating ${currentConcept}.` },
        4: { name: 'Guided Practice', rec: `Break down ${currentConcept} into scaffolded sub-steps.` },
        5: { name: 'Concept Revision', rec: `Recommend refresher notes and video review for ${currentConcept}.` },
        6: { name: 'Teacher Intervention', rec: `Flag for personalized teacher assistance in ${currentConcept}.` }
      };

      return {
        level: targetLevel,
        levelName: levelDescriptions[targetLevel].name,
        recommendation: levelDescriptions[targetLevel].rec,
        reason: explanationFactors.join('. '),
        confidence,
        autoExecute,
        requiresTeacherReview,
        suggestedActionPayload: {
          hintText: `Key concept in ${currentConcept}: focus on foundational definitions and standard steps.`,
          explanationText: `In ${currentConcept}, remember to double-check intermediate calculation steps.`,
          workedExampleSteps: [
            `Step 1: Identify the given terms in the ${currentConcept} problem.`,
            `Step 2: Apply the governing formula.`,
            `Step 3: Solve algebraically and verify the sign convention.`
          ]
        }
      };
    }

    // Default baseline fallback
    return {
      level: 0,
      levelName: 'Normal Learning',
      recommendation: 'Continue regular learning session.',
      reason: 'Standard progression pattern.',
      confidence: 0.70,
      autoExecute: true,
      requiresTeacherReview: false
    };
  }
}
