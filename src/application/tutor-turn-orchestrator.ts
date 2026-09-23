import type { AIGateway } from "./ai-gateway.js";
import type { TutorContext, TutorContextBuilder } from "./tutor-context-builder.js";
import type { RetrievalManager } from "./retrieval-manager.js";
import { RuleBasedIntentDetector } from "./intent-detector.js";
import { StrategyEngine } from "./strategy-engine.js";
import { ResponseValidator } from "./response-validator.js";
import type { TutorModelResponse } from "../domain/tutor.js";

export interface TutorTurnProcessingInput {
  learnerId: string;
  sessionId: string;
  learnerMessage: string;
  groundingMode:
    | "source_only"
    | "curriculum_plus_sources"
    | "general_plus_sources";
}

export interface TutorTurnProcessingResult {
  response: TutorModelResponse;
  intent: ReturnType<RuleBasedIntentDetector["detect"]>;
  teachingMove: ReturnType<StrategyEngine["choose"]>;
  context: TutorContext;
}

export class TutorTurnOrchestrator {
  private readonly intentDetector = new RuleBasedIntentDetector();
  private readonly strategyEngine = new StrategyEngine();
  private readonly responseValidator = new ResponseValidator();

  constructor(
    private readonly contextBuilder: TutorContextBuilder,
    private readonly retrieval: RetrievalManager,
    private readonly ai: AIGateway,
  ) {}

  async process(
    input: TutorTurnProcessingInput,
  ): Promise<TutorTurnProcessingResult> {
    const context = await this.contextBuilder.build({
      learnerId: input.learnerId,
      sessionId: input.sessionId,
      learnerMessage: input.learnerMessage,
      groundingMode: input.groundingMode,
    });

    const intent = this.intentDetector.detect({
      message: input.learnerMessage,
      context,
    });

    const evidence = await this.retrieval.retrieve({
      learnerId: input.learnerId,
      subjectId: context.session.subjectId,
      topicId: context.session.topicId,
      skillId: context.session.skillId,
      query: input.learnerMessage,
      groundingMode: input.groundingMode,
    });

    const strategy = this.strategyEngine.choose({
      context: { ...context, evidence },
      intent: intent.intent,
    });

    const response = await this.ai.generateTutorResponse({
      learnerMessage: input.learnerMessage,
      intent: intent.intent,
      objective: context.objective.objective,
      teachingMove: strategy.move,
      teachingPhase: strategy.phase,
      language: context.learner.language,
      gradeLevel: context.learner.gradeLevel,
      groundingMode: input.groundingMode,
      evidence,
    });

    const validated = this.responseValidator.validate({
      response,
      evidence,
      groundingMode: input.groundingMode,
      requireLearnerInteraction: strategy.askLearner,
    });

    if (!validated.response) {
      throw new Error(`Tutor response failed validation: ${validated.reasons.join("; ")}`);
    }

    return {
      response: validated.response,
      intent,
      teachingMove: strategy,
      context: { ...context, evidence, intent: intent.intent },
    };
  }
}
