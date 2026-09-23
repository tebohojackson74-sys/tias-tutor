import type { RetrievalProvider } from "../../application/retrieval-manager.js";
import type { RetrievedEvidence } from "../../domain/tutor.js";

export class EmptyRetrievalProvider implements RetrievalProvider {
  async search(_input: {
    learnerId: string;
    subjectId: string | null;
    topicId: string | null;
    skillId: string | null;
    query: string;
  }): Promise<RetrievedEvidence[]> {
    return [];
  }
}
