import type { TutorModelResponse } from "../domain/tutor.js";
import type { MasteryState, SkillEvidenceInput } from "../domain/learning.js";

export interface TutorTurnCommitInput {
  turnId: string;
  sessionId: string;
  executionToken: string;
  baseStateVersion: number;
  response: TutorModelResponse;
  nextState: {
    currentSubjectId: string | null;
    currentTopicId: string | null;
    currentSkillId: string | null;
    currentObjective: string | null;
    teachingPhase:
      | "diagnosis"
      | "explanation"
      | "guided_practice"
      | "independent_practice"
      | "retrieval"
      | "transfer"
      | "mastery";
    currentPendingInteractionId: string | null;
    conversationSummary: string;
    turnNumber: number;
  };
  aiRun: {
    provider: string;
    model: string;
    purpose: string;
    promptVersion: string;
    policyVersion?: string;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs?: number;
    requestMetadata?: Record<string, unknown>;
    responseMetadata?: Record<string, unknown>;
    responseHash?: string;
    status: string;
  };
  learning?: {
    learnerId: string;
    eventType: string;
    skillEvidence?: SkillEvidenceInput & { skillId: string };
    nextMastery?: MasteryState;
    payload?: Record<string, unknown>;
  };
}

export interface TutorTurnCommitResult {
  assistantMessageId: string;
  committedStateVersion: number;
}

export class TutorTurnStateConflictError extends Error {
  constructor() {
    super("Tutor session state changed while this turn was being processed.");
    this.name = "TutorTurnStateConflictError";
  }
}

export interface TutorTurnCommitRepository {
  commit(input: TutorTurnCommitInput): Promise<TutorTurnCommitResult>;
}
