import type {
  CapabilityContext,
  CapabilityRequest,
  CapabilityResult,
  TutorCapability,
  TutorCapabilityId,
} from "../capabilities.js";
import type { TutorTurnOrchestrator } from "../tutor-turn-orchestrator.js";

export class OrchestratorBackedCapability implements TutorCapability {
  constructor(
    public readonly id: TutorCapabilityId,
    private readonly orchestrator: TutorTurnOrchestrator,
    private readonly acceptedIds: TutorCapabilityId[],
  ) {}

  canHandle(context: CapabilityContext): boolean {
    return this.acceptedIds.includes(
      context.intent === "request_practice"
        ? "practice"
        : context.intent === "request_quiz"
          ? "quiz"
          : this.id,
    );
  }

  async execute(request: CapabilityRequest): Promise<CapabilityResult> {
    const processing = await this.orchestrator.process({
      learnerId: request.learnerId,
      sessionId: request.sessionId,
      learnerMessage: request.learnerMessage,
      groundingMode: request.groundingMode,
    });

    return {
      capabilityId: this.id,
      response: processing.response,
      processing,
    };
  }
}
