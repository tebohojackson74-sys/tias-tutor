import type { TutorModelResponse, RetrievedEvidence } from "../domain/tutor.js";

export type ResponseValidationDecision = "accept" | "regenerate" | "fallback";

export interface ResponseValidationResult {
  decision: ResponseValidationDecision;
  response?: TutorModelResponse;
  reasons: string[];
}

export class ResponseValidator {
  validate(input: {
    response: TutorModelResponse;
    evidence: RetrievedEvidence[];
    groundingMode:
      | "source_only"
      | "curriculum_plus_sources"
      | "general_plus_sources";
    requireLearnerInteraction: boolean;
  }): ResponseValidationResult {
    const reasons: string[] = [];
    const evidenceIds = new Set(input.evidence.map((item) => item.evidenceId));

    for (const citation of input.response.citations) {
      if (!evidenceIds.has(citation.evidenceId)) {
        reasons.push("AI returned a citation that was not present in retrieved evidence.");
      }
    }

    if (input.groundingMode === "source_only" && input.evidence.length === 0) {
      reasons.push("Source-only mode requires authorised evidence.");
    }

    if (
      input.requireLearnerInteraction &&
      !input.response.interaction &&
      input.response.format !== "question"
    ) {
      reasons.push("The selected teaching strategy requires learner interaction.");
    }

    if (input.response.answer.trim().length === 0) {
      reasons.push("The tutor response is empty.");
    }

    if (reasons.length === 0) {
      return {
        decision: "accept",
        response: input.response,
        reasons: [],
      };
    }

    return {
      decision: "regenerate",
      reasons,
    };
  }
}
