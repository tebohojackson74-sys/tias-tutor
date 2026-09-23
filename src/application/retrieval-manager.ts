import type { RetrievedEvidence } from "../domain/tutor.js";

export interface RetrievalProvider {
  search(input: {
    learnerId: string;
    subjectId: string | null;
    topicId: string | null;
    skillId: string | null;
    query: string;
  }): Promise<RetrievedEvidence[]>;
}

export class RetrievalManager {
  constructor(private readonly provider: RetrievalProvider) {}

  async retrieve(input: {
    learnerId: string;
    subjectId: string | null;
    topicId: string | null;
    skillId: string | null;
    query: string;
    groundingMode:
      | "source_only"
      | "curriculum_plus_sources"
      | "general_plus_sources";
  }): Promise<RetrievedEvidence[]> {
    const results = await this.provider.search(input);

    const allowed = results.filter((item) => {
      if (input.groundingMode === "source_only") {
        return item.authority === "learner" ||
          item.authority === "teacher" ||
          item.authority === "school_approved";
      }

      if (input.groundingMode === "curriculum_plus_sources") {
        return item.authority === "curriculum" ||
          item.authority === "learner" ||
          item.authority === "teacher" ||
          item.authority === "school_approved";
      }

      return true;
    });

    const unique = new Map<string, RetrievedEvidence>();
    for (const evidence of allowed) {
      const existing = unique.get(evidence.evidenceId);
      if (!existing || evidence.relevanceScore > existing.relevanceScore) {
        unique.set(evidence.evidenceId, evidence);
      }
    }

    return [...unique.values()]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 8);
  }
}
