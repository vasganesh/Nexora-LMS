// ==========================================================
// EDGE LAYER: StateTransitionDetector
// Identifies cognitive state shifts & generates explainable trigger evidence
// ==========================================================

import type {
  LearnerState,
  StateTransition,
  StateTransitionType,
  StatePrediction,
} from "./types";

export class StateTransitionDetector {
  private transitionHistory: StateTransition[] = [];
  private lastState: LearnerState | null = null;

  constructor() {
    this.loadFromStorage();
  }

  public detectTransition(
    prediction: StatePrediction,
    conceptId: string,
    conceptName: string
  ): StateTransition | null {
    const currentState = prediction.state;

    // Initial state registration
    if (!this.lastState) {
      this.lastState = currentState;
      const initialTransition: StateTransition = {
        id: `trans_${Date.now()}`,
        fromState: currentState,
        toState: currentState,
        transitionType: "INITIAL_EVALUATION",
        conceptId,
        conceptName,
        timestamp: Date.now(),
        triggerEvidence: `Baseline state established as ${currentState} with ${(prediction.confidence * 100).toFixed(0)}% confidence.`,
        confidence: prediction.confidence,
      };
      this.recordTransition(initialTransition);
      return initialTransition;
    }

    // Check if state actually transitioned
    if (this.lastState === currentState) {
      // Check for ready to advance condition
      if (currentState === "MASTERING" && prediction.featureVector.accuracyRate >= 0.95) {
        // Only trigger ready to advance if not already recorded recently
        const recentAdv = this.transitionHistory.find(
          (t) => t.transitionType === "MASTERING_READY_TO_ADVANCE" && t.conceptId === conceptId && Date.now() - t.timestamp < 60000
        );
        if (!recentAdv) {
          const advTransition: StateTransition = {
            id: `trans_${Date.now()}`,
            fromState: "MASTERING",
            toState: "MASTERING",
            transitionType: "MASTERING_READY_TO_ADVANCE",
            conceptId,
            conceptName,
            timestamp: Date.now(),
            triggerEvidence: `Consistent 95%+ accuracy and high speed on ${conceptName}. Ready for advanced topic challenge.`,
            confidence: prediction.confidence,
          };
          this.recordTransition(advTransition);
          return advTransition;
        }
      }
      return null;
    }

    const fromState = this.lastState;
    const toState = currentState;
    this.lastState = currentState;

    const transitionType = this.determineTransitionType(fromState, toState);
    const triggerEvidence = this.generateTriggerEvidence(
      fromState,
      toState,
      prediction,
      conceptName
    );

    const transition: StateTransition = {
      id: `trans_${Date.now()}`,
      fromState,
      toState,
      transitionType,
      conceptId,
      conceptName,
      timestamp: Date.now(),
      triggerEvidence,
      confidence: prediction.confidence,
    };

    this.recordTransition(transition);
    return transition;
  }

  public getHistory(limit: number = 20): StateTransition[] {
    return this.transitionHistory.slice(-limit).reverse();
  }

  public getLastState(): LearnerState {
    return this.lastState || "PROGRESSING";
  }

  public setLastState(state: LearnerState): void {
    this.lastState = state;
  }

  private determineTransitionType(
    from: LearnerState,
    to: LearnerState
  ): StateTransitionType {
    if (from === "PROGRESSING" && to === "MASTERING") return "PROGRESSING_TO_MASTERING";
    if (from === "MASTERING" && to === "FORGETTING") return "MASTERING_TO_FORGETTING";
    if (from === "STRUGGLING" && to === "RECOVERING") return "STRUGGLING_TO_RECOVERING";
    if (from === "PROGRESSING" && to === "STRUGGLING") return "PROGRESSING_TO_STRUGGLING";
    if (from === "RECOVERING" && to === "PROGRESSING") return "RECOVERING_TO_PROGRESSING";
    if (from === "FORGETTING" && to === "RECOVERING") return "FORGETTING_TO_RECOVERING";
    return "PROGRESSING_TO_STRUGGLING";
  }

  private generateTriggerEvidence(
    from: LearnerState,
    to: LearnerState,
    pred: StatePrediction,
    conceptName: string
  ): string {
    const f = pred.featureVector;
    const accPct = (f.accuracyRate * 100).toFixed(0);
    const hesPct = (f.hesitationIndex * 100).toFixed(0);

    if (to === "STRUGGLING") {
      return `Detected ${f.consecutiveFailures} consecutive incorrect responses on "${conceptName}". Hesitation index reached ${hesPct}% with avg response time of ${f.avgResponseTimeSec.toFixed(1)}s.`;
    }
    if (to === "RECOVERING") {
      return `Positive turnaround observed: accuracy improved to ${accPct}% with reduced hesitation (${hesPct}%) following targeted intervention.`;
    }
    if (to === "MASTERING") {
      return `Demonstrated strong conceptual mastery on "${conceptName}" with ${accPct}% accuracy and fluid response latency (${f.avgResponseTimeSec.toFixed(1)}s).`;
    }
    if (to === "FORGETTING") {
      return `Retention decay detected (${(f.retentionDecayFactor * 100).toFixed(0)}% decay factor) on previously mastered concept "${conceptName}". Spaced retrieval required.`;
    }
    return `State transitioned from ${from} to ${to} (Accuracy: ${accPct}%, Response: ${f.avgResponseTimeSec.toFixed(1)}s).`;
  }

  private recordTransition(transition: StateTransition): void {
    this.transitionHistory.push(transition);
    if (this.transitionHistory.length > 100) {
      this.transitionHistory.shift();
    }
    this.saveToStorage();
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem("edge_state_transitions", JSON.stringify(this.transitionHistory.slice(-50)));
      if (this.lastState) {
        localStorage.setItem("edge_last_state", this.lastState);
      }
    } catch (e) {
      console.warn("[EdgeAI:StateTransitionDetector] Storage save warning", e);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem("edge_state_transitions");
      if (stored) {
        this.transitionHistory = JSON.parse(stored);
      }
      const last = localStorage.getItem("edge_last_state");
      if (last) {
        this.lastState = last as LearnerState;
      }
    } catch (e) {
      console.warn("[EdgeAI:StateTransitionDetector] Storage load warning", e);
    }
  }
}
