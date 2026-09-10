// ==========================================================
// EDGE LAYER: AdaptiveContentDeliverer
// Generates scaffolded learning packages based on AdaptiveDecisions
// ==========================================================

import type { AdaptiveDecision, DifficultyLevel } from "./types";

export interface ScaffoldedPackage {
  decisionId: string;
  conceptId: string;
  conceptName: string;
  level: number;
  type: AdaptiveDecision["interventionType"];
  title: string;
  content: string;
  actionPrompt?: string;
  difficulty: DifficultyLevel;
  interactiveItem?: any;
}

export class AdaptiveContentDeliverer {
  public deliverContent(decision: AdaptiveDecision): ScaffoldedPackage {
    let content = decision.message;
    let actionPrompt = "Continue Learning";
    let interactiveItem: any = null;

    if (decision.scaffoldedContent) {
      if (decision.scaffoldedContent.hint) {
        content = decision.scaffoldedContent.hint;
        actionPrompt = "Got the Hint";
      } else if (decision.scaffoldedContent.explanation) {
        content = decision.scaffoldedContent.explanation;
        actionPrompt = "Understood Explanation";
      } else if (decision.scaffoldedContent.example) {
        content = decision.scaffoldedContent.example;
        actionPrompt = "Reviewed Example";
      } else if (decision.scaffoldedContent.practiceQuestion) {
        content = decision.scaffoldedContent.practiceQuestion.question;
        interactiveItem = decision.scaffoldedContent.practiceQuestion;
        actionPrompt = "Submit Guided Answer";
      }
    }

    return {
      decisionId: decision.id,
      conceptId: decision.targetConceptId,
      conceptName: decision.conceptName,
      level: decision.interventionLevel,
      type: decision.interventionType,
      title: decision.title,
      content,
      actionPrompt,
      difficulty: decision.recommendedDifficulty,
      interactiveItem,
    };
  }
}
