import type { AnswerEvaluation } from "../domain/assessment.js";
import type {
  TutorGenerationRequest,
  TutorModelResponse,
} from "../domain/tutor.js";

export interface AIGateway {
  generateTutorResponse(
    request: TutorGenerationRequest,
  ): Promise<TutorModelResponse>;

  evaluateAnswer(request: {
    question: string;
    learnerAnswer: string;
    expectedEvidence: unknown;
    skillId: string | null;
    gradeLevel: string;
    language: string;
  }): Promise<AnswerEvaluation>;
}

export class AIConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIConfigurationError";
  }
}

export class AIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIProviderError";
  }
}
