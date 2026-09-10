/**
 * Intervention Service
 * 
 * Coordinates:
 * 1. Adaptive interventions execution and history
 * 2. Teacher-in-the-loop alerts & reviews:
 *    - APPROVE
 *    - MODIFY
 *    - OVERRIDE
 *    - DISMISS
 * 3. Teacher-AI Agreement Rate computation
 */

import { prisma } from '../lib/prisma.js';
import { AdaptiveInterventionDecision } from './adaptiveEngine.js';
import { LearnerStateType } from './learnerStateService.js';

export class InterventionService {
  /**
   * Records an adaptive intervention decided by the engine
   */
  public static async recordAdaptiveIntervention(
    studentId: string,
    topicId: string,
    state: LearnerStateType,
    decision: AdaptiveInterventionDecision,
    isExecuted: boolean = true
  ) {
    try {
      const intervention = await prisma.adaptiveIntervention.create({
        data: {
          studentId,
          topicId,
          detectedState: state,
          interventionLevel: decision.level,
          recommendation: decision.recommendation,
          reason: decision.reason,
          confidence: decision.confidence,
          actionPayload: decision.suggestedActionPayload as any,
          executedAction: isExecuted ? 'EXECUTED' : 'QUEUED'
        }
      });

      // If it requires teacher intervention or review, also queue a TeacherIntervention alert
      if (decision.requiresTeacherReview || decision.level >= 5) {
        await prisma.teacherIntervention.create({
          data: {
            studentId,
            topicId,
            aiRecommendation: decision.recommendation,
            aiConfidence: decision.confidence,
            teacherAction: 'PENDING',
            finalAction: decision.recommendation,
            notes: decision.reason
          }
        });
      }

      return intervention;
    } catch (error) {
      console.error('Error recording adaptive intervention:', error);
      return null;
    }
  }

  /**
   * Fetch adaptive intervention history for a student
   */
  public static async getStudentInterventionHistory(studentId: string) {
    return prisma.adaptiveIntervention.findMany({
      where: { studentId },
      include: {
        topic: true
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    });
  }

  /**
   * Fetch pending and reviewed teacher alerts
   */
  public static async getTeacherInterventions(teacherId?: string, status?: string) {
    return prisma.teacherIntervention.findMany({
      where: {
        ...(status ? { teacherAction: status } : {})
      },
      include: {
        student: {
          include: {
            user: true
          }
        },
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
      orderBy: { timestamp: 'desc' },
      take: 100
    });
  }

  /**
   * Teacher executes an action: APPROVE | MODIFY | OVERRIDE | DISMISS
   */
  public static async processTeacherAction(
    interventionId: string,
    teacherId: string,
    action: 'APPROVE' | 'MODIFY' | 'OVERRIDE' | 'DISMISS',
    details?: {
      teacherNotes?: string;
      overrideAction?: string;
    }
  ) {
    const existing = await prisma.teacherIntervention.findUnique({
      where: { id: interventionId }
    });

    if (!existing) {
      throw new Error('Intervention record not found');
    }

    let finalAction = existing.aiRecommendation;
    if (action === 'OVERRIDE' && details?.overrideAction) {
      finalAction = details.overrideAction;
    } else if (action === 'MODIFY' && details?.overrideAction) {
      finalAction = `Modified: ${details.overrideAction}`;
    } else if (action === 'DISMISS') {
      finalAction = 'Dismissed by teacher';
    }

    const updated = await prisma.teacherIntervention.update({
      where: { id: interventionId },
      data: {
        teacherId,
        teacherAction: action,
        notes: details?.teacherNotes || null,
        teacherOverride: details?.overrideAction || null,
        finalAction
      }
    });

    return updated;
  }

  /**
   * Computes Teacher-AI Agreement Rate across reviewed interventions
   */
  public static async getTeacherAIAgreementStats() {
    try {
      const reviewed = await prisma.teacherIntervention.findMany({
        where: {
          teacherAction: { not: 'PENDING' }
        }
      });

      const total = reviewed.length;
      if (total === 0) {
        return {
          totalReviewed: 0,
          approvedCount: 0,
          modifiedCount: 0,
          overriddenCount: 0,
          dismissedCount: 0,
          agreementRate: 100 // baseline default
        };
      }

      let approved = 0;
      let modified = 0;
      let overridden = 0;
      let dismissed = 0;

      for (const item of reviewed) {
        if (item.teacherAction === 'APPROVE') approved++;
        else if (item.teacherAction === 'MODIFY') modified++;
        else if (item.teacherAction === 'OVERRIDE') overridden++;
        else if (item.teacherAction === 'DISMISS') dismissed++;
      }

      const agreementRate = Math.round((approved / total) * 100);

      return {
        totalReviewed: total,
        approvedCount: approved,
        modifiedCount: modified,
        overriddenCount: overridden,
        dismissedCount: dismissed,
        agreementRate
      };
    } catch (error) {
      console.error('Error calculating Teacher-AI Agreement stats:', error);
      return {
        totalReviewed: 0,
        approvedCount: 0,
        modifiedCount: 0,
        overriddenCount: 0,
        dismissedCount: 0,
        agreementRate: 100
      };
    }
  }
}
