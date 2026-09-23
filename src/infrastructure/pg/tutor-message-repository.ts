import type { Pool } from "pg";
import type { TutorMessageRepository, TutorMessageRecord } from "../../domain/repositories.js";

export class PgTutorMessageRepository implements TutorMessageRepository {
  constructor(private readonly pool: Pool) {}

  async findByClientMessageId(
    sessionId: string,
    clientMessageId: string,
  ): Promise<TutorMessageRecord | null> {
    const result = await this.pool.query<TutorMessageRecord>(
      `SELECT id, session_id AS "sessionId",
              client_message_id AS "clientMessageId",
              turn_id AS "turnId", role,
              sender_user_id AS "senderUserId", content
       FROM tutor_messages
       WHERE session_id = $1 AND client_message_id = $2`,
      [sessionId, clientMessageId],
    );
    return result.rows[0] ?? null;
  }

  async create(input: {
    sessionId: string;
    clientMessageId: string;
    role: TutorMessageRecord["role"];
    content: string;
    senderUserId: string | null;
    turnId: string | null;
  }): Promise<TutorMessageRecord> {
    const result = await this.pool.query<TutorMessageRecord>(
      `INSERT INTO tutor_messages (
         session_id, client_message_id, role, content,
         sender_user_id, turn_id
       )
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, session_id AS "sessionId",
                 client_message_id AS "clientMessageId",
                 turn_id AS "turnId", role,
                 sender_user_id AS "senderUserId", content`,
      [
        input.sessionId,
        input.clientMessageId,
        input.role,
        input.content,
        input.senderUserId,
        input.turnId,
      ],
    );

    const row = result.rows[0];
    if (!row) throw new Error("Tutor message insert returned no row.");
    return row;
  }

  async listRecent(
    sessionId: string,
    limit: number,
  ): Promise<TutorMessageRecord[]> {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);
    const result = await this.pool.query<TutorMessageRecord>(
      `SELECT id, session_id AS "sessionId",
              client_message_id AS "clientMessageId",
              turn_id AS "turnId", role,
              sender_user_id AS "senderUserId", content
       FROM tutor_messages
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [sessionId, safeLimit],
    );

    return result.rows.reverse();
  }
}
