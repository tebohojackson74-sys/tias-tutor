import type { Pool } from "pg";
import { createHash } from "node:crypto";
import { withTransaction } from "./transaction.js";
import {
  TutorTurnStateConflictError,
  type TutorTurnCommitInput,
  type TutorTurnCommitRepository,
  type TutorTurnCommitResult,
} from "../../application/tutor-turn-commit.js";

export class PgTutorTurnCommitRepository implements TutorTurnCommitRepository {
  constructor(private readonly pool: Pool) {}

  async commit(input: TutorTurnCommitInput): Promise<TutorTurnCommitResult> {
    return withTransaction(this.pool, async (client) => {
      const turn = await client.query<{
        id: string;
        session_id: string;
        execution_token: string;
        processing_status: string;
      }>(
        `SELECT id, session_id, execution_token, processing_status
         FROM tutor_turns
         WHERE id = $1
         FOR UPDATE`,
        [input.turnId],
      );

      const turnRow = turn.rows[0];
      if (!turnRow) throw new Error("Tutor turn not found.");
      if (turnRow.session_id !== input.sessionId) {
        throw new Error("Tutor turn does not belong to this session.");
      }
      if (turnRow.execution_token !== input.executionToken) {
        throw new Error("Tutor turn execution token is invalid.");
      }

      if (turnRow.processing_status === "committed") {
        const existing = await client.query<{ id: string }>(
          `SELECT id
           FROM tutor_messages
           WHERE turn_id = $1 AND role = 'assistant'
           ORDER BY created_at DESC
           LIMIT 1`,
          [input.turnId],
        );
        const assistantMessageId = existing.rows[0]?.id;
        if (!assistantMessageId) {
          throw new Error("Committed tutor turn has no assistant message.");
        }
        return {
          assistantMessageId,
          committedStateVersion: input.baseStateVersion + 1,
        };
      }

      const aiResponseHash =
        input.aiRun.responseHash ??
        createHash("sha256")
          .update(JSON.stringify(input.response))
          .digest("hex");

      const aiRun = await client.query<{ id: string }>(
        `INSERT INTO ai_runs (
           session_id, tutor_turn_id, provider, model, purpose,
           prompt_version, policy_version, input_tokens, output_tokens,
           latency_ms, request_metadata, response_metadata,
           normalized_response, response_hash, status
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11::jsonb, $12::jsonb, $13::jsonb, $14, $15
         )
         RETURNING id`,
        [
          input.sessionId,
          input.turnId,
          input.aiRun.provider,
          input.aiRun.model,
          input.aiRun.purpose,
          input.aiRun.promptVersion,
          input.aiRun.policyVersion ?? null,
          input.aiRun.inputTokens ?? null,
          input.aiRun.outputTokens ?? null,
          input.aiRun.latencyMs ?? null,
          JSON.stringify(input.aiRun.requestMetadata ?? {}),
          JSON.stringify(input.aiRun.responseMetadata ?? {}),
          JSON.stringify(input.response),
          aiResponseHash,
          input.aiRun.status,
        ],
      );

      const assistant = await client.query<{ id: string }>(
        `INSERT INTO tutor_messages (
           session_id, turn_id, role, content, metadata
         )
         VALUES ($1, $2, 'assistant', $3, $4::jsonb)
         RETURNING id`,
        [
          input.sessionId,
          input.turnId,
          input.response.answer,
          JSON.stringify({
            format: input.response.format,
            citations: input.response.citations,
            interaction: input.response.interaction ?? null,
            aiRunId: aiRun.rows[0]?.id ?? null,
          }),
        ],
      );

      const assistantMessageId = assistant.rows[0]?.id;
      if (!assistantMessageId) {
        throw new Error("Failed to create assistant message.");
      }

      await client.query(
        `UPDATE tutor_turns
         SET response_message_id = $1
         WHERE id = $2 AND execution_token = $3`,
        [assistantMessageId, input.turnId, input.executionToken],
      );

      for (const citation of input.response.citations) {
        await client.query(
          `INSERT INTO message_citations (
             message_id, citation_text
           )
           VALUES ($1, $2)`,
          [assistantMessageId, citation.claim ?? citation.evidenceId],
        );
      }

      let pendingInteractionId: string | null = null;

      if (
        input.response.interaction &&
        input.response.interaction.type !== "none"
      ) {
        const interaction = await client.query<{ id: string }>(
          `INSERT INTO pending_interactions (
             session_id, turn_id, interaction_type,
             question, skill_id, difficulty
           )
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            input.sessionId,
            input.turnId,
            input.response.interaction.type,
            input.response.interaction.question,
            input.response.interaction.skillId ?? null,
            input.response.interaction.difficulty,
          ],
        );

        pendingInteractionId = interaction.rows[0]?.id ?? null;
      }

      if (input.learning) {
        const event = await client.query<{ id: string }>(
          `INSERT INTO learning_events (
             learner_id, session_id, source_turn_id, event_key,
             event_type, skill_id, payload
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
           ON CONFLICT (source_turn_id, event_key)
           WHERE source_turn_id IS NOT NULL AND event_key IS NOT NULL
           DO UPDATE SET payload = EXCLUDED.payload
           RETURNING id`,
          [
            input.learning.learnerId,
            input.sessionId,
            input.turnId,
            "tutor_turn_learning",
            input.learning.eventType,
            input.learning.skillEvidence?.skillId ?? null,
            JSON.stringify(input.learning.payload ?? {}),
          ],
        );

        const eventId = event.rows[0]?.id;

        if (eventId && input.learning.skillEvidence) {
          const e = input.learning.skillEvidence;
          const attributionWeight =
            e.strength *
            e.evaluationConfidence *
            e.independenceFactor *
            e.difficultyFactor *
            e.transferFactor *
            e.contextDiversityFactor;

          await client.query(
            `INSERT INTO skill_evidence (
               learner_id, skill_id, source_event_id,
               evidence_type, outcome, strength,
               evaluation_confidence, independent, transfer,
               difficulty, attribution_weight
             )
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             ON CONFLICT (source_event_id, skill_id) DO NOTHING`,
            [
              e.learnerId,
              e.skillId,
              eventId,
              e.evidenceType,
              e.outcome,
              e.strength,
              e.evaluationConfidence,
              e.independenceFactor >= 0.95,
              e.transferFactor > 1,
              e.difficultyFactor,
              attributionWeight,
            ],
          );

          if (input.learning.nextMastery) {
            const m = input.learning.nextMastery;
            await client.query(
              `INSERT INTO student_mastery (
                 learner_id, skill_id, mastery_score,
                 confidence_score, independence_score, retention_score,
                 evidence_mass, independent_success_count,
                 transfer_success_count, retrieval_success_count,
                 attempt_count, correct_count, current_state,
                 last_assessed_at, last_evidence_at, last_success_at
               )
               VALUES (
                 $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
                 CASE
                   WHEN $3 >= 0.85 AND $4 >= 0.70 THEN 'mastered'
                   WHEN $3 >= 0.65 THEN 'proficient'
                   WHEN $3 >= 0.40 THEN 'developing'
                   WHEN $3 > 0 THEN 'emerging'
                   ELSE 'unknown'
                 END,
                 NOW(),NOW(),
                 CASE WHEN $13 > 0 THEN NOW() ELSE NULL END
               )
               ON CONFLICT (learner_id, skill_id)
               DO UPDATE SET
                 mastery_score = EXCLUDED.mastery_score,
                 confidence_score = EXCLUDED.confidence_score,
                 independence_score = EXCLUDED.independence_score,
                 retention_score = EXCLUDED.retention_score,
                 evidence_mass = EXCLUDED.evidence_mass,
                 independent_success_count = EXCLUDED.independent_success_count,
                 transfer_success_count = EXCLUDED.transfer_success_count,
                 retrieval_success_count = EXCLUDED.retrieval_success_count,
                 attempt_count = EXCLUDED.attempt_count,
                 correct_count = EXCLUDED.correct_count,
                 current_state = EXCLUDED.current_state,
                 last_assessed_at = NOW(),
                 last_evidence_at = NOW(),
                 last_success_at = EXCLUDED.last_success_at,
                 updated_at = NOW()`,
              [
                e.learnerId,
                e.skillId,
                m.masteryScore,
                m.confidenceScore,
                m.independenceScore,
                m.retentionScore,
                m.evidenceMass,
                m.independentSuccessCount,
                m.transferSuccessCount,
                m.retrievalSuccessCount,
                m.attemptCount,
                m.correctCount,
                e.outcome === "success" ? 1 : 0,
              ],
            );
          }
        }
      }

      const state = await client.query(
        `UPDATE tutor_session_state
         SET current_subject_id = $1,
             current_topic_id = $2,
             current_skill_id = $3,
             current_objective = $4,
             teaching_phase = $5,
             current_pending_interaction_id = $6,
             conversation_summary = $7,
             turn_number = $8,
             state_version = state_version + 1,
             updated_at = NOW()
         WHERE session_id = $9
           AND state_version = $10
         RETURNING state_version`,
        [
          input.nextState.currentSubjectId,
          input.nextState.currentTopicId,
          input.nextState.currentSkillId,
          input.nextState.currentObjective,
          input.nextState.teachingPhase,
          pendingInteractionId,
          input.nextState.conversationSummary,
          input.nextState.turnNumber,
          input.sessionId,
          input.baseStateVersion,
        ],
      );

      const committedStateVersion = state.rows[0]?.state_version;
      if (typeof committedStateVersion !== "number") {
        throw new TutorTurnStateConflictError();
      }

      await client.query(
        `UPDATE tutor_turns
         SET processing_status = 'committed',
             lease_expires_at = NULL,
             heartbeat_at = NOW()
         WHERE id = $1 AND execution_token = $2`,
        [input.turnId, input.executionToken],
      );

      await client.query(
        `INSERT INTO outbox_events (
           aggregate_type, aggregate_id, event_type, payload
         )
         VALUES ($1, $2, $3, $4::jsonb)`,
        [
          "tutor_turn",
          input.turnId,
          "tutor_turn.committed",
          JSON.stringify({
            sessionId: input.sessionId,
            assistantMessageId,
            stateVersion: committedStateVersion,
          }),
        ],
      );

      return {
        assistantMessageId,
        committedStateVersion,
      };
    });
  }
}
