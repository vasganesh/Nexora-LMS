/**
 * Intervention Router
 * 
 * Manages human-in-the-loop teacher intervention reviews,
 * action approvals/overrides, and teacher-AI agreement rate reporting.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { InterventionService } from '../services/interventionService.js';

const router = Router();

/**
 * GET /api/interventions/teacher/alerts
 * Get pending and all teacher alerts
 */
router.get('/teacher/alerts', requireAuth, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const teacherId = req.auth?.userId;

    const alerts = await InterventionService.getTeacherInterventions(teacherId, status);
    const stats = await InterventionService.getTeacherAIAgreementStats();

    return res.json({
      success: true,
      data: {
        alerts,
        stats
      }
    });
  } catch (error: any) {
    console.error('Error in /api/interventions/teacher/alerts:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/interventions/teacher/:id/action
 * Teacher human-in-the-loop action: APPROVE | MODIFY | OVERRIDE | DISMISS
 */
router.post('/teacher/:id/action', requireAuth, async (req: Request, res: Response) => {
  try {
    const interventionId = req.params.id;
    const teacherId = req.auth?.userId || 'teacher-default';
    const { action, teacherNotes, overrideAction } = req.body;

    if (!['APPROVE', 'MODIFY', 'OVERRIDE', 'DISMISS'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be APPROVE, MODIFY, OVERRIDE, or DISMISS' });
    }

    const updated = await InterventionService.processTeacherAction(
      interventionId,
      teacherId,
      action,
      { teacherNotes, overrideAction }
    );

    return res.json({
      success: true,
      data: updated
    });
  } catch (error: any) {
    console.error('Error processing teacher action:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/interventions/teacher/agreement-rate
 * Returns Teacher-AI Agreement Rate metrics
 */
router.get('/teacher/agreement-rate', requireAuth, async (_req: Request, res: Response) => {
  try {
    const stats = await InterventionService.getTeacherAIAgreementStats();
    return res.json({ success: true, data: stats });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/interventions/student/:studentId
 */
router.get('/student/:studentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const history = await InterventionService.getStudentInterventionHistory(studentId);
    return res.json({ success: true, data: history });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
