import type {
  TutorIntent,
  TutorSessionState,
  RetrievedEvidence,
} from "../domain/tutor.js";

export interface LearnerTutorProfile {
  learnerId: string;
  preferredName: string | null;
  gradeLevel: string;
  language: string;
}

export interface MasterySnapshot {
  skillId: string;
  masteryScore: number;
  confidenceScore: number;
  independenceScore: number;
  retentionScore: number;
  currentState:
    | "unknown"
    | "emerging"
    | "developing"
    | "proficient"
    | "mastered";
}

export interface MisconceptionSnapshot {
  skillId: string;
  patternCode: string;
  description: string;
  severity: number;
  confidence: number;
  status: "suspected" | "active" | "weakening" | "resolved";
}

export interface ConversationContext {
  recentMessages: Array<{
    role: "student" | "assistant";
    content: string;
  }>;
  summary: string;
}

export interface TutorLearningContext {
  mastery: MasterySnapshot[];
  misconceptions: MisconceptionSnapshot[];
}

export interface TutorObjectiveContext {
  subjectId: string | null;
  topicId: string | null;
  skillId: string | null;
  objective: string | null;
}

export interface TutorContext {
  learner: LearnerTutorProfile;
  session: TutorSessionState;
  objective: TutorObjectiveContext;
  intent?: TutorIntent;
  learning: TutorLearningContext;
  conversation: ConversationContext;
  evidence: RetrievedEvidence[];
  constraints: {
    groundingMode:
      | "source_only"
      | "curriculum_plus_sources"
      | "general_plus_sources";
    requireLearnerInteraction: boolean;
    allowHints: boolean;
    allowDirectAnswer: boolean;
  };
}

export interface TutorContextSources {
  getLearnerProfile(learnerId: string): Promise<LearnerTutorProfile>;
  getLearningContext(learnerId: string, skillId: string | null): Promise<TutorLearningContext>;
  getSessionState(sessionId: string): Promise<TutorSessionState>;
  getRecentMessages(sessionId: string, limit: number): Promise<ConversationContext["recentMessages"]>;
  getConversationSummary(sessionId: string): Promise<string>;
  getEvidence(request: {
    learnerId: string;
    subjectId: string | null;
    topicId: string | null;
    skillId: string | null;
    query: string;
    groundingMode: TutorContext["constraints"]["groundingMode"];
  }): Promise<RetrievedEvidence[]>;
}

export interface BuildTutorContextInput {
  learnerId: string;
  sessionId: string;
  learnerMessage: string;
  groundingMode: TutorContext["constraints"]["groundingMode"];
}
