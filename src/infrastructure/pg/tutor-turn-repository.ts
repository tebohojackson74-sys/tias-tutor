import type { Pool } from "pg";
import type { TutorTurnRepository } from "../../domain/repositories.js";
import type { TutorTurn } from "../../domain/tutor.js";

interface TurnRow {
  id: string;
  session_id: string;
  client_turn_id: string;
  base_state_version: number;
  processing_status: TutorTurn["processingStatus"];
  execution_token: string;
}

function map(row: TurnRow): TutorTurn {
  return {
    id: row.id,
    sessionId: row.session_id,
    clientTurnId: row.client_turn_id,
    baseStateVersion: row.base_state_version,
    processingStatus: row.processing_status,
    executionToken: row.execution_token,
  };
}

export class PgTutorTurnRepository implements TutorTurnRepository {
  constructor(private readonly pool: Pool) {}

  async findByClientTurnId(
    sessionId: string,
    clientTurnId: string,
  ): Promise<TutorTurn | null> {
    const result = await this.pool.query<TurnRow>(
      `SELECT id, session_id, client_turn_id, base_state_version,
              processing_status, execution_token
       FROM tutor_turns
       WHERE session_id = $1 AND client_turn_id = $2`,
      [sessionId, clientTurnId],
    );
    return result.rows[0] ? map(result.rows[0]) : null;
  }

  async hasActiveTurn(sessionId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1
       FROM tutor_turns
       WHERE session_id = $1
         AND processing_status IN (
           'received','context_ready','generating',
           'validating','learning','committing'
         )
       LIMIT 1`,
      [sessionId],
    );
    return result.rowCount > 0;
  }

  async create(input: {
    sessionId: string;
    clientTurnId: string;
    baseStateVersion: number;
    executionToken: string;
  }): Promise<TutorTurn> {
    const result = await this.pool.query<TurnRow>(
      `INSERT INTO tutor_turns (
         session_id, client_turn_id, base_state_version,
         processing_status, execution_token
       )
       VALUES ($1,$2,$3,'received',$4)
       RETURNING id, session_id, client_turn_id, base_state_version,
                 processing_status, execution_token`,
      [
        input.sessionId,
        input.clientTurnId,
        input.baseStateVersion,
        input.executionToken,
      ],
    );

    const row = result.rows[0];
    if (!row) throw new Error("Tutor turn insert returned no row.");
    return map(row);
  }

  async markCommitted(turnId: string, executionToken: string): Promise<void> {
    await this.pool.query(
      `UPDATE tutor_turns
       SET processing_status = 'committed', lease_expires_at = NULL
       WHERE id = $1 AND execution_token = $2`,
      [turnId, executionToken],
    );
  }

  async markFailed(
    turnId: string,
    executionToken: string,
    reason: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE tutor_turns
       SET processing_status = 'failed', last_error = $3,
           lease_expires_at = NULL
       WHERE id = $1 AND execution_token = $2`,
      [turnId, executionToken, reason.slice(0, 4000)],
    );
  }
}
