// ==========================================================
// SELF-ADAPTIVE PERSONALIZED LEARNING FRAMEWORK USING EDGE AI
// System Core Types & UML Entity Alignments (Review - 1)
// ==========================================================

export type LearnerState =
  | "MASTERING"
  | "PROGRESSING"
  | "STRUGGLING"
  | "RECOVERING"
  | "FORGETTING";

export type StateTransitionType =
  | "INITIAL_EVALUATION"
  | "PROGRESSING_TO_MASTERING"
  | "MASTERING_TO_FORGETTING"
  | "STRUGGLING_TO_RECOVERING"
  | "PROGRESSING_TO_STRUGGLING"
  | "RECOVERING_TO_PROGRESSING"
  | "MASTERING_READY_TO_ADVANCE"
  | "FORGETTING_TO_RECOVERING";

export type InterventionType =
  | "NONE"
  | "HINT"
  | "EXPLANATION"
  | "EXAMPLE"
  | "GUIDED_PRACTICE"
  | "REVISION"
  | "ADVANCE_CHALLENGE";

export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD" | "CHALLENGE";

export type FeedbackOutcome = "IMPROVED" | "UNCHANGED" | "DETERIORATED";

export interface InteractionSignal {
  id: string;
  timestamp: number;
  studentId: string;
  topicId: string;
  conceptId: string;
  actionType:
    | "quiz_answer"
    | "quiz_start"
    | "quiz_complete"
    | "video_play"
    | "video_pause"
    | "video_seek"
    | "video_replay"
    | "note_read"
    | "practice_attempt";
  responseTimeMs?: number;
  hesitationScore?: number; // 0.0 to 1.0 based on delay before interaction
  isCorrect?: boolean;
  selectedOptionIndex?: number;
  switchCount?: number; // number of times answer changed before submitting
  attemptNumber?: number;
  timeSpentMs?: number;
  metadata?: Record<string, any>;
}

export interface FeatureVector {
  accuracyRate: number; // 0.0 - 1.0 (recent accuracy)
  avgResponseTimeSec: number; // average response latency in seconds
  hesitationIndex: number; // 0.0 - 1.0 (hesitation / uncertainty ratio)
  consecutiveFailures: number; // count of consecutive wrong responses
  conceptErrorWeight: number; // error frequency on this specific concept
  retentionDecayFactor: number; // 0.0 - 1.0 (estimated forgetting decay curve)
  videoReplayFrequency: number; // frequency of rewinds/replays on tough segments
  engagementVelocity: number; // interaction frequency per minute
  timestamp: number;
}

export interface StatePrediction {
  state: LearnerState;
  probabilities: Record<LearnerState, number>;
  confidence: number; // 0.0 to 1.0
  inferenceLatencyMs: number; // edge execution time (< 20ms)
  featureVector: FeatureVector;
  timestamp: number;
}

export interface StateTransition {
  id: string;
  fromState: LearnerState;
  toState: LearnerState;
  transitionType: StateTransitionType;
  conceptId: string;
  conceptName: string;
  timestamp: number;
  triggerEvidence: string;
  confidence: number;
}

export interface AdaptiveDecision {
  id: string;
  interventionLevel: number; // 0 (None/Advance), 1 (Hint), 2 (Explanation), 3 (Example), 4 (Guided Practice), 5 (Revision)
  interventionType: InterventionType;
  targetConceptId: string;
  conceptName: string;
  title: string;
  message: string;
  scaffoldedContent?: {
    hint?: string;
    explanation?: string;
    example?: string;
    practiceQuestion?: {
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    };
    revisionTopicId?: string;
  };
  recommendedDifficulty: DifficultyLevel;
  explainableEvidence: string;
  confidence: number;
  requiresTeacherOverride: boolean;
  timestamp: number;
}

export interface FeedbackRecord {
  id: string;
  decisionId: string;
  interventionType: InterventionType;
  conceptId: string;
  learnerAction: "ACCEPTED" | "DISMISSED" | "COMPLETED" | "SKIPPED";
  preState: LearnerState;
  postState: LearnerState;
  outcome: FeedbackOutcome;
  timestamp: number;
}

export interface ConceptMastery {
  conceptId: string;
  conceptName: string;
  subjectId: string;
  topicId: string;
  masteryScore: number; // 0 - 100
  state: LearnerState;
  attemptCount: number;
  successCount: number;
  lastPracticedAt: number;
  retentionScore: number; // 0 - 100 based on forgetting curve
  decayRisk: boolean; // true if spaced retrieval is recommended
  prerequisites: string[]; // prerequisite concept IDs
}

export interface TeacherAlert {
  id: string;
  studentId: string;
  studentName: string;
  conceptId: string;
  conceptName: string;
  subjectId: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reason: string;
  evidence: string;
  confidence: number;
  suggestedIntervention: string;
  timestamp: number;
  resolved: boolean;
  teacherOverrideNotes?: string;
}

export interface MouseTelemetry {
  totalDistancePx: number;
  avgVelocity: number;
  jitterIndex: number; // 0.0 - 1.0 (rapid direction changes)
  hesitationLevel: "Smooth" | "Moderate" | "Hesitant" | "High Jitter";
  idleTimeMs: number;
}

export interface StudentCognitiveProfile {
  studentId: string;
  studentName: string;
  email: string;
  grade: string;
  location?: string;
  cognitiveState: LearnerState;
  performanceScore: number; // 0 - 100
  confidenceScore: number; // 0.0 - 1.0
  activeInterventionLevel: number;
  mouseActivity: MouseTelemetry;
  quizMetrics: {
    attemptsCount: number;
    accuracyRate: number; // 0 - 100
    avgResponseTimeSec: number;
    totalSwitches: number;
  };
  notesReading: {
    totalMinutesRead: number;
    scrollDepthPercent: number;
    lastActiveTimestamp: number;
  };
  videoMetrics: {
    totalMinutesWatched: number;
    replaysCount: number;
  };
  conceptMasteryList: {
    conceptName: string;
    score: number;
    state: LearnerState;
  }[];
  recentEvidence: string;
}

export interface EdgeTelemetrySummary {
  totalInferences: number;
  avgLatencyMs: number;
  edgeMemoryKb: number;
  privacyDataGuardedBytes: number;
  offlineQueuedEvents: number;
  activeLearnerState: LearnerState;
  currentInterventionLevel: number;
  confidenceScore: number;
}
