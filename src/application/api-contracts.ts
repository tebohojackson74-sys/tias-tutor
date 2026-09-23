import { z } from "zod";
import { sendTutorMessageSchema, sessionIdSchema } from "../api/schemas.js";

export const sendTutorMessageRouteSchema = z.object({
  sessionId: sessionIdSchema,
  body: sendTutorMessageSchema,
});

export interface SendTutorMessageResponse {
  turnId: string;
  assistantMessageId: string;
  stateVersion: number;
  response: {
    answer: string;
    format: string;
    citations: Array<{ evidenceId: string; claim?: string }>;
    interaction?: {
      type: string;
      question: string;
      skillId?: string;
      difficulty: string;
    };
  };
}
