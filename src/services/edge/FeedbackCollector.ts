// ==========================================================
// EDGE LAYER: FeedbackCollector & Concept Mastery Manager
// Closes the Observe -> Predict -> Decide -> Adapt -> Observe loop
// Tracks Concept-Level Mastery & Retention Decay Curves
// ==========================================================

import type {
  ConceptMastery,
  FeedbackOutcome,
  FeedbackRecord,
  InterventionType,
  LearnerState,
} from "./types";

export class FeedbackCollector {
  private feedbackHistory: FeedbackRecord[] = [];
  private conceptMasteryMap: Map<string, ConceptMastery> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  public recordInterventionOutcome(
    decisionId: string,
    interventionType: InterventionType,
    conceptId: string,
    learnerAction: FeedbackRecord["learnerAction"],
    preState: LearnerState,
    postState: LearnerState,
    postAccuracy: number
  ): FeedbackRecord {
    let outcome: FeedbackOutcome = "UNCHANGED";
    if (postState === "RECOVERING" || postState === "MASTERING" || postAccuracy > 0.7) {
      outcome = "IMPROVED";
    } else if (postState === "STRUGGLING" && postAccuracy < 0.4) {
      outcome = "DETERIORATED";
    }

    const record: FeedbackRecord = {
      id: `fb_${Date.now()}`,
      decisionId,
      interventionType,
      conceptId,
      learnerAction,
      preState,
      postState,
      outcome,
      timestamp: Date.now(),
    };

    this.feedbackHistory.push(record);
    if (this.feedbackHistory.length > 100) this.feedbackHistory.shift();

    // Update Concept Mastery Score
    this.updateConceptMasteryScore(conceptId, outcome === "IMPROVED", postState);

    this.saveToStorage();
    return record;
  }

  public getConceptMastery(conceptId: string, conceptName: string, subjectId: string, topicId: string): ConceptMastery {
    if (!this.conceptMasteryMap.has(conceptId)) {
      const initial: ConceptMastery = {
        conceptId,
        conceptName,
        subjectId,
        topicId,
        masteryScore: 70,
        state: "PROGRESSING",
        attemptCount: 0,
        successCount: 0,
        lastPracticedAt: Date.now(),
        retentionScore: 85,
        decayRisk: false,
        prerequisites: [],
      };
      this.conceptMasteryMap.set(conceptId, initial);
      return initial;
    }

    const mastery = this.conceptMasteryMap.get(conceptId)!;
    // Dynamically recalculate retention score based on elapsed time
    const hoursElapsed = (Date.now() - mastery.lastPracticedAt) / (1000 * 60 * 60);
    const daysElapsed = hoursElapsed / 24;
    // Retention decay curve
    const retentionDecay = Math.max(20, Math.round(mastery.masteryScore * Math.exp(-daysElapsed / 8.0)));
    mastery.retentionScore = retentionDecay;
    mastery.decayRisk = daysElapsed > 3 && retentionDecay < 60 && mastery.masteryScore >= 70;

    return mastery;
  }

  public updateConceptInteraction(
    conceptId: string,
    conceptName: string,
    subjectId: string,
    topicId: string,
    isCorrect: boolean,
    state: LearnerState
  ): ConceptMastery {
    const current = this.getConceptMastery(conceptId, conceptName, subjectId, topicId);
    current.attemptCount++;
    if (isCorrect) current.successCount++;
    current.lastPracticedAt = Date.now();
    current.state = state;

    // Adjust mastery score proportionally
    const delta = isCorrect ? 6 : -8;
    current.masteryScore = Math.min(100, Math.max(10, current.masteryScore + delta));
    current.retentionScore = current.masteryScore;
    current.decayRisk = false;

    this.conceptMasteryMap.set(conceptId, current);
    this.saveToStorage();
    return current;
  }

  public getAllConceptMastery(): ConceptMastery[] {
    return Array.from(this.conceptMasteryMap.values());
  }

  public getConceptsNeedingSpacedReview(): ConceptMastery[] {
    return this.getAllConceptMastery().filter((c) => c.decayRisk || c.state === "FORGETTING");
  }

  public getRecentFeedback(limit: number = 20): FeedbackRecord[] {
    return this.feedbackHistory.slice(-limit).reverse();
  }

  private updateConceptMasteryScore(conceptId: string, improved: boolean, state: LearnerState): void {
    const existing = this.conceptMasteryMap.get(conceptId);
    if (existing) {
      existing.masteryScore = Math.min(100, Math.max(10, existing.masteryScore + (improved ? 10 : -5)));
      existing.state = state;
      existing.lastPracticedAt = Date.now();
      existing.retentionScore = existing.masteryScore;
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem("edge_feedback_history", JSON.stringify(this.feedbackHistory.slice(-50)));
      const arrayData = Array.from(this.conceptMasteryMap.entries());
      localStorage.setItem("edge_concept_mastery", JSON.stringify(arrayData));
    } catch (e) {
      console.warn("[EdgeAI:FeedbackCollector] Storage save warning", e);
    }
  }

  private loadFromStorage(): void {
    try {
      const storedFb = localStorage.getItem("edge_feedback_history");
      if (storedFb) this.feedbackHistory = JSON.parse(storedFb);
      const storedMastery = localStorage.getItem("edge_concept_mastery");
      if (storedMastery) {
        const entries = JSON.parse(storedMastery);
        this.conceptMasteryMap = new Map(entries);
      }
    } catch (e) {
      console.warn("[EdgeAI:FeedbackCollector] Storage load warning", e);
    }
  }
}
