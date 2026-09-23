import type { TutorIntent, TeachingMove, TeachingPhase } from "../domain/tutor.js";
import type { TutorContext } from "./tutor-context.js";

export interface TeachingStrategy {
  move: TeachingMove;
  phase: TeachingPhase;
  askLearner: boolean;
  allowDirectAnswer: boolean;
  rationale: string;
}

export interface StrategyInput {
  context: TutorContext;
  intent: TutorIntent;
}

export class StrategyEngine {
  choose(input: StrategyInput): TeachingStrategy {
    const { context, intent } = input;

    if (intent === "request_hint") {
      return {
        move: "hint",
        phase: context.session.teachingPhase,
        askLearner: true,
        allowDirectAnswer: false,
        rationale: "Learner explicitly requested scaffolding.",
      };
    }

    if (intent === "confused" || intent === "stuck") {
      return {
        move: "clarify",
        phase: "explanation",
        askLearner: true,
        allowDirectAnswer: true,
        rationale: "The learner is signalling a comprehension barrier.",
      };
    }

    if (intent === "request_explanation") {
      return {
        move: "explain",
        phase: "explanation",
        askLearner: true,
        allowDirectAnswer: true,
        rationale: "The learner explicitly requested an explanation.",
      };
    }

    if (intent === "request_example") {
      return {
        move: "guided_practice",
        phase: "guided_practice",
        askLearner: true,
        allowDirectAnswer: true,
        rationale: "A worked example should lead into guided learner participation.",
      };
    }

    if (intent === "request_practice" || intent === "request_quiz") {
      return {
        move: "independent_practice",
        phase: "independent_practice",
        askLearner: true,
        allowDirectAnswer: false,
        rationale: "The learner is asking to practise.",
      };
    }

    if (intent === "answer_pending_question") {
      return {
        move: "diagnose",
        phase: context.session.teachingPhase,
        askLearner: false,
        allowDirectAnswer: true,
        rationale: "The response should first be evaluated against the pending interaction.",
      };
    }

    if (context.session.teachingPhase === "retrieval") {
      return {
        move: "retrieval_practice",
        phase: "retrieval",
        askLearner: true,
        allowDirectAnswer: false,
        rationale: "The session is already in retrieval practice.",
      };
    }

    if (context.session.teachingPhase === "mastery") {
      return {
        move: "challenge",
        phase: "mastery",
        askLearner: true,
        allowDirectAnswer: false,
        rationale: "Mastery state calls for challenge or transfer.",
      };
    }

    return {
      move: "diagnose",
      phase: context.session.teachingPhase,
      askLearner: true,
      allowDirectAnswer: true,
      rationale: "Default to diagnosis when intent does not require another move.",
    };
  }
}
