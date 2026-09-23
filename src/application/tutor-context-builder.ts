import type { TutorContext, BuildTutorContextInput, TutorContextSources } from "./tutor-context.js";

export class TutorContextBuilder {
  constructor(private readonly sources: TutorContextSources) {}

  async build(input: BuildTutorContextInput): Promise<TutorContext> {
    const session = await this.sources.getSessionState(input.sessionId);
    const learner = await this.sources.getLearnerProfile(input.learnerId);
    const learning = await this.sources.getLearningContext(
      input.learnerId,
      session.skillId,
    );
    const recentMessages = await this.sources.getRecentMessages(
      input.sessionId,
      12,
    );
    const summary = await this.sources.getConversationSummary(
      input.sessionId,
    );
    const evidence = await this.sources.getEvidence({
      learnerId: input.learnerId,
      subjectId: session.subjectId,
      topicId: session.topicId,
      skillId: session.skillId,
      query: input.learnerMessage,
      groundingMode: input.groundingMode,
    });

    return {
      learner,
      session,
      objective: {
        subjectId: session.subjectId,
        topicId: session.topicId,
        skillId: session.skillId,
        objective: session.objective,
      },
      learning,
      conversation: {
        recentMessages,
        summary,
      },
      evidence,
      constraints: {
        groundingMode: input.groundingMode,
        requireLearnerInteraction: session.teachingPhase !== "mastery",
        allowHints: true,
        allowDirectAnswer: true,
      },
    };
  }
}
