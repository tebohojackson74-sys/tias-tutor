import type { MasteryState, MasteryUpdate, SkillEvidenceInput } from "../domain/learning.js";

const BASE_WEIGHTS: Record<SkillEvidenceInput["evidenceType"], number> = {
  recognition: 0.2,
  multiple_choice: 0.35,
  short_answer: 0.55,
  worked_solution: 0.75,
  explanation: 0.8,
  guided_success: 0.55,
  independent_success: 1,
  transfer_success: 1.15,
  retrieval_success: 1.1,
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export class LearningEngine {
  constructor(
    private readonly learningRate = 0.15,
    private readonly confidenceRate = 0.1,
  ) {}

  updateMastery(
    previous: MasteryState,
    evidence: SkillEvidenceInput,
  ): MasteryUpdate {
    const baseWeight = BASE_WEIGHTS[evidence.evidenceType];
    const evidenceWeight =
      baseWeight *
      clamp(evidence.strength) *
      clamp(evidence.evaluationConfidence) *
      evidence.independenceFactor *
      evidence.difficultyFactor *
      evidence.transferFactor *
      evidence.contextDiversityFactor;

    const outcomeMultiplier =
      evidence.outcome === "success"
        ? 1
        : evidence.outcome === "partial"
          ? 0.35
          : -0.7;

    const delta = this.learningRate * evidenceWeight * outcomeMultiplier;
    const mastery = clamp(previous.masteryScore + delta);
    const evidenceMass = previous.evidenceMass + evidenceWeight;

    const next: MasteryState = {
      ...previous,
      masteryScore: mastery,
      confidenceScore: clamp(
        previous.confidenceScore +
          this.confidenceRate *
            clamp(evidence.evaluationConfidence) *
            Math.min(1, evidenceWeight),
      ),
      independenceScore: clamp(
        previous.independenceScore +
          (evidence.outcome === "success"
            ? 0.05 * clamp(evidence.independenceFactor)
            : -0.02),
      ),
      retentionScore:
        evidence.evidenceType === "retrieval_success"
          ? clamp(previous.retentionScore + 0.08)
          : previous.retentionScore,
      evidenceMass,
      independentSuccessCount:
        previous.independentSuccessCount +
        (evidence.evidenceType === "independent_success" &&
        evidence.outcome === "success"
          ? 1
          : 0),
      transferSuccessCount:
        previous.transferSuccessCount +
        (evidence.evidenceType === "transfer_success" &&
        evidence.outcome === "success"
          ? 1
          : 0),
      retrievalSuccessCount:
        previous.retrievalSuccessCount +
        (evidence.evidenceType === "retrieval_success" &&
        evidence.outcome === "success"
          ? 1
          : 0),
      attemptCount: previous.attemptCount + 1,
      correctCount:
        previous.correctCount + (evidence.outcome === "success" ? 1 : 0),
    };

    return {
      previous,
      next,
      reason: `Applied ${evidence.evidenceType} evidence with a bounded mastery update.`,
    };
  }
}
