import { randomUUID } from "node:crypto";
import type { TutorTurn } from "../domain/tutor.js";
import type { AdmittedTutorTurn, AdmitTutorTurnInput } from "./tutor-turn-admission.js";

export interface AtomicTutorTurnAdmissionRepository {
  admit(input: AdmitTutorTurnInput): Promise<AdmittedTutorTurn>;
}

export function createAtomicTutorTurn(input: {
  id: string;
  sessionId: string;
  clientTurnId: string;
  baseStateVersion: number;
  executionToken: string;
}): TutorTurn {
  return {
    id: input.id,
    sessionId: input.sessionId,
    clientTurnId: input.clientTurnId,
    baseStateVersion: input.baseStateVersion,
    processingStatus: "received",
    executionToken: input.executionToken || randomUUID(),
  };
}

export class AtomicTutorTurnAdmissionService {
  constructor(
    private readonly repository: AtomicTutorTurnAdmissionRepository,
  ) {}

  admit(input: AdmitTutorTurnInput): Promise<AdmittedTutorTurn> {
    return this.repository.admit(input);
  }
}
