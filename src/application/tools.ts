export type TutorToolId =
  | "retrieve_curriculum"
  | "retrieve_content"
  | "get_learner_state"
  | "get_mastery"
  | "get_misconceptions"
  | "search_question_bank"
  | "generate_question"
  | "evaluate_answer"
  | "create_learning_event"
  | "web_search"
  | "calculate"
  | "execute_code"
  | "create_visualization";

export interface TutorToolContext {
  learnerId: string;
  sessionId: string;
  userId?: string;
  subjectId?: string | null;
  topicId?: string | null;
  skillId?: string | null;
}

export interface TutorToolRequest<TInput = unknown> {
  toolId: TutorToolId;
  input: TInput;
  context: TutorToolContext;
}

export interface TutorToolResult<TOutput = unknown> {
  toolId: TutorToolId;
  output: TOutput;
  metadata?: Record<string, unknown>;
}

export interface TutorTool<TInput = unknown, TOutput = unknown> {
  readonly id: TutorToolId;
  readonly description: string;
  readonly risk: "read" | "write" | "external" | "execution";
  execute(
    request: TutorToolRequest<TInput>,
  ): Promise<TutorToolResult<TOutput>>;
}
