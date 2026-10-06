import type { TutorIntent, TutorModelResponse } from "../domain/tutor.js";
import type { TutorTurnProcessingResult } from "./tutor-turn-orchestrator.js";
import type { TutorContext } from "./tutor-context.js";

export type TutorCapabilityId =
  | "chat"
  | "guided_learning"
  | "practice"
  | "quiz"
  | "deep_solve"
  | "deep_question"
  | "research"
  | "reading"
  | "visualize"
  | "mastery_path"
  | "assessment";

export interface CapabilityContext {
  learnerId: string;
  sessionId: string;
  learnerMessage: string;
  intent: TutorIntent;
  tutorContext?: TutorContext;
}

export interface CapabilityRequest extends CapabilityContext {
  groundingMode:
    | "source_only"
    | "curriculum_plus_sources"
    | "general_plus_sources";
}

export interface CapabilityResult {
  capabilityId: TutorCapabilityId;
  response: TutorModelResponse;
  processing: TutorTurnProcessingResult;
}

export interface TutorCapability {
  readonly id: TutorCapabilityId;
  canHandle(context: CapabilityContext): boolean;
  execute(request: CapabilityRequest): Promise<CapabilityResult>;
}

export function capabilityForIntent(intent: TutorIntent): TutorCapabilityId {
  switch (intent) {
    case "request_practice":
      return "practice";
    case "request_quiz":
      return "quiz";
    case "request_explanation":
    case "request_example":
    case "request_hint":
    case "confused":
    case "stuck":
      return "guided_learning";
    case "request_summary":
      return "reading";
    case "challenge_request":
      return "mastery_path";
    default:
      return "chat";
  }
}
