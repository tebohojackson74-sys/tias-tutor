CREATE TABLE IF NOT EXISTS message_citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES tutor_messages(id) ON DELETE CASCADE,
    source_id UUID,
    rag_document_id UUID,
    citation_text TEXT,
    page_number INTEGER,
    location_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE,
    message_id UUID REFERENCES tutor_messages(id) ON DELETE SET NULL,
    tutor_turn_id UUID REFERENCES tutor_turns(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    purpose TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    policy_version TEXT,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    input_tokens INTEGER,
    output_tokens INTEGER,
    latency_ms INTEGER,
    request_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    normalized_response JSONB,
    response_hash TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id UUID NOT NULL,
    session_id UUID REFERENCES tutor_sessions(id) ON DELETE SET NULL,
    source_turn_id UUID REFERENCES tutor_turns(id) ON DELETE SET NULL,
    event_key TEXT,
    event_type TEXT NOT NULL,
    subject_id UUID,
    topic_id UUID,
    skill_id UUID,
    actor_user_id UUID,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_events_source_key
ON learning_events(source_turn_id, event_key)
WHERE source_turn_id IS NOT NULL AND event_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS skill_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id UUID NOT NULL,
    skill_id UUID NOT NULL,
    source_event_id UUID NOT NULL REFERENCES learning_events(id) ON DELETE CASCADE,
    evidence_type TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('success','partial','failure')),
    strength NUMERIC(5,4) NOT NULL CHECK (strength >= 0 AND strength <= 1),
    evaluation_confidence NUMERIC(5,4) NOT NULL CHECK (evaluation_confidence >= 0 AND evaluation_confidence <= 1),
    independent BOOLEAN NOT NULL DEFAULT FALSE,
    transfer BOOLEAN NOT NULL DEFAULT FALSE,
    difficulty NUMERIC(5,4),
    attribution_weight NUMERIC(8,5) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source_event_id, skill_id)
);

CREATE TABLE IF NOT EXISTS student_mastery (
    learner_id UUID NOT NULL,
    skill_id UUID NOT NULL,
    mastery_score NUMERIC(6,5) NOT NULL DEFAULT 0,
    confidence_score NUMERIC(6,5) NOT NULL DEFAULT 0,
    independence_score NUMERIC(6,5) NOT NULL DEFAULT 0,
    retention_score NUMERIC(6,5) NOT NULL DEFAULT 0,
    evidence_mass NUMERIC(12,5) NOT NULL DEFAULT 0,
    independent_success_count INTEGER NOT NULL DEFAULT 0,
    transfer_success_count INTEGER NOT NULL DEFAULT 0,
    retrieval_success_count INTEGER NOT NULL DEFAULT 0,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    momentum NUMERIC(8,5),
    current_state TEXT NOT NULL DEFAULT 'unknown',
    last_assessed_at TIMESTAMPTZ,
    last_evidence_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (learner_id, skill_id)
);

CREATE TABLE IF NOT EXISTS student_misconceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id UUID NOT NULL,
    skill_id UUID NOT NULL,
    pattern_code TEXT NOT NULL,
    description TEXT NOT NULL,
    severity NUMERIC(5,4) NOT NULL,
    confidence NUMERIC(5,4) NOT NULL,
    status TEXT NOT NULL DEFAULT 'suspected'
        CHECK (status IN ('suspected','active','weakening','resolved')),
    occurrence_count INTEGER NOT NULL DEFAULT 0,
    independent_occurrence_count INTEGER NOT NULL DEFAULT 0,
    context_diversity INTEGER NOT NULL DEFAULT 0,
    weakening_count INTEGER NOT NULL DEFAULT 0,
    last_evidence_id UUID REFERENCES skill_evidence(id) ON DELETE SET NULL,
    first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_student_misconceptions_active
ON student_misconceptions(learner_id, skill_id, status);

CREATE TABLE IF NOT EXISTS learning_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id UUID NOT NULL,
    skill_id UUID,
    subject_id UUID,
    source_turn_id UUID REFERENCES tutor_turns(id) ON DELETE SET NULL,
    recommendation_key TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    priority NUMERIC(8,5) NOT NULL,
    rationale JSONB NOT NULL DEFAULT '{}'::jsonb,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_by TEXT NOT NULL,
    policy_version TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(source_turn_id, recommendation_key)
);

CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending
ON outbox_events(status, available_at);
