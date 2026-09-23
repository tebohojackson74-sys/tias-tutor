import type { Pool } from "pg";
import type { PendingInteraction } from "../../domain/tutor.js";
import type { PendingInteractionReader } from "../../application/pending-interaction-service.js";

export class PgPendingInteractionRepository
  implements PendingInteractionReader
{
  constructor(private readonly pool: Pool) {}

  async getWaiting(sessionId: string): Promise<PendingInteraction | null> {
    const result = await this.pool.query<{
      id: string;
      session_id: string;
      turn_id: string;
      interaction_type: PendingInteraction["interactionType"];
      question: string;
      expected_evidence: unknown;
      skill_id: string | null;
      difficulty: PendingInteraction["difficulty"];
      attempt_number: number;
      hints_used: number;
      max_hints: number;
    }>(
      `SELECT id, session_id, turn_id, interaction_type,
              question, expected_evidence, skill_id,
              difficulty, attempt_number, hints_used, max_hints
       FROM pending_interactions
       WHERE session_id = $1 AND status = 'waiting'
       ORDER BY created_at DESC
       LIMIT 1`,
      [sessionId],
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      sessionId: row.session_id,
      turnId: row.turn_id,
      interactionType: row.interaction_type,
      question: row.question,
      expectedEvidence: row.expected_evidence,
      skillId: row.skill_id,
      difficulty: row.difficulty,
      attemptNumber: row.attempt_number,
      hintsUsed: row.hints_used,
      maxHints: row.max_hints,
    };
  }
}
