import type { TutorIntent } from "../domain/tutor.js";
import { capabilityForIntent, type CapabilityRequest, type CapabilityResult } from "./capabilities.js";
import { CapabilityRegistry } from "./capability-registry.js";
import { OrchestratorBackedCapability } from "./capabilities/orchestrator-capability.js";
import type { TutorTurnOrchestrator } from "./tutor-turn-orchestrator.js";

export class TutorCapabilityRuntime {
  constructor(private readonly registry: CapabilityRegistry, private readonly orchestrator: TutorTurnOrchestrator) {}

  static create(orchestrator: TutorTurnOrchestrator): TutorCapabilityRuntime {
    const registry = new CapabilityRegistry();
    for (const id of ["chat","guided_learning","practice","quiz","reading","mastery_path"] as const) {
      registry.register(new OrchestratorBackedCapability(id, orchestrator));
    }
    return new TutorCapabilityRuntime(registry, orchestrator);
  }

  async execute(input: Omit<CapabilityRequest, "intent"|"tutorContext"|"prepared">): Promise<CapabilityResult> {
    const prepared = await this.orchestrator.prepare(input);
    const capability = this.registry.get(capabilityForIntent(prepared.intent.intent));
    return capability.execute({
      ...input,
      intent: prepared.intent.intent,
      tutorContext: prepared.context,
      prepared,
    });
  }

  resolveCapability(intent: TutorIntent) { return capabilityForIntent(intent); }
  listCapabilities() { return this.registry.list(); }
}
