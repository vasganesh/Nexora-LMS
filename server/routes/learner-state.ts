/**
 * Learner State Router
 * 
 * Endpoints for Edge AI learner state inference, state queries, and transition histories.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { LearnerFeatureService, RawInteractionMetrics, AcademicMetrics } from '../services/learnerFeatureService.js';
import { LearnerStateService, LearnerStateType } from '../services/learnerStateService.js';
import { StateTransitionService } from '../services/stateTransitionService.js';
import { AdaptiveEngine } from '../services/adaptiveEngine.js';
import { ForgettingDetectionService } from '../services/forgettingDetectionService.js';
import { InterventionService } from '../services/interventionService.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

/**
 * POST /api/learner-state/infer
 * Executes the complete continuous loop:
 * Raw interactions + Academic metrics -> Vector -> Inference -> State Transition -> Adaptive Intervention -> Save
 */
router.post('/infer', requireAuth, async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId || req.body.studentId;
    const { topicId, topicName, academic, interaction } = req.body;

    if (!studentId || !topicId) {
      return res.status(400).json({ error: 'studentId and topicId are required' });
    }

    // 1. Feature Extraction (Privacy-Safe Aggregates)
    const rawInteraction: RawInteractionMetrics = {
      questionStartTime: interaction?.questionStartTime || Date.now() - 15000,
      answerSubmissionTime: interaction?.answerSubmissionTime || Date.now(),
      firstInteractionTime: interaction?.firstInteractionTime,
      answerChanges: interaction?.answerChanges || 0,
      optionSwitches: interaction?.optionSwitches || 0,
      backtrackCount: interaction?.backtrackCount || 0,
      clickCount: interaction?.clickCount || 1,
      hoverDurationMs: interaction?.hoverDurationMs || 0,
      mouseDistancePx: interaction?.mouseDistancePx || 0,
      averageMouseSpeed: interaction?.averageMouseSpeed || 0,
      mousePauses: interaction?.mousePauses || 0,
      mouseJitter: interaction?.mouseJitter || 0,
      totalTimeSpentMs: interaction?.totalTimeSpentMs || 15000
    };

    const academicMetrics: AcademicMetrics = {
      isCorrect: Boolean(academic?.isCorrect),
      score: typeof academic?.score === 'number' ? academic.score : (academic?.isCorrect ? 1.0 : 0.0),
      attempts: academic?.attempts || 1,
      errorStreak: academic?.errorStreak || 0,
      recentAccuracy: academic?.recentAccuracy,
      historicalAccuracy: academic?.historicalAccuracy,
      timeSpentLearningSec: academic?.timeSpentLearningSec || 15,
      hintRequested: Boolean(academic?.hintRequested)
    };

    const featureVector = LearnerFeatureService.extractFeatureVector(academicMetrics, rawInteraction);

    // Save privacy-safe interaction log
    await prisma.learnerInteraction.create({
      data: {
        studentId,
        topicId,
        questionId: req.body.questionId || null,
        isCorrect: academicMetrics.isCorrect,
        score: academicMetrics.score,
        responseDelaySec: featureVector.responseDelaySec,
        hesitationIndex: featureVector.hesitationIndex,
        optionSwitchCount: featureVector.optionSwitchCount,
        clickCount: featureVector.clickCount,
        mouseDistancePx: rawInteraction.mouseDistancePx,
        averageMouseSpeed: rawInteraction.averageMouseSpeed,
        mousePauseCount: rawInteraction.mousePauses,
        hoverDurationSec: featureVector.hoverDurationSec,
        features: featureVector as any
      }
    }).catch(err => console.error('Non-blocking interaction log error:', err));

    // 2. Fetch previous state & check forgetting
    const existingState = await prisma.learnerState.findUnique({
      where: { studentId_topicId: { studentId, topicId } }
    });
    const previousState = (existingState?.currentState as LearnerStateType) || null;

    const forgettingEval = await ForgettingDetectionService.evaluateForgetting(
      studentId,
      topicId,
      academicMetrics.score
    );

    // 3. Learner-State Inference (Edge AI model with resilient fallback)
    const prediction = await LearnerStateService.predictStateWithEdgeAI(featureVector, previousState, topicName);

    // If forgetting detector flagged it, override to FORGETTING if confidence matches
    if (forgettingEval.isForgetting && prediction.state !== 'FORGETTING') {
      prediction.state = 'FORGETTING';
      prediction.explanationFactors.unshift(forgettingEval.reason || 'Memory decay detected after prolonged interval');
    }

    // 4. State Transition Detection
    const transition = await StateTransitionService.recordTransitionIfChanged(
      studentId,
      topicId,
      prediction,
      previousState
    );

    // 5. Persist Learner State
    await LearnerStateService.saveLearnerState(studentId, topicId, prediction, previousState);

    // 6. Update Concept Mastery
    await ForgettingDetectionService.updateConceptMastery(
      studentId,
      topicId,
      academicMetrics.score,
      academicMetrics.isCorrect
    );

    // 7. Adaptive Intervention Engine
    const decision = await AdaptiveEngine.determineIntervention(
      studentId,
      topicId,
      prediction,
      topicName
    );

    // 8. Record Intervention
    const interventionRecord = await InterventionService.recordAdaptiveIntervention(
      studentId,
      topicId,
      prediction.state,
      decision,
      decision.autoExecute
    );

    return res.json({
      success: true,
      data: {
        prediction,
        transition,
        intervention: decision,
        interventionRecordId: interventionRecord?.id,
        hesitationIndex: featureVector.hesitationIndex,
        forgetting: forgettingEval
      }
    });
  } catch (error: any) {
    console.error('Error in /api/learner-state/infer:', error);
    // Failure Safety: Ensure LMS continues seamlessly
    return res.status(500).json({
      success: false,
      error: error.message || 'Learner state inference fallback triggered'
    });
  }
});

/**
 * GET /api/learner-state/student/:studentId
 * Get all topic states & learning intelligence overview for a student
 */
router.get('/student/:studentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId;
    const states = await LearnerStateService.getStudentLearnerStates(studentId);
    const transitions = await StateTransitionService.getTransitionTimeline(studentId);
    const masteries = await prisma.conceptMastery.findMany({
      where: { studentId },
      include: { topic: true },
      orderBy: { updatedAt: 'desc' }
    });

    return res.json({
      success: true,
      data: {
        states,
        transitions,
        masteries
      }
    });
  } catch (error: any) {
    console.error('Error in /api/learner-state/student/:studentId:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/learner-state/student/:studentId/topic/:topicId
 */
router.get('/student/:studentId/topic/:topicId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { studentId, topicId } = req.params;
    const state = await LearnerStateService.getTopicLearnerState(studentId, topicId);
    const mastery = await prisma.conceptMastery.findUnique({
      where: { studentId_topicId: { studentId, topicId } }
    });
    const transitions = await StateTransitionService.getTransitionTimeline(studentId, topicId);

    return res.json({
      success: true,
      data: {
        state,
        mastery,
        transitions
      }
    });
  } catch (error: any) {
    console.error('Error in /api/learner-state single topic:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/learner-state/transitions/:studentId
 */
router.get('/transitions/:studentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const topicId = req.query.topicId as string | undefined;
    const transitions = await StateTransitionService.getTransitionTimeline(studentId, topicId);

    return res.json({
      success: true,
      data: transitions
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
