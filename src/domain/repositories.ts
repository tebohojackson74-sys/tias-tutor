import type { TutorSessionState, TutorTurn } from "./tutor.js";

export interface TutorSessionRecord {
  id: string;
  userId: string;
  status: "active" | "paused" | "completed" | "archived";
  stateVersion: number;
}

export interface TutorMessageRecord {
  id: string;
  sessionId: string;
  clientMessageId: string | null;
  turnId: string | null;
  role: "student" | "assistant" | "system" | "tool";
  senderUserId: string | null;
  content: string;
}

export interface TutorSessionRepository {
  getForAdmission(sessionId: string): Promise<TutorSessionRecord | null>;
  getState(sessionId: string): Promise<TutorSessionState>;
  updateStateOptimistically(input: {
    sessionId: string;
    expectedVersion: number;
    next: Omit<TutorSessionState, "sessionId" | "stateVersion">;
  }): Promise<boolean>;
}

export interface TutorTurnRepository {
  findByClientTurnId(
    sessionId: string,
    clientTurnId: string,
  ): Promise<TutorTurn | null>;
  hasActiveTurn(sessionId: string): Promise<boolean>;
  create(input: {
    sessionId: string;
    clientTurnId: string;
    baseStateVersion: number;
    executionToken: string;
  }): Promise<TutorTurn>;
  markCommitted(turnId: string, executionToken: string): Promise<void>;
  markFailed(
    turnId: string,
    executionToken: string,
    reason: string,
  ): Promise<void>;
}

export interface TutorMessageRepository {
  findByClientMessageId(
    sessionId: string,
    clientMessageId: string,
  ): Promise<TutorMessageRecord | null>;
  create(input: {
    sessionId: string;
    clientMessageId: string;
    role: TutorMessageRecord["role"];
    content: string;
    senderUserId: string | null;
    turnId: string | null;
  }): Promise<TutorMessageRecord>;
  listRecent(
    sessionId: string,
    limit: number,
  ): Promise<TutorMessageRecord[]>;
}
