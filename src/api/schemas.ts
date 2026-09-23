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
      skillId: z.string().uuid().optional(),
      difficulty: z.enum(["support", "standard", "challenge"]),
    })
    .optional(),
});

export type SendTutorMessage = z.infer<typeof sendTutorMessageSchema>;
export type TutorModelResponse = z.infer<typeof tutorModelResponseSchema>;
