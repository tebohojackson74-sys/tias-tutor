export type AnswerOutcome =
  | "correct"
  | "partially_correct"
  | "incorrect"
  | "unclear";

export type ErrorClassification =
  | "conceptual_misunderstanding"
  | "procedural_error"
  | "careless_error"
  | "misread"
  | "missing_prerequisite"
  | "guess"
  | "unclear";

export interface AnswerEvaluation {
  outcome: AnswerOutcome;
  confidence: number;
  errorClassification?: ErrorClassification;
  feedbackRecommendation:
    | "affirm"
    | "correct"
    | "clarify"
    | "remediate"
    | "retry";
  skillEvidence: Array<{
    skillId: string;
    evidenceWeight: number;
    confidence: number;
  }>;
  misconceptionSignals: Array<{
    patternCode: string;
    description: string;
    severity: number;
    confidence: number;
  }>;
  reasoningEvidence?: string[];
}
