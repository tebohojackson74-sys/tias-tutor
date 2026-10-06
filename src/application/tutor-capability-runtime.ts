import type { TutorIntent } from "../domain/tutor.js";
import {
  capabilityForIntent,
  type CapabilityRequest,
  type CapabilityResult,
} from "./capabilities.js";
import { CapabilityRegistry } from "./capability-registry.js";
import { OrchestratorBackedCapability } from "./capabilities/orchestrator-capability.js";
import type { TutorTurnOrchestrator } from "./tutor-turn-orchestrator.js";

export class TutorCapabilityRuntime {
  constructor(
    private readonly registry: CapabilityRegistry,
  ) {}

  static create(orchestrator: TutorTurnOrchestrator): TutorCapabilityRuntime {
    const registry = new CapabilityRegistry();

    const ids = [
      "chat",
      "guided_learning",
      "practice",
      "quiz",
      "reading",
      "mastery_path",
    ] as const;

    for (const id of ids) {
      registry.register(
        new OrchestratorBackedCapability(id, orchestrator, [id]),
      );
    }

    return new TutorCapabilityRuntime(registry);
  }

  resolveCapability(intent: TutorIntent) {
    return capabilityForIntent(intent);
  }

  async execute(request: CapabilityRequest): Promise<CapabilityResult> {
    const preferred = capabilityForIntent(request.intent);

    try {
      const capability = this.registry.get(preferred);
      return capability.execute(request);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Tutor capability not registered")
      ) {
        return this.registry.get("chat").execute(request);
      }
      throw error;
    }
  }

  listCapabilities() {
    return this.registry.list();
  }
}
