import type { Pool } from "pg";
import type {
  TutorContextSources,
  LearnerTutorProfile,
  TutorLearningContext,
} from "../../application/tutor-context.js";
import type {
  RetrievedEvidence,
  TutorSessionState,
} from "../../domain/tutor.js";

const teachingPhases = new Set<TutorSessionState["teachingPhase"]>([
  "diagnosis",
  "explanation",
  "guided_practice",
  "independent_practice",
  "retrieval",
  "transfer",
  "mastery",
]);

function mapTeachingPhase(value: string): TutorSessionState["teachingPhase"] {
  return teachingPhases.has(value as TutorSessionState["teachingPhase"])
    ? (value as TutorSessionState["teachingPhase"])
    : "diagnosis";
}

export class PgTutorContextSources implements TutorContextSources {
  constructor(private readonly pool: Pool) {}

  async getLearnerProfile(learnerId: string): Promise<LearnerTutorProfile> {
    const result = await this.pool.query<{
      id: string;
      preferred_name: string | null;
      first_name: string;
      grade_level: string;
      language: string;
    }>(
      `SELECT id, preferred_name, first_name, grade_level, language
       FROM learner_profiles
       WHERE id = $1 AND status = 'active'`,
      [learnerId],
    );

    const row = result.rows[0];
    if (!row) throw new Error("Learner profile not found.");

    return {
      learnerId: row.id,
      preferredName: row.preferred_name ?? row.first_name,
      gradeLevel: row.grade_level,
      language: row.language,
    };
  }

  async getLearningContext(
    learnerId: string,
    skillId: string | null,
  ): Promise<TutorLearningContext> {
    if (!skillId) {
      return { mastery: [], misconceptions: [] };
    }

    const mastery = await this.pool.query<{
      skill_id: string;
      mastery_score: number;
      confidence_score: number;
      independence_score: number;
      retention_score: number;
      evidence_mass: number;
      independent_success_count: number;
      transfer_success_count: number;
      retrieval_success_count: number;
      attempt_count: number;
      correct_count: number;
      current_state:
        | "unknown"
        | "emerging"
        | "developing"
        | "proficient"
        | "mastered";
    }>(
      `SELECT skill_id, mastery_score, confidence_score,
              independence_score, retention_score, evidence_mass,
              independent_success_count, transfer_success_count,
              retrieval_success_count, attempt_count, correct_count,
              current_state
       FROM student_mastery
       WHERE learner_id = $1 AND skill_id = $2`,
      [learnerId, skillId],
    );

    const misconceptions = await this.pool.query<{
      skill_id: string;
      pattern_code: string;
      description: string;
      severity: number;
      confidence: number;
      status: "suspected" | "active" | "weakening" | "resolved";
    }>(
      `SELECT skill_id, pattern_code, description,
              severity, confidence, status
       FROM student_misconceptions
       WHERE learner_id = $1
         AND skill_id = $2
         AND status IN ('suspected','active','weakening')
       ORDER BY severity DESC, confidence DESC
       LIMIT 8`,
      [learnerId, skillId],
    );

    return {
      mastery: mastery.rows.map((row) => ({
        skillId: row.skill_id,
        masteryScore: Number(row.mastery_score),
        confidenceScore: Number(row.confidence_score),
        independenceScore: Number(row.independence_score),
        retentionScore: Number(row.retention_score),
        evidenceMass: Number(row.evidence_mass),
        independentSuccessCount: row.independent_success_count,
        transferSuccessCount: row.transfer_success_count,
        retrievalSuccessCount: row.retrieval_success_count,
        attemptCount: row.attempt_count,
        correctCount: row.correct_count,
        currentState: row.current_state,
      })),
      misconceptions: misconceptions.rows.map((row) => ({
        skillId: row.skill_id,
        patternCode: row.pattern_code,
        description: row.description,
        severity: Number(row.severity),
        confidence: Number(row.confidence),
        status: row.status,
      })),
    };
  }

  async getSessionState(sessionId: string): Promise<TutorSessionState> {
    const result = await this.pool.query<{
      session_id: string;
      current_subject_id: string | null;
      current_topic_id: string | null;
      current_skill_id: string | null;
      current_objective: string | null;
      teaching_phase: string;
      current_pending_interaction_id: string | null;
      conversation_summary: string;
      turn_number: number;
      state_version: number;
    }>(
      `SELECT session_id, current_subject_id, current_topic_id,
              current_skill_id, current_objective, teaching_phase,
              current_pending_interaction_id, conversation_summary,
              turn_number, state_version
       FROM tutor_session_state
       WHERE session_id = $1`,
      [sessionId],
    );

    const row = result.rows[0];
    if (!row) throw new Error("Tutor session state not found.");

    return {
      sessionId: row.session_id,
      learnerId: "",
      subjectId: row.current_subject_id,
      topicId: row.current_topic_id,
      skillId: row.current_skill_id,
      objective: row.current_objective,
      teachingPhase: mapTeachingPhase(row.teaching_phase),
      pendingInteractionId: row.current_pending_interaction_id,
      conversationSummary: row.conversation_summary,
      turnNumber: row.turn_number,
      stateVersion: row.state_version,
    };
  }

  async getRecentMessages(
    sessionId: string,
    limit: number,
  ): Promise<Array<{ role: "student" | "assistant"; content: string }>> {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);
    const result = await this.pool.query<{
      role: "student" | "assistant";
      content: string;
    }>(
      `SELECT role, content
       FROM tutor_messages
       WHERE session_id = $1
         AND role IN ('student','assistant')
       ORDER BY created_at DESC
       LIMIT $2`,
      [sessionId, safeLimit],
    );

    return result.rows.reverse();
  }

  async getConversationSummary(sessionId: string): Promise<string> {
    const result = await this.pool.query<{ conversation_summary: string }>(
      `SELECT conversation_summary
       FROM tutor_session_state
       WHERE session_id = $1`,
      [sessionId],
    );

    return result.rows[0]?.conversation_summary ?? "";
  }

  async getEvidence(input: {
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
    void input;
    return [];
  }
}
