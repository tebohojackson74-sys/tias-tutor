import type { TutorGenerationRequest, TutorModelResponse } from "../domain/tutor.js";

export interface AIGateway {
  generateTutorResponse(
    request: TutorGenerationRequest,
  ): Promise<TutorModelResponse>;
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
