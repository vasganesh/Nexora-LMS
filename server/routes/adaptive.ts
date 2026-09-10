/**
 * Adaptive Engine Router
 * 
 * Provides endpoints for evaluating adaptive learning recommendations
 * and viewing intervention histories.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { AdaptiveEngine } from '../services/adaptiveEngine.js';
import { InterventionService } from '../services/interventionService.js';
import { LearnerStateService } from '../services/learnerStateService.js';

const router = Router();

/**
 * POST /api/adaptive/decide
 * Evaluates an intervention for an existing or incoming learner state
 */
router.post('/decide', requireAuth, async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId || req.body.studentId;
    const { topicId, topicName, prediction } = req.body;

    if (!studentId || !topicId || !prediction) {
      return res.status(400).json({ error: 'studentId, topicId, and prediction required' });
    }

    const decision = await AdaptiveEngine.determineIntervention(
      studentId,
      topicId,
      prediction,
      topicName
    );

    const record = await InterventionService.recordAdaptiveIntervention(
      studentId,
      topicId,
      prediction.state,
      decision,
      decision.autoExecute
    );

    return res.json({
      success: true,
      data: {
        decision,
        recordId: record?.id
      }
    });
  } catch (error: any) {
    console.error('Error in /api/adaptive/decide:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/adaptive/history/:studentId
 */
router.get('/history/:studentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const history = await InterventionService.getStudentInterventionHistory(studentId);

    return res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
