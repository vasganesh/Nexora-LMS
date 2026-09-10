import { getApiBaseUrl } from '../utils/apiBase';

const API_BASE_URL = `${getApiBaseUrl()}/api`;

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export interface PredictionPayload {
  state: 'PROGRESSING' | 'MASTERING' | 'STRUGGLING' | 'RECOVERING' | 'FORGETTING';
  confidence: number;
  probabilities: Record<string, number>;
  explanationFactors: string[];
  featureVector: any;
  isFallback: boolean;
}

export interface TransitionPayload {
  hasTransitioned: boolean;
  fromState: string | null;
  toState: string;
  confidence: number;
  triggerReasons: string[];
  transitionRecordId?: string;
}

export interface InterventionPayload {
  level: number;
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

export interface InferResponse {
  success: boolean;
  data: {
    prediction: PredictionPayload;
    transition: TransitionPayload;
    intervention: InterventionPayload;
    interventionRecordId?: string;
    hesitationIndex: number;
    forgetting?: any;
  };
}

export interface LearnerIntelligenceData {
  states: Array<{
    id: string;
    studentId: string;
    topicId: string;
    currentState: string;
    previousState: string | null;
    confidence: number;
    probabilities: Record<string, number>;
    reasons: string[];
    updatedAt: string;
    topic?: {
      id: string;
      name: string;
      chapter?: {
        name: string;
        unit?: {
          name: string;
          subject?: {
            name: string;
          };
        };
      };
    };
  }>;
  transitions: Array<{
    id: string;
    studentId: string;
    topicId: string;
    fromState: string;
    toState: string;
    confidence: number;
    reason: string;
    createdAt: string;
    topic?: {
      id: string;
      name: string;
    };
  }>;
  masteries: Array<{
    id: string;
    topicId: string;
    masteryScore: number;
    attempts: number;
    streak: number;
    status: string;
    topic?: {
      id: string;
      name: string;
    };
  }>;
}

export const learnerIntelligenceAPI = {
  /**
   * Run real-time edge AI inference loop during quiz/learning
   */
  inferLearnerState: async (payload: {
    studentId?: string;
    topicId: string;
    topicName?: string;
    questionId?: string;
    academic: {
      isCorrect: boolean;
      score?: number;
      attempts?: number;
      errorStreak?: number;
      recentAccuracy?: number;
      historicalAccuracy?: number;
      timeSpentLearningSec?: number;
      hintRequested?: boolean;
    };
    interaction: {
      questionStartTime: number;
      answerSubmissionTime: number;
      firstInteractionTime?: number;
      answerChanges: number;
      optionSwitches: number;
      backtrackCount: number;
      clickCount: number;
      hoverDurationMs: number;
      mouseDistancePx: number;
      averageMouseSpeed: number;
      mousePauses: number;
      mouseJitter?: number;
      totalTimeSpentMs: number;
    };
  }): Promise<InferResponse> => {
    const res = await fetch(`${API_BASE_URL}/learner-state/infer`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Inference request failed: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Fetch complete intelligence profile for student
   */
  getStudentIntelligence: async (studentId: string): Promise<LearnerIntelligenceData> => {
    const res = await fetch(`${API_BASE_URL}/learner-state/student/${studentId}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to load student learner intelligence');
    const json = await res.json();
    return json.data;
  },

  /**
   * Fetch state transition timeline
   */
  getTransitions: async (studentId: string, topicId?: string) => {
    const url = topicId
      ? `${API_BASE_URL}/learner-state/transitions/${studentId}?topicId=${topicId}`
      : `${API_BASE_URL}/learner-state/transitions/${studentId}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load transition timeline');
    const json = await res.json();
    return json.data;
  },

  /**
   * Fetch Teacher Learner Alerts
   */
  getTeacherAlerts: async (status?: string) => {
    const url = status
      ? `${API_BASE_URL}/interventions/teacher/alerts?status=${status}`
      : `${API_BASE_URL}/interventions/teacher/alerts`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load teacher alerts');
    const json = await res.json();
    return json.data;
  },

  /**
   * Teacher Human-In-The-Loop Action: APPROVE | MODIFY | OVERRIDE | DISMISS
   */
  processTeacherAction: async (
    alertId: string,
    action: 'APPROVE' | 'MODIFY' | 'OVERRIDE' | 'DISMISS',
    details?: { teacherNotes?: string; overrideAction?: string }
  ) => {
    const res = await fetch(`${API_BASE_URL}/interventions/teacher/${alertId}/action`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action, ...details })
    });
    if (!res.ok) throw new Error('Failed to process teacher action');
    return res.json();
  },

  /**
   * Teacher-AI Agreement Rate Statistics
   */
  getTeacherAgreementStats: async () => {
    const res = await fetch(`${API_BASE_URL}/interventions/teacher/agreement-rate`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to load agreement rate');
    const json = await res.json();
    return json.data;
  },

  /**
   * Student's adaptive intervention history
   */
  getStudentInterventionHistory: async (studentId: string) => {
    const res = await fetch(`${API_BASE_URL}/interventions/student/${studentId}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to load intervention history');
    const json = await res.json();
    return json.data;
  }
};
