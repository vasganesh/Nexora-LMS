/**
 * Learner Feature Service
 * 
 * Extracts privacy-safe academic and aggregate interaction features.
 * Raw mouse coordinates are NEVER permanently stored. Only aggregate metrics
 * (distance, velocity, hesitation index, pause count, option switches) are retained.
 */

export interface RawInteractionMetrics {
  questionStartTime: number;
  answerSubmissionTime: number;
  firstInteractionTime?: number;
  answerChanges: number;
  optionSwitches: number;
  backtrackCount: number;
  clickCount: number;
  hoverDurationMs: number;
  mouseDistancePx: number;
  averageMouseSpeed: number; // px/sec
  mousePauses: number;
  mouseJitter?: number;
  totalTimeSpentMs: number;
}

export interface AcademicMetrics {
  isCorrect: boolean;
  score: number; // 0 to 1
  attempts: number;
  errorStreak: number;
  conceptMasteryScore?: number;
  recentAccuracy?: number; // rolling average of last 5 questions
  historicalAccuracy?: number; // overall accuracy in topic
  timeSpentLearningSec: number;
  hintRequested: boolean;
}

export interface LearnerFeatureVector {
  // Academic Features
  correctness: number; // 0 or 1
  score: number;
  errorStreak: number;
  timeSpentSec: number;
  recentAccuracy: number;
  historicalAccuracy: number;
  hintUsed: number; // 0 or 1
  attemptCount: number;

  // Interaction Features (Privacy-Preserving Aggregates)
  responseDelaySec: number;
  timeToFirstActionSec: number;
  optionSwitchCount: number;
  clickCount: number;
  hoverDurationSec: number;
  mouseDistanceNormalized: number;
  averageMouseSpeed: number;
  mousePauseCount: number;

  // Derived Psychological/Cognitive Indicator
  hesitationIndex: number; // 0.0 (decisive) to 1.0 (extreme hesitation)
}

export class LearnerFeatureService {
  /**
   * Calculates the Hesitation Index (0.0 to 1.0)
   * Derived from:
   * 1. Normalized pause duration & count
   * 2. Option switching frequency
   * 3. Backtracking / answer revisions
   * 4. Delay before first interaction
   * 5. Hover duration relative to question time
   */
  public static calculateHesitationIndex(interaction: RawInteractionMetrics): number {
    const totalSec = Math.max(1, interaction.totalTimeSpentMs / 1000);
    
    // Component 1: Initial latency before touching an answer (scale 0-10s)
    const initialLatency = interaction.firstInteractionTime && interaction.questionStartTime
      ? Math.max(0, (interaction.firstInteractionTime - interaction.questionStartTime) / 1000)
      : totalSec * 0.3;
    const latencyScore = Math.min(1.0, initialLatency / 8.0);

    // Component 2: Option switches (>= 3 switches indicates strong second-guessing)
    const switchScore = Math.min(1.0, interaction.optionSwitches / 4.0);

    // Component 3: Backtracking count (changing selection back and forth)
    const backtrackScore = Math.min(1.0, interaction.backtrackCount / 3.0);

    // Component 4: Mouse pauses (erratic pauses indicate cognitive freeze / confusion)
    const pausesPerMin = (interaction.mousePauses / totalSec) * 60;
    const pauseScore = Math.min(1.0, pausesPerMin / 15.0);

    // Component 5: Hover duration ratio (hovering over choices without clicking)
    const hoverRatio = Math.min(1.0, (interaction.hoverDurationMs / 1000) / totalSec);

    // Weighted combination
    const hesitation = (
      0.25 * latencyScore +
      0.25 * switchScore +
      0.20 * backtrackScore +
      0.15 * pauseScore +
      0.15 * hoverRatio
    );

    return Math.round(Math.min(1.0, Math.max(0.0, hesitation)) * 1000) / 1000;
  }

  /**
   * Normalizes interaction and academic data into a standardized feature vector
   */
  public static extractFeatureVector(
    academic: AcademicMetrics,
    interaction: RawInteractionMetrics
  ): LearnerFeatureVector {
    const totalSec = Math.max(0.5, interaction.totalTimeSpentMs / 1000);
    const hesitationIndex = this.calculateHesitationIndex(interaction);

    const firstActionSec = interaction.firstInteractionTime && interaction.questionStartTime
      ? Math.max(0, (interaction.firstInteractionTime - interaction.questionStartTime) / 1000)
      : totalSec * 0.25;

    // Normalizing mouse distance: 0-2500 px standard range
    const normalizedDistance = Math.min(1.0, interaction.mouseDistancePx / 2500);

    return {
      correctness: academic.isCorrect ? 1.0 : 0.0,
      score: Math.min(1.0, Math.max(0.0, academic.score)),
      errorStreak: Math.min(10, academic.errorStreak),
      timeSpentSec: Math.round(totalSec * 10) / 10,
      recentAccuracy: Math.min(1.0, Math.max(0.0, academic.recentAccuracy ?? (academic.isCorrect ? 1.0 : 0.0))),
      historicalAccuracy: Math.min(1.0, Math.max(0.0, academic.historicalAccuracy ?? 0.7)),
      hintUsed: academic.hintRequested ? 1.0 : 0.0,
      attemptCount: Math.max(1, academic.attempts),

      responseDelaySec: Math.round(totalSec * 10) / 10,
      timeToFirstActionSec: Math.round(firstActionSec * 10) / 10,
      optionSwitchCount: interaction.optionSwitches,
      clickCount: interaction.clickCount,
      hoverDurationSec: Math.round((interaction.hoverDurationMs / 1000) * 10) / 10,
      mouseDistanceNormalized: Math.round(normalizedDistance * 1000) / 1000,
      averageMouseSpeed: Math.round(interaction.averageMouseSpeed * 10) / 10,
      mousePauseCount: interaction.mousePauses,

      hesitationIndex
    };
  }

  /**
   * Generates human-readable Explainable AI bullet points from actual feature values
   */
  public static generateExplanationFactors(
    vector: LearnerFeatureVector,
    state: string
  ): string[] {
    const reasons: string[] = [];

    // Accuracy & Score signals
    if (vector.correctness === 0) {
      if (vector.errorStreak >= 2) {
        reasons.push(`${vector.errorStreak} consecutive incorrect attempts on this concept`);
      } else {
        reasons.push("Incorrect response on the current question");
      }
    } else {
      if (vector.recentAccuracy >= 0.8) {
        reasons.push(`Consistently high accuracy (${Math.round(vector.recentAccuracy * 100)}%) across recent questions`);
      } else {
        reasons.push("Correct response achieved");
      }
    }

    // Hesitation Index signals
    if (vector.hesitationIndex >= 0.65) {
      reasons.push(`High hesitation index (${vector.hesitationIndex}) indicating uncertainty`);
    } else if (vector.hesitationIndex <= 0.25) {
      reasons.push(`Low hesitation (${vector.hesitationIndex}) showing quick, confident decisions`);
    }

    // Option switching
    if (vector.optionSwitchCount >= 2) {
      reasons.push(`Switched answer options ${vector.optionSwitchCount} times before submitting`);
    }

    // Response time analysis
    if (vector.responseDelaySec > 60) {
      reasons.push(`Extended response duration (${Math.round(vector.responseDelaySec)}s)`);
    } else if (vector.responseDelaySec < 5 && vector.correctness === 0) {
      reasons.push("Rapid impulsive guess with low response duration");
    }

    // Historical mastery trend
    if (vector.historicalAccuracy >= 0.85 && vector.recentAccuracy < 0.5) {
      reasons.push(`Prior topic mastery was ${Math.round(vector.historicalAccuracy * 100)}%, but recent performance dropped to ${Math.round(vector.recentAccuracy * 100)}%`);
    }

    if (reasons.length === 0) {
      reasons.push(`Steady interaction pace with ${Math.round(vector.score * 100)}% question score`);
    }

    return reasons;
  }
}
