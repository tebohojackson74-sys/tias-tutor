CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tutor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id UUID NOT NULL,
    user_id UUID NOT NULL,
    subject_id UUID,
    notebook_id UUID,
    mode TEXT NOT NULL CHECK (mode IN ('teach','explain','quiz','exam','research','study','revision')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','archived')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tutor_session_state (
    session_id UUID PRIMARY KEY REFERENCES tutor_sessions(id) ON DELETE CASCADE,
    current_subject_id UUID,
    current_topic_id UUID,
    current_skill_id UUID,
    current_objective TEXT,
    teaching_phase TEXT NOT NULL DEFAULT 'diagnosis'
        CHECK (teaching_phase IN ('diagnosis','explanation','guided_practice','independent_practice','retrieval','transfer','mastery')),
    current_pending_interaction_id UUID,
    conversation_summary TEXT NOT NULL DEFAULT '',
    turn_number INTEGER NOT NULL DEFAULT 0,
    state_version INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tutor_turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE,
    client_turn_id TEXT NOT NULL,
    base_state_version INTEGER NOT NULL,
    processing_status TEXT NOT NULL DEFAULT 'received',
    execution_token UUID NOT NULL,
    lease_expires_at TIMESTAMPTZ,
    processing_attempt INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, client_turn_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_tutor_turn
ON tutor_turns(session_id)
WHERE processing_status IN (
    'received',
    'context_ready',
    'generating',
    'validating',
    'learning',
    'committing'
);

CREATE TABLE IF NOT EXISTS tutor_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE,
    turn_id UUID REFERENCES tutor_turns(id) ON DELETE SET NULL,
    client_message_id TEXT,
    role TEXT NOT NULL CHECK (role IN ('student','assistant','system','tool')),
    sender_user_id UUID,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, client_message_id)
);

CREATE INDEX IF NOT EXISTS idx_tutor_messages_session_created
ON tutor_messages(session_id, created_at DESC);
