import type { AIGateway } from "./ai-gateway.js";
import type { TutorContextBuilder } from "./tutor-context-builder.js";
import type { TutorContext } from "./tutor-context.js";
import type { RetrievalManager } from "./retrieval-manager.js";
import { RuleBasedIntentDetector } from "./intent-detector.js";
import { StrategyEngine } from "./strategy-engine.js";
import { ResponseValidator } from "./response-validator.js";
import type { TutorModelResponse } from "../domain/tutor.js";

export interface TutorTurnProcessingInput {
  learnerId: string;
  sessionId: string;
  learnerMessage: string;
  groundingMode: "source_only"|"curriculum_plus_sources"|"general_plus_sources";
}

export interface PreparedTutorTurn {
  context: TutorContext;
  intent: ReturnType<RuleBasedIntentDetector["detect"]>;
  teachingMove: ReturnType<StrategyEngine["choose"]>;
}

export interface TutorTurnProcessingResult extends PreparedTutorTurn {
  response: TutorModelResponse;
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

  async prepare(input: TutorTurnProcessingInput): Promise<PreparedTutorTurn> {
    const context = await this.contextBuilder.build({
      learnerId: input.learnerId,
      sessionId: input.sessionId,
      learnerMessage: input.learnerMessage,
      groundingMode: input.groundingMode,
    });
    const intent = this.intentDetector.detect({ message: input.learnerMessage, context });
    const evidence = await this.retrieval.retrieve({
      learnerId: input.learnerId,
      subjectId: context.session.subjectId,
      topicId: context.session.topicId,
      skillId: context.session.skillId,
      query: input.learnerMessage,
      groundingMode: input.groundingMode,
    });
    const strategy = this.strategyEngine.choose({ context: { ...context, evidence }, intent: intent.intent });
    return { context: { ...context, evidence, intent: intent.intent }, intent, teachingMove: strategy };
  }

  async complete(input: TutorTurnProcessingInput, prepared: PreparedTutorTurn): Promise<TutorTurnProcessingResult> {
    const response = await this.ai.generateTutorResponse({
      learnerMessage: input.learnerMessage,
      intent: prepared.intent.intent,
      objective: prepared.context.objective.objective,
      teachingMove: prepared.teachingMove.move,
      teachingPhase: prepared.teachingMove.phase,
      language: prepared.context.learner.language,
      gradeLevel: prepared.context.learner.gradeLevel,
      groundingMode: input.groundingMode,
      evidence: prepared.context.evidence,
    });
    const validated = this.responseValidator.validate({
      response,
      evidence: prepared.context.evidence,
      groundingMode: input.groundingMode,
      requireLearnerInteraction: prepared.teachingMove.askLearner,
    });
    if (!validated.response) throw new Error(`Tutor response failed validation: ${validated.reasons.join("; ")}`);
    return { ...prepared, response: validated.response };
  }

  async process(input: TutorTurnProcessingInput): Promise<TutorTurnProcessingResult> {
    return this.complete(input, await this.prepare(input));
  }
}
