import type { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { withTransaction } from "./transaction.js";
import type {
  AdmittedTutorTurn,
  AdmitTutorTurnInput,
} from "../../application/tutor-turn-admission.js";
import {
  ActiveTutorTurnError,
  TutorSessionClosedError,
} from "../../application/tutor-turn-admission.js";
import type { TutorTurn } from "../../domain/tutor.js";

interface TurnRow {
  id: string;
  session_id: string;
  client_turn_id: string;
  base_state_version: number;
  processing_status: TutorTurn["processingStatus"];
  execution_token: string;
}

interface MessageRow {
  id: string;
}

function mapTurn(row: TurnRow): TutorTurn {
  return {
    id: row.id,
    sessionId: row.session_id,
    clientTurnId: row.client_turn_id,
    baseStateVersion: row.base_state_version,
    processingStatus: row.processing_status,
    executionToken: row.execution_token,
  };
}

export class PgTutorTurnAdmissionRepository {
  constructor(private readonly pool: Pool) {}

  async admit(input: AdmitTutorTurnInput): Promise<AdmittedTutorTurn> {
    return withTransaction(this.pool, async (client) => {
      const sessionResult = await client.query<{
        id: string;
        user_id: string;
        status: "active" | "paused" | "completed" | "archived";
        state_version: number;
      }>(
        `SELECT s.id, s.user_id, s.status, ss.state_version
         FROM tutor_sessions s
         JOIN tutor_session_state ss ON ss.session_id = s.id
         WHERE s.id = $1
         FOR UPDATE`,
        [input.sessionId],
      );

      const session = sessionResult.rows[0];
      if (!session) {
        throw new Error("Tutor session not found.");
      }

      if (session.status !== "active") {
        throw new TutorSessionClosedError();
      }

      if (session.user_id !== input.userId) {
        throw new Error("Not authorised to use this tutor session.");
      }

      const existing = await client.query<TurnRow>(
        `SELECT id, session_id, client_turn_id, base_state_version,
                processing_status, execution_token
         FROM tutor_turns
         WHERE session_id = $1 AND client_turn_id = $2`,
        [input.sessionId, input.clientTurnId],
      );

      if (existing.rows[0]) {
        const turn = mapTurn(existing.rows[0]);
        const message = await client.query<MessageRow>(
          `SELECT id
           FROM tutor_messages
           WHERE session_id = $1 AND client_message_id = $2`,
          [input.sessionId, input.clientTurnId],
        );

        if (!message.rows[0]) {
          throw new Error("Existing tutor turn has no learner message.");
        }

        return {
          turn,
          learnerMessageId: message.rows[0].id,
        };
      }

      const active = await client.query<{ id: string }>(
        `SELECT id
         FROM tutor_turns
         WHERE session_id = $1
           AND processing_status IN (
             'received',
             'context_ready',
             'generating',
             'validating',
             'learning',
             'committing'
           )
         LIMIT 1`,
        [input.sessionId],
      );

      if (active.rows[0]) {
        throw new ActiveTutorTurnError();
      }

      const executionToken = randomUUID();

      const turnInsert = await client.query<TurnRow>(
        `INSERT INTO tutor_turns (
           session_id,
           client_turn_id,
           base_state_version,
           processing_status,
           execution_token,
           lease_expires_at,
           heartbeat_at
         )
         VALUES (
           $1, $2, $3, 'received', $4,
           NOW() + INTERVAL '90 seconds', NOW()
         )
         RETURNING id, session_id, client_turn_id, base_state_version,
                   processing_status, execution_token`,
        [
          input.sessionId,
          input.clientTurnId,
          session.state_version,
          executionToken,
        ],
      );

      const turnRow = turnInsert.rows[0];
      if (!turnRow) {
        throw new Error("Failed to create tutor turn.");
      }

      const messageInsert = await client.query<MessageRow>(
        `INSERT INTO tutor_messages (
           session_id,
           turn_id,
           client_message_id,
           role,
           sender_user_id,
           content
         )
         VALUES ($1, $2, $3, 'student', $4, $5)
         RETURNING id`,
        [
          input.sessionId,
          turnRow.id,
          input.clientTurnId,
          input.userId,
          input.content,
        ],
      );

      const messageRow = messageInsert.rows[0];
      if (!messageRow) {
        throw new Error("Failed to create learner message.");
      }

      return {
        turn: mapTurn(turnRow),
        learnerMessageId: messageRow.id,
      };
    });
  }
}
