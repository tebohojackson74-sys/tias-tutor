import { sendTutorMessageSchema } from "../api/schemas.js";
import type { TutorTurnCommitRepository } from "./tutor-turn-commit.js";
import type { TutorTurnOrchestrator } from "./tutor-turn-orchestrator.js";

export class TutorService {
  constructor(
    private readonly admission: {
      admit(input: {
        sessionId: string;
        userId: string;
        clientTurnId: string;
        content: string;
      }): Promise<{
        turn: {
          id: string;
          executionToken: string;
          baseStateVersion: number;
        };
        learnerMessageId: string;
      }>;
    },
    private readonly orchestrator: TutorTurnOrchestrator,
    private readonly commit: TutorTurnCommitRepository,
  ) {}

  async sendMessage(input: {
    userId: string;
    learnerId: string;
    sessionId: string;
    body: unknown;
  }) {
    const body = sendTutorMessageSchema.parse(input.body);

    const admitted = await this.admission.admit({
      sessionId: input.sessionId,
      userId: input.userId,
      clientTurnId: body.clientTurnId,
      content: body.content,
    });

    const processed = await this.orchestrator.process({
      learnerId: input.learnerId,
      sessionId: input.sessionId,
      learnerMessage: body.content,
      groundingMode: "curriculum_plus_sources",
    });

    const session = processed.context.session;
    const nextState = {
      currentSubjectId: session.subjectId,
      currentTopicId: session.topicId,
      currentSkillId:
        processed.response.interaction?.skillId ?? session.skillId,
      currentObjective: session.objective,
      teachingPhase: processed.teachingMove.phase,
      currentPendingInteractionId: null,
      conversationSummary: [
        session.conversationSummary,
        `Learner: ${body.content}`,
        `Tutor: ${processed.response.answer}`,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(-8000),
      turnNumber: session.turnNumber + 1,
    };

    const committed = await this.commit.commit({
      turnId: admitted.turn.id,
      sessionId: input.sessionId,
      executionToken: admitted.turn.executionToken,
      baseStateVersion: admitted.turn.baseStateVersion,
      response: processed.response,
      nextState,
      aiRun: {
        provider: "google-gemini",
        model: process.env.GEMINI_MODEL ?? "configured-gemini",
        purpose: "tutor_response",
        promptVersion: "tutor-v1",
        status: "success",
      },
    });

    return {
      turnId: admitted.turn.id,
      assistantMessageId: committed.assistantMessageId,
      stateVersion: committed.committedStateVersion,
      response: processed.response,
    };
  }
}
