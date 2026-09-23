export type TutorIntent =
  | "ask_question"
  | "answer_pending_question"
  | "request_explanation"
  | "request_example"
  | "request_practice"
  | "submit_answer"
  | "request_hint"
  | "request_summary"
  | "request_quiz"
  | "request_flashcards"
  | "change_topic"
  | "off_topic"
  | "confused"
  | "stuck"
  | "challenge_request";

export type TeachingPhase =
  | "diagnosis"
  | "explanation"
  | "guided_practice"
  | "independent_practice"
  | "retrieval"
  | "transfer"
  | "mastery";

export type TeachingMove =
  | "diagnose"
  | "explain"
  | "hint"
  | "guided_practice"
  | "independent_practice"
  | "correct_misconception"
  | "retrieval_practice"
  | "challenge"
  | "summarize"
  | "clarify";

export type InteractionType =
  | "none"
  | "question"
  | "multiple_choice"
  | "short_answer"
  | "worked_example"
  | "hint"
  | "quiz"
  | "reflection";

export interface TutorSessionState {
  sessionId: string;
  learnerId: string;
  subjectId: string | null;
  topicId: string | null;
  skillId: string | null;
  objective: string | null;
  teachingPhase: TeachingPhase;
  pendingInteractionId: string | null;
  conversationSummary: string;
  turnNumber: number;
  stateVersion: number;
}

export interface TutorTurn {
  id: string;
  sessionId: string;
  clientTurnId: string;
  baseStateVersion: number;
  processingStatus:
    | "received"
    | "context_ready"
    | "generating"
    | "validating"
    | "learning"
    | "committing"
    | "committed"
    | "failed";
  executionToken: string;
}

export interface RetrievedEvidence {
  evidenceId: string;
  resourceId: string;
  sourceId: string;
  content: string;
  authority:
    | "curriculum"
    | "school_approved"
    | "teacher"
    | "learner"
    | "external"
    | "generated";
  relevanceScore: number;
  pageNumber?: number;
}

export interface TutorGenerationRequest {
  learnerMessage: string;
  intent: TutorIntent;
  objective: string | null;
  teachingMove: TeachingMove;
  teachingPhase: TeachingPhase;
  language: string;
  gradeLevel: string;
  groundingMode:
    | "source_only"
    | "curriculum_plus_sources"
    | "general_plus_sources";
  evidence: RetrievedEvidence[];
}

export interface TutorModelResponse {
  answer: string;
  format:
    | "plain"
    | "explanation"
    | "step_by_step"
    | "question"
    | "hint"
    | "quiz";
  citations: Array<{ evidenceId: string; claim?: string }>;
  interaction?: {
    type: InteractionType;
    question: string;
    skillId?: string;
    difficulty: "support" | "standard" | "challenge";
  };
}
