import type { Pool } from "pg";

export class TutorRecoveryWorker {
  constructor(
    private readonly pool: Pool,
    private readonly leaseSeconds = 90,
  ) {}

  async recoverStaleTurns(limit = 20): Promise<number> {
    const result = await this.pool.query<{ id: string }>(
      `WITH stale AS (
         SELECT id
         FROM tutor_turns
         WHERE processing_status IN (
           'received',
           'context_ready',
           'generating',
           'validating',
           'learning',
           'committing'
         )
         AND lease_expires_at IS NOT NULL
         AND lease_expires_at < NOW()
         ORDER BY created_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE tutor_turns t
       SET processing_attempt = t.processing_attempt + 1,
           lease_expires_at = NOW() + ($2 || ' seconds')::interval,
           processing_status = 'received'
       FROM stale
       WHERE t.id = stale.id
       RETURNING t.id`,
      [limit, this.leaseSeconds],
    );

    return result.rowCount ?? 0;
  }
}
