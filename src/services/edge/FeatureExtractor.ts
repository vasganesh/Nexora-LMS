// ==========================================================
// EDGE LAYER: FeatureExtractor
// Transforms raw learner telemetry into normalized cognitive features
// ==========================================================

import type { InteractionSignal, FeatureVector } from "./types";

export class FeatureExtractor {
  // Baseline benchmarks for educational interactions
  private expectedResponseTimeSec = 15.0; // Typical benchmark per question

  public extractFeatures(
    signals: InteractionSignal[],
    targetConceptId?: string,
    lastPracticedTimestamp?: number
  ): FeatureVector {
    if (!signals || signals.length === 0) {
      return this.getDefaultFeatureVector();
    }

    const relevantSignals = targetConceptId
      ? signals.filter((s) => !s.conceptId || s.conceptId === targetConceptId)
      : signals;

    const quizSignals = relevantSignals.filter((s) => s.actionType === "quiz_answer" || s.actionType === "practice_attempt");
    const videoSignals = relevantSignals.filter((s) => s.actionType.startsWith("video_"));

    // 1. Accuracy Rate calculation
    let accuracyRate = 0.75;
    if (quizSignals.length > 0) {
      const correctCount = quizSignals.filter((s) => s.isCorrect === true).length;
      accuracyRate = correctCount / quizSignals.length;
    }

    // 2. Average Response Time
    let totalResponseTimeMs = 0;
    let responseCount = 0;
    quizSignals.forEach((s) => {
      if (s.responseTimeMs && s.responseTimeMs > 0) {
        totalResponseTimeMs += s.responseTimeMs;
        responseCount++;
      }
    });
    const avgResponseTimeSec = responseCount > 0
      ? (totalResponseTimeMs / responseCount) / 1000
      : this.expectedResponseTimeSec;

    // 3. Hesitation Index (0.0 to 1.0)
    // Combines time before first option selection, answer switching, and normalized delay
    let totalHesitation = 0;
    let hesitationSamples = 0;

    quizSignals.forEach((s) => {
      let sampleHesitation = 0;
      if (s.hesitationScore !== undefined) {
        sampleHesitation = s.hesitationScore;
      } else if (s.responseTimeMs) {
        // Normalize against baseline: > 35s implies high hesitation
        sampleHesitation = Math.min(1.0, s.responseTimeMs / 35000);
      }

      // Add penalty for switching answers multiple times
      if (s.switchCount && s.switchCount > 0) {
        sampleHesitation = Math.min(1.0, sampleHesitation + s.switchCount * 0.15);
      }

      totalHesitation += sampleHesitation;
      hesitationSamples++;
    });

    const hesitationIndex = hesitationSamples > 0
      ? Math.min(1.0, Math.max(0.0, totalHesitation / hesitationSamples))
      : 0.2;

    // 4. Consecutive Failures
    let consecutiveFailures = 0;
    for (let i = quizSignals.length - 1; i >= 0; i--) {
      if (quizSignals[i].isCorrect === false) {
        consecutiveFailures++;
      } else if (quizSignals[i].isCorrect === true) {
        break;
      }
    }

    // 5. Concept Error Weight
    let conceptErrorWeight = 0;
    if (targetConceptId) {
      const conceptSpecific = quizSignals.filter((s) => s.conceptId === targetConceptId);
      if (conceptSpecific.length > 0) {
        const failedOnConcept = conceptSpecific.filter((s) => s.isCorrect === false).length;
        conceptErrorWeight = failedOnConcept / conceptSpecific.length;
      }
    }

    // 6. Retention Decay Factor (Ebbinghaus forgetting curve modeling)
    // R = e^(-t/S) where t is days since last practice, S is stability
    let retentionDecayFactor = 0.0;
    if (lastPracticedTimestamp) {
      const hoursSincePractice = (Date.now() - lastPracticedTimestamp) / (1000 * 60 * 60);
      const daysSincePractice = hoursSincePractice / 24;
      // Decay factor increases with time (0 = freshly learned, 1 = severe decay)
      retentionDecayFactor = Math.min(1.0, 1.0 - Math.exp(-daysSincePractice / 7.0));
    }

    // 7. Video Replay Frequency
    const replaySignals = videoSignals.filter(
      (s) => s.actionType === "video_replay" || s.actionType === "video_seek"
    );
    const videoReplayFrequency = replaySignals.length;

    // 8. Engagement Velocity (interactions per minute)
    const timeSpanMs = signals.length > 1
      ? Math.max(60000, signals[signals.length - 1].timestamp - signals[0].timestamp)
      : 60000;
    const engagementVelocity = (signals.length / (timeSpanMs / 60000));

    return {
      accuracyRate,
      avgResponseTimeSec,
      hesitationIndex,
      consecutiveFailures,
      conceptErrorWeight,
      retentionDecayFactor,
      videoReplayFrequency,
      engagementVelocity,
      timestamp: Date.now(),
    };
  }

  public getDefaultFeatureVector(): FeatureVector {
    return {
      accuracyRate: 0.8,
      avgResponseTimeSec: 12.0,
      hesitationIndex: 0.2,
      consecutiveFailures: 0,
      conceptErrorWeight: 0.1,
      retentionDecayFactor: 0.05,
      videoReplayFrequency: 0,
      engagementVelocity: 3.5,
      timestamp: Date.now(),
    };
  }
}
