ALTER TABLE tutor_turns
    ADD COLUMN IF NOT EXISTS response_message_id UUID REFERENCES tutor_messages(id) ON DELETE SET NULL;

ALTER TABLE tutor_turns
    ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ;

ALTER TABLE tutor_turns
    ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE TABLE IF NOT EXISTS pending_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE,
    turn_id UUID NOT NULL REFERENCES tutor_turns(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL,
    question TEXT NOT NULL,
    expected_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    skill_id UUID,
    difficulty TEXT NOT NULL DEFAULT 'standard',
    attempt_number INTEGER NOT NULL DEFAULT 1,
    hints_used INTEGER NOT NULL DEFAULT 0,
    max_hints INTEGER NOT NULL DEFAULT 3,
    status TEXT NOT NULL DEFAULT 'waiting'
        CHECK (status IN ('waiting','answered','expired','cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answered_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_waiting_interaction
ON pending_interactions(session_id)
WHERE status = 'waiting';

CREATE INDEX IF NOT EXISTS idx_tutor_turns_recovery
ON tutor_turns(processing_status, lease_expires_at)
WHERE processing_status <> 'committed';
