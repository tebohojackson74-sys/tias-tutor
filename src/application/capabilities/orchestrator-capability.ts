import type { CapabilityContext, CapabilityRequest, CapabilityResult, TutorCapability, TutorCapabilityId } from "../capabilities.js";
import type { TutorTurnOrchestrator } from "../tutor-turn-orchestrator.js";

export class OrchestratorBackedCapability implements TutorCapability {
  constructor(public readonly id: TutorCapabilityId, private readonly orchestrator: TutorTurnOrchestrator) {}

  canHandle(context: CapabilityContext): boolean {
    return context.intent === "request_practice" ? this.id === "practice"
      : context.intent === "request_quiz" ? this.id === "quiz"
      : true;
  }

  async execute(request: CapabilityRequest): Promise<CapabilityResult> {
    const processing = await this.orchestrator.complete({
      learnerId: request.learnerId,
      sessionId: request.sessionId,
      learnerMessage: request.learnerMessage,
      groundingMode: request.groundingMode,
    }, request.prepared);
    return { ...processing, capabilityId: this.id };
  }
}
