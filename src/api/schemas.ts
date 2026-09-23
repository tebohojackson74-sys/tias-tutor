import { z } from "zod";

export const sendTutorMessageSchema = z.object({
  clientTurnId: z.string().min(8).max(128),
  content: z.string().trim().min(1).max(10000),
});

export const sessionIdSchema = z.string().uuid();

export const tutorModelResponseSchema = z.object({
  answer: z.string().min(1),
  format: z.enum([
    "plain",
    "explanation",
    "step_by_step",
    "question",
    "hint",
    "quiz",
  ]),
  citations: z.array(
    z.object({
      evidenceId: z.string().min(1),
      claim: z.string().optional(),
    }),
  ),
  interaction: z
    .object({
      type: z.enum([
        "none",
        "question",
        "multiple_choice",
        "short_answer",
        "worked_example",
        "hint",
        "quiz",
        "reflection",
      ]),
      question: z.string().min(1),
      expectedEvidence: z.unknown().optional(),
      skillId: z.string().uuid().optional(),
      difficulty: z.enum(["support", "standard", "challenge"]),
    })
    .optional(),
});

export const answerEvaluationSchema = z.object({
  outcome: z.enum([
    "correct",
    "partially_correct",
    "incorrect",
    "unclear",
  ]),
  confidence: z.number().min(0).max(1),
  errorClassification: z
    .enum([
      "conceptual_misunderstanding",
      "procedural_error",
      "careless_error",
      "misread",
      "missing_prerequisite",
      "guess",
      "unclear",
    ])
    .optional(),
  feedbackRecommendation: z.enum([
    "affirm",
    "correct",
    "clarify",
    "remediate",
    "retry",
  ]),
  skillEvidence: z.array(
    z.object({
      skillId: z.string().uuid(),
      evidenceWeight: z.number().min(0).max(2),
      confidence: z.number().min(0).max(1),
    }),
  ),
  misconceptionSignals: z.array(
    z.object({
      patternCode: z.string().min(1),
      description: z.string().min(1),
      severity: z.number().min(0).max(1),
      confidence: z.number().min(0).max(1),
    }),
  ),
  reasoningEvidence: z.array(z.string()).optional(),
});

export type SendTutorMessage = z.infer<typeof sendTutorMessageSchema>;
export type TutorModelResponse = z.infer<typeof tutorModelResponseSchema>;
export type AnswerEvaluationResponse = z.infer<typeof answerEvaluationSchema>;
