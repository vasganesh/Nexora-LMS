/**
 * Interactions Router
 * 
 * Records privacy-preserving interaction aggregates (mouse velocity, hesitation index,
 * pause duration, option switches). Raw mouse coordinates are NEVER persisted.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

/**
 * POST /api/interactions
 * Log a single interaction batch
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId || req.body.studentId;
    const {
      topicId,
      questionId,
      isCorrect,
      score,
      responseDelaySec,
      hesitationIndex,
      optionSwitchCount,
      clickCount,
      mouseDistancePx,
      averageMouseSpeed,
      mousePauseCount,
      hoverDurationSec,
      features
    } = req.body;

    if (!studentId || !topicId) {
      return res.status(400).json({ error: 'studentId and topicId are required' });
    }

    const interaction = await prisma.learnerInteraction.create({
      data: {
        studentId,
        topicId,
        questionId: questionId || null,
        isCorrect: Boolean(isCorrect),
        score: typeof score === 'number' ? score : (isCorrect ? 1.0 : 0.0),
        responseDelaySec: Number(responseDelaySec) || 0,
        hesitationIndex: Number(hesitationIndex) || 0,
        optionSwitchCount: Number(optionSwitchCount) || 0,
        clickCount: Number(clickCount) || 1,
        mouseDistancePx: Number(mouseDistancePx) || 0,
        averageMouseSpeed: Number(averageMouseSpeed) || 0,
        mousePauseCount: Number(mousePauseCount) || 0,
        hoverDurationSec: Number(hoverDurationSec) || 0,
        features: features || {}
      }
    });

    return res.json({ success: true, data: interaction });
  } catch (error: any) {
    console.error('Error logging interaction:', error);
    // Failure-safe response
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/interactions/student/:studentId
 * Get student interaction summary
 */
router.get('/student/:studentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const limit = Number(req.query.limit) || 20;

    const interactions = await prisma.learnerInteraction.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return res.json({ success: true, data: interactions });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
