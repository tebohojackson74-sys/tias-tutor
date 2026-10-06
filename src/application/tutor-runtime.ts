import { CapabilityRegistry } from "./capability-registry.js";
import { TutorCapabilityRuntime } from "./tutor-capability-runtime.js";
import { ToolRegistry } from "./tool-registry.js";
import type { TutorTurnOrchestrator } from "./tutor-turn-orchestrator.js";

export interface TutorRuntime {
  readonly capabilities: TutorCapabilityRuntime;
  readonly tools: ToolRegistry;
}

export function createTutorRuntime(
  orchestrator: TutorTurnOrchestrator,
): TutorRuntime {
  const capabilities = TutorCapabilityRuntime.create(orchestrator);
  const tools = new ToolRegistry();

  return { capabilities, tools };
}

export function createCapabilityRegistry(
  orchestrator: TutorTurnOrchestrator,
): CapabilityRegistry {
  const runtime = createTutorRuntime(orchestrator);
  const registry = new CapabilityRegistry();

  for (const id of runtime.capabilities.listCapabilities()) {
    // Kept as a compatibility helper for callers that need direct registry access.
    registry.register({
      id,
      canHandle: () => true,
      execute: (request) => runtime.capabilities.execute(request),
    });
  }

  return registry;
}
