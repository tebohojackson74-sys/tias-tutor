export type EvidenceOutcome = "success" | "partial" | "failure";

export type EvidenceType =
  | "recognition"
  | "multiple_choice"
  | "short_answer"
  | "worked_solution"
  | "explanation"
  | "guided_success"
  | "independent_success"
  | "transfer_success"
  | "retrieval_success";

export interface SkillEvidenceInput {
  learnerId: string;
  skillId: string;
  evidenceType: EvidenceType;
  outcome: EvidenceOutcome;
  strength: number;
  evaluationConfidence: number;
  independenceFactor: number;
  difficultyFactor: number;
  transferFactor: number;
  contextDiversityFactor: number;
  sourceEventId?: string;
}

export interface MasteryState {
  masteryScore: number;
  confidenceScore: number;
  independenceScore: number;
  retentionScore: number;
  evidenceMass: number;
  independentSuccessCount: number;
  transferSuccessCount: number;
  retrievalSuccessCount: number;
  attemptCount: number;
  correctCount: number;
}

export interface MasteryUpdate {
  previous: MasteryState;
  next: MasteryState;
  reason: string;
}
