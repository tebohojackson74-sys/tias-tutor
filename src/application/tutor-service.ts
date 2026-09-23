import { sendTutorMessageSchema } from "../api/schemas.js";
import type { EvidenceType } from "../domain/learning.js";
import { LearningEngine } from "./learning-engine.js";
import type { TutorTurnCommitRepository } from "./tutor-turn-commit.js";
import type { TutorTurnOrchestrator } from "./tutor-turn-orchestrator.js";
import type { PendingInteractionService } from "./pending-interaction-service.js";

function mapEvidenceType(interactionType: string): EvidenceType {
  switch (interactionType) {
    case "multiple_choice":
      return "multiple_choice";
    case "worked_example":
      return "worked_solution";
    case "question":
    case "quiz":
    case "short_answer":
      return "short_answer";
    default:
      return "short_answer";
  }
}

function mapOutcome(
  outcome: "correct" | "partially_correct" | "incorrect" | "unclear",
): "success" | "partial" | "failure" {
  if (outcome === "correct") return "success";
  if (outcome === "partially_correct") return "partial";
  return "failure";
}

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
    private readonly pendingInteractions: PendingInteractionService,
    private readonly learning: LearningEngine,
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

    const pendingEvaluation =
      await this.pendingInteractions.evaluateIfPresent({
        sessionId: input.sessionId,
        learnerAnswer: body.content,
        gradeLevel: processed.context.learner.gradeLevel,
        language: processed.context.learner.language,
      });

    let learning:
      | {
          learnerId: string;
          eventType: string;
          skillEvidence?: {
            learnerId: string;
            skillId: string;
            evidenceType: EvidenceType;
            outcome: "success" | "partial" | "failure";
            strength: number;
            evaluationConfidence: number;
            independenceFactor: number;
            difficultyFactor: number;
            transferFactor: number;
            contextDiversityFactor: number;
          };
          nextMastery?: ReturnType<
            LearningEngine["updateMastery"]
          >["next"];
          payload?: Record<string, unknown>;
        }
      | undefined;

    if (pendingEvaluation?.interaction.skillId) {
      const previous =
        processed.context.learning.mastery.find(
          (item) =>
            item.skillId === pendingEvaluation.interaction.skillId,
        ) ?? {
          skillId: pendingEvaluation.interaction.skillId,
          masteryScore: 0,
          confidenceScore: 0,
          independenceScore: 0,
          retentionScore: 0,
          evidenceMass: 0,
          independentSuccessCount: 0,
          transferSuccessCount: 0,
          retrievalSuccessCount: 0,
          attemptCount: 0,
          correctCount: 0,
          currentState: "unknown" as const,
        };

      const evidenceType = mapEvidenceType(
        pendingEvaluation.interaction.interactionType,
      );
      const outcome = mapOutcome(
        pendingEvaluation.evaluation.outcome,
      );
      const independenceFactor =
        pendingEvaluation.interaction.hintsUsed > 0 ? 0.65 : 1;
      const difficultyFactor =
        pendingEvaluation.interaction.difficulty === "challenge"
          ? 1.1
          : pendingEvaluation.interaction.difficulty === "support"
            ? 0.9
            : 1;

      const update = this.learning.updateMastery(previous, {
        learnerId: input.learnerId,
        skillId: pendingEvaluation.interaction.skillId,
        evidenceType,
        outcome,
        strength: 1,
        evaluationConfidence:
          pendingEvaluation.evaluation.confidence,
        independenceFactor,
        difficultyFactor,
        transferFactor: 1,
        contextDiversityFactor: 1,
      });

      learning = {
        learnerId: input.learnerId,
        eventType: "answer_evaluated",
        skillEvidence: {
          learnerId: input.learnerId,
          skillId: pendingEvaluation.interaction.skillId,
          evidenceType,
          outcome,
          strength: 1,
          evaluationConfidence:
            pendingEvaluation.evaluation.confidence,
          independenceFactor,
          difficultyFactor,
          transferFactor: 1,
          contextDiversityFactor: 1,
        },
        nextMastery: update.next,
        payload: {
          evaluation: pendingEvaluation.evaluation,
          pendingInteractionId: pendingEvaluation.interaction.id,
          masteryReason: update.reason,
        },
      };
    }

    const session = processed.context.session;

    const committed = await this.commit.commit({
      turnId: admitted.turn.id,
      sessionId: input.sessionId,
      executionToken: admitted.turn.executionToken,
      baseStateVersion: admitted.turn.baseStateVersion,
      response: processed.response,
      nextState: {
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
      },
      aiRun: {
        provider: "google-gemini",
        model:
          process.env.GEMINI_MODEL ?? "configured-gemini",
        purpose: "tutor_response",
        promptVersion: "tutor-v1",
        status: "success",
      },
      learning,
    });

    return {
      turnId: admitted.turn.id,
      assistantMessageId: committed.assistantMessageId,
      stateVersion: committed.committedStateVersion,
      response: processed.response,
      answerEvaluation: pendingEvaluation?.evaluation ?? null,
    };
  }
}
