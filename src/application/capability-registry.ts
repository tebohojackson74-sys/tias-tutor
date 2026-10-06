import type {
  CapabilityContext,
  CapabilityRequest,
  CapabilityResult,
  TutorCapability,
  TutorCapabilityId,
} from "./capabilities.js";

export class CapabilityRegistry {
  private readonly capabilities = new Map<TutorCapabilityId, TutorCapability>();

  register(capability: TutorCapability): void {
    if (this.capabilities.has(capability.id)) {
      throw new Error(`Tutor capability already registered: ${capability.id}`);
    }
    this.capabilities.set(capability.id, capability);
  }

  get(id: TutorCapabilityId): TutorCapability {
    const capability = this.capabilities.get(id);
    if (!capability) {
      throw new Error(`Tutor capability not registered: ${id}`);
    }
    return capability;
  }

  resolve(context: CapabilityContext): TutorCapability {
    const candidates = [...this.capabilities.values()].filter((item) =>
      item.canHandle(context),
    );

    if (candidates.length === 0) {
      return this.get("chat");
    }

    return candidates[0];
  }

  async execute(request: CapabilityRequest): Promise<CapabilityResult> {
    return this.resolve(request).execute(request);
  }

  list(): TutorCapabilityId[] {
    return [...this.capabilities.keys()];
  }
}
