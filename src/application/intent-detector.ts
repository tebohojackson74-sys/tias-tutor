import type { TutorContext } from "./tutor-context.js";
import type { TutorIntent } from "../domain/tutor.js";

export interface IntentDetectionInput {
  message: string;
  context: TutorContext;
}

export interface IntentDetectionResult {
  intent: TutorIntent;
  confidence: number;
  reason: string;
}

export class RuleBasedIntentDetector {
  detect(input: IntentDetectionInput): IntentDetectionResult {
    const message = input.message.toLowerCase().trim();

    if (input.context.session.pendingInteractionId) {
      return {
        intent: "answer_pending_question",
        confidence: 0.88,
        reason: "A learner response arrived while a tutor interaction is pending.",
      };
    }

    if (/\b(hint|clue|give me a clue)\b/.test(message)) {
      return { intent: "request_hint", confidence: 0.97, reason: "Hint request detected." };
    }

    if (/\b(explain|don't understand|do not understand|confused|what does)\b/.test(message)) {
      return {
        intent: message.includes("confused") || message.includes("don't understand") || message.includes("do not understand")
          ? "confused"
          : "request_explanation",
        confidence: 0.93,
        reason: "Explanation/confusion language detected.",
      };
    }

    if (/\b(example|show me how)\b/.test(message)) {
      return { intent: "request_example", confidence: 0.94, reason: "Example request detected." };
    }

    if (/\b(practice|question for me|quiz me|test me)\b/.test(message)) {
      return {
        intent: message.includes("quiz") || message.includes("test") ? "request_quiz" : "request_practice",
        confidence: 0.94,
        reason: "Practice request detected.",
      };
    }

    if (/\b(summary|summarise|summarize)\b/.test(message)) {
      return { intent: "request_summary", confidence: 0.96, reason: "Summary request detected." };
    }

    if (/\b(stuck|can't do this|cannot do this)\b/.test(message)) {
      return { intent: "stuck", confidence: 0.93, reason: "Stuck language detected." };
    }

    if (/\?$/.test(message)) {
      return { intent: "ask_question", confidence: 0.76, reason: "Question form detected." };
    }

    return {
      intent: "ask_question",
      confidence: 0.55,
      reason: "No stronger intent signal was detected.",
    };
  }
}
