// ==========================================================
// EDGE LAYER: AdaptiveDecisionEngine
// Multi-Level Adaptive Intervention Ladder with Escalation & De-escalation
// Generates Explainable Decisions & Human-in-the-Loop Triggers
// ==========================================================

import type {
  AdaptiveDecision,
  DifficultyLevel,
  InterventionType,
  LearnerState,
  StatePrediction,
  TeacherAlert,
} from "./types";

export class AdaptiveDecisionEngine {
  private currentInterventionLevel = 0;
  private consecutiveStruggles = 0;
  private alerts: TeacherAlert[] = [];

  constructor() {
    this.loadFromStorage();
  }

  public decideAction(
    prediction: StatePrediction,
    conceptId: string,
    conceptName: string,
    subjectId: string,
    studentId: string = "current_student",
    studentName: string = "Learner",
    explicitLevel?: number
  ): AdaptiveDecision {
    const { state, confidence, featureVector } = prediction;
    let newLevel = explicitLevel !== undefined ? explicitLevel : this.currentInterventionLevel;
    let interventionType: InterventionType = "NONE";
    let recommendedDifficulty: DifficultyLevel = "MEDIUM";
    let requiresTeacherOverride = false;
    let message = "";
    let title = "";
    let scaffoldedContent: AdaptiveDecision["scaffoldedContent"] = undefined;

    // 1. Evaluate State and Apply Escalation / De-escalation Policies ONLY if explicitLevel not provided
    if (explicitLevel === undefined) {
      switch (state) {
        case "STRUGGLING":
          this.consecutiveStruggles++;
          // Escalate intervention level progressively: 1 -> 2 -> 3 -> 4 -> 5
          newLevel = Math.min(5, Math.max(1, this.currentInterventionLevel + 1));
          recommendedDifficulty = "EASY";

          // Check for Human-in-the-Loop teacher escalation threshold
          if (this.consecutiveStruggles >= 3 || confidence < 0.55) {
            requiresTeacherOverride = true;
            this.createTeacherAlert({
              studentId,
              studentName,
              conceptId,
              conceptName,
              subjectId,
              severity: this.consecutiveStruggles >= 4 ? "CRITICAL" : "HIGH",
              reason: `Persistent difficulty detected on concept: ${conceptName}`,
              evidence: `Student failed ${featureVector.consecutiveFailures} consecutive attempts. Hesitation: ${(featureVector.hesitationIndex * 100).toFixed(0)}%. Avg response: ${featureVector.avgResponseTimeSec.toFixed(1)}s.`,
              confidence,
              suggestedIntervention: `Assign 1-on-1 review or unlocked prerequisite tutorial for ${conceptName}.`,
            });
          }
          break;

        case "RECOVERING":
          this.consecutiveStruggles = Math.max(0, this.consecutiveStruggles - 1);
          // De-escalate intervention level gently
          newLevel = Math.max(0, this.currentInterventionLevel - 1);
          recommendedDifficulty = "MEDIUM";
          break;

        case "MASTERING":
          this.consecutiveStruggles = 0;
          newLevel = 0;
          recommendedDifficulty = featureVector.accuracyRate >= 0.95 ? "CHALLENGE" : "HARD";
          break;

        case "FORGETTING":
          newLevel = 5; // Direct to Spaced Revision
          recommendedDifficulty = "EASY";
          break;

        case "PROGRESSING":
        default:
          this.consecutiveStruggles = 0;
          // Natural de-escalation if learner is stable
          newLevel = Math.max(0, this.currentInterventionLevel - 1);
          recommendedDifficulty = "MEDIUM";
          break;
      }
    }

    this.currentInterventionLevel = newLevel;

    // 2. Map Level to Specific Intervention Content & Type
    switch (newLevel) {
      case 1:
        interventionType = "HINT";
        title = `Quick Hint: ${conceptName}`;
        message = `Consider the core principle of ${conceptName}. Focus on identifying known variables first.`;
        scaffoldedContent = {
          hint: `💡 Key Clue: For ${conceptName}, break down the problem statement to identify given constants and variables. Verify all algebraic signs and unit conversions before solving.`,
        };
        break;

      case 2:
        interventionType = "EXPLANATION";
        title = `Step-by-Step Breakdown: ${conceptName}`;
        message = `Let's break down the mechanics of ${conceptName} into bite-sized logical steps.`;
        scaffoldedContent = {
          explanation: `Step 1: State the definition and boundary conditions.\nStep 2: Identify knowns and unknowns.\nStep 3: Apply the governing theorem methodically.\nStep 4: Verify your intermediate units and logic.`,
        };
        break;

      case 3:
        interventionType = "EXAMPLE";
        title = `Worked Example: ${conceptName}`;
        message = `Here is a real-world worked example demonstrating how to solve similar problems.`;
        scaffoldedContent = {
          example: `Example Problem: Given $x^2 + 5x + 6 = 0$, find the roots.\nSolution: Factorize into $(x+2)(x+3) = 0 \\implies x = -2$ or $x = -3$. Notice how product is 6 and sum is 5.`,
        };
        break;

      case 4:
        interventionType = "GUIDED_PRACTICE";
        title = `Guided Micro-Practice: ${conceptName}`;
        message = `Let's try a scaffolded mini-question with immediate feedback before moving forward.`;
        scaffoldedContent = {
          practiceQuestion: {
            question: `What is the first step in solving a quadratic equation by factoring?`,
            options: [
              "Rearrange terms so one side equals zero",
              "Take square root of both sides immediately",
              "Divide entire equation by x",
              "Multiply by -1",
            ],
            correctIndex: 0,
            explanation: "Always set the quadratic expression equal to zero $(ax^2 + bx + c = 0)$ before factoring.",
          },
        };
        break;

      case 5:
        interventionType = "REVISION";
        title = `Prerequisite Refresh: ${conceptName}`;
        message = state === "FORGETTING"
          ? `Spaced Retention Check: It has been a while since you practiced ${conceptName}. Let's do a quick refresher.`
          : `Foundational Review: To master ${conceptName}, let's briefly review the prerequisite fundamentals.`;
        scaffoldedContent = {
          revisionTopicId: `rev_${conceptId}`,
          explanation: `A quick 2-minute review of foundational definitions will rebuild full confidence for this topic.`,
        };
        break;

      case 0:
      default:
        if (state === "MASTERING" && featureVector.accuracyRate >= 0.95) {
          interventionType = "ADVANCE_CHALLENGE";
          title = `Mastery Achieved! Advance to Challenge`;
          message = `Outstanding performance on ${conceptName}! You are ready to tackle high-order thinking problems or skip to the next chapter.`;
        } else {
          interventionType = "NONE";
          title = `Optimal Learning Path`;
          message = `You are progressing smoothly along the adaptive track.`;
        }
        break;
    }

    // 3. Synthesize Explainable Evidence
    const explainableEvidence = this.generateExplainableEvidence(
      state,
      newLevel,
      interventionType,
      featureVector,
      confidence
    );

    const decision: AdaptiveDecision = {
      id: `dec_${Date.now()}`,
      interventionLevel: newLevel,
      interventionType,
      targetConceptId: conceptId,
      conceptName,
      title,
      message,
      scaffoldedContent,
      recommendedDifficulty,
      explainableEvidence,
      confidence,
      requiresTeacherOverride,
      timestamp: Date.now(),
    };

    this.saveToStorage();
    return decision;
  }

  public getCurrentInterventionLevel(): number {
    return this.currentInterventionLevel;
  }

  public setInterventionLevel(level: number): void {
    this.currentInterventionLevel = Math.max(0, Math.min(5, level));
    this.saveToStorage();
  }

  public getTeacherAlerts(): TeacherAlert[] {
    return [...this.alerts];
  }

  public resolveTeacherAlert(alertId: string, notes?: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      if (notes) alert.teacherOverrideNotes = notes;
      this.saveToStorage();
    }
  }

  private generateExplainableEvidence(
    state: LearnerState,
    level: number,
    type: InterventionType,
    f: StatePrediction["featureVector"],
    confidence: number
  ): string {
    const confPct = (confidence * 100).toFixed(0);
    const accPct = (f.accuracyRate * 100).toFixed(0);

    if (level === 0) {
      return `AI Model evaluated state as ${state} (${confPct}% confidence). Accuracy is ${accPct}% with healthy response speed. No scaffolding required.`;
    }

    return `AI Model escalated support to Level ${level} (${type}) because student is ${state} (${confPct}% confidence). Trigger signals: ${f.consecutiveFailures} consecutive misses, hesitation index ${(f.hesitationIndex * 100).toFixed(0)}%, and ${f.avgResponseTimeSec.toFixed(1)}s response latency.`;
  }

  private createTeacherAlert(alert: Omit<TeacherAlert, "id" | "timestamp" | "resolved">): void {
    const newAlert: TeacherAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      resolved: false,
    };
    this.alerts.unshift(newAlert);
    if (this.alerts.length > 50) this.alerts.pop();
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem("edge_intervention_level", this.currentInterventionLevel.toString());
      localStorage.setItem("edge_teacher_alerts", JSON.stringify(this.alerts));
    } catch (e) {
      console.warn("[EdgeAI:AdaptiveDecisionEngine] Storage save warning", e);
    }
  }

  private loadFromStorage(): void {
    try {
      const level = localStorage.getItem("edge_intervention_level");
      if (level) this.currentInterventionLevel = parseInt(level, 10) || 0;
      const storedAlerts = localStorage.getItem("edge_teacher_alerts");
      if (storedAlerts) this.alerts = JSON.parse(storedAlerts);
    } catch (e) {
      console.warn("[EdgeAI:AdaptiveDecisionEngine] Storage load warning", e);
    }
  }
}
