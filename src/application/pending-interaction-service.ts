import type { AnswerEvaluation } from "../domain/assessment.js";
import type { PendingInteraction } from "../domain/tutor.js";
import type { AIGateway } from "./ai-gateway.js";

export interface PendingInteractionReader {
  getWaiting(sessionId: string): Promise<PendingInteraction | null>;
}

export interface PendingInteractionEvaluation {
  interaction: PendingInteraction;
  evaluation: AnswerEvaluation;
}

export class PendingInteractionService {
  constructor(
    private readonly reader: PendingInteractionReader,
    private readonly ai: AIGateway,
  ) {}

  async evaluateIfPresent(input: {
    sessionId: string;
    learnerAnswer: string;
    gradeLevel: string;
    language: string;
  }): Promise<PendingInteractionEvaluation | null> {
    const interaction = await this.reader.getWaiting(input.sessionId);
    if (!interaction) return null;

    const evaluation = await this.ai.evaluateAnswer({
      question: interaction.question,
      learnerAnswer: input.learnerAnswer,
      expectedEvidence: interaction.expectedEvidence,
      skillId: interaction.skillId,
      gradeLevel: input.gradeLevel,
      language: input.language,
    });

    return { interaction, evaluation };
  }
}
