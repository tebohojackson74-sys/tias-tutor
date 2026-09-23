import { randomUUID } from "node:crypto";
import type {
  TutorMessageRepository,
  TutorSessionRepository,
  TutorTurnRepository,
} from "../domain/repositories.js";
import type { TutorTurn } from "../domain/tutor.js";

export class ActiveTutorTurnError extends Error {
  constructor() {
    super("Another tutor turn is currently being processed for this session.");
    this.name = "ActiveTutorTurnError";
  }
}

export class TutorSessionClosedError extends Error {
  constructor() {
    super("The tutor session is not accepting new messages.");
    this.name = "TutorSessionClosedError";
  }
}

export interface AdmitTutorTurnInput {
  sessionId: string;
  userId: string;
  clientTurnId: string;
  content: string;
}

export interface AdmittedTutorTurn {
  turn: TutorTurn;
  learnerMessageId: string;
}

export class TutorTurnAdmissionService {
  constructor(
    private readonly sessions: TutorSessionRepository,
    private readonly turns: TutorTurnRepository,
    private readonly messages: TutorMessageRepository,
  ) {}

  async admit(input: AdmitTutorTurnInput): Promise<AdmittedTutorTurn> {
    const existing = await this.turns.findByClientTurnId(
      input.sessionId,
      input.clientTurnId,
    );

    if (existing) {
      const message = await this.messages.findByClientMessageId(
        input.sessionId,
        input.clientTurnId,
      );
      if (!message) {
        throw new Error("Existing turn has no corresponding learner message.");
      }
      return { turn: existing, learnerMessageId: message.id };
    }

    const session = await this.sessions.getForAdmission(input.sessionId);
    if (!session) throw new Error("Tutor session not found.");
    if (session.status !== "active") throw new TutorSessionClosedError();

    if (session.userId !== input.userId) {
      throw new Error("Not authorised to use this tutor session.");
    }

    if (await this.turns.hasActiveTurn(input.sessionId)) {
      throw new ActiveTutorTurnError();
    }

    const executionToken = randomUUID();

    const turn = await this.turns.create({
      sessionId: input.sessionId,
      clientTurnId: input.clientTurnId,
      baseStateVersion: session.stateVersion,
      executionToken,
    });

    const message = await this.messages.create({
      sessionId: input.sessionId,
      clientMessageId: input.clientTurnId,
      role: "student",
      content: input.content,
      senderUserId: input.userId,
      turnId: turn.id,
    });

    return { turn, learnerMessageId: message.id };
  }
}
