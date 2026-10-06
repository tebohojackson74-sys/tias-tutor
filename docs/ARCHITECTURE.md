# Tias Tutor Architecture

## Architectural direction

Tias Tutor adopts the **Tool + Capability** pattern used by modern agent-native learning systems such as DeepTutor, while remaining a Tias-owned TypeScript/PostgreSQL architecture.

Tias does **not** depend on a second Python tutor runtime. PostgreSQL remains the application and learning source of truth, Gemini remains behind the AI gateway, and governance remains server-side.

## Runtime layers

```
HTTP/API
  |
  v
Turn Admission
  |  idempotency + authorization + active-turn protection
  v
Capability Runtime
  |
  +--> Chat
  +--> Guided Learning
  +--> Practice
  +--> Quiz
  +--> Reading
  +--> Mastery Path
  |
  v
Turn Preparation
  |
  +--> Context Builder
  +--> Intent Detection
  +--> Retrieval Manager
  +--> Strategy Engine
  |
  v
Capability Execution
  |
  v
AI Gateway
  |
  v
Response Validator
  |
  v
Learning + Transactional Turn Commit
```

## Capabilities

A capability owns a learner-facing mode of work. It is intentionally larger than a single tool and smaller than the whole application.

Current capability IDs:

- `chat`
- `guided_learning`
- `practice`
- `quiz`
- `reading`
- `mastery_path`

Reserved extension points:

- `deep_solve`
- `deep_question`
- `research`
- `visualize`
- `assessment`

The initial implementations are orchestrator-backed. This lets us establish the runtime contract without duplicating the existing tutoring pipeline. Individual capabilities can later gain specialized strategies and tool sequences without changing the API or transaction boundary.

## Tools

Tools are single-purpose operations available to capabilities.

Initial tool contract includes:

- curriculum retrieval
- authorized content retrieval
- learner state
- mastery
- misconceptions
- question-bank search
- question generation
- answer evaluation
- learning-event creation
- web search
- calculation
- code execution
- visualization

Tools are not automatically available to the model. A future tool authorization layer will decide whether a capability may invoke each tool for a particular learner/session.

Tool risk is explicit:

- `read`
- `write`
- `external`
- `execution`

This gives Tias a controlled path toward richer agent behaviour without allowing the AI model to become the authorization authority.

## Preparation vs execution

The tutor turn is deliberately split into two phases:

### Preparation

`TutorTurnOrchestrator.prepare()`

Builds:

- learner context
- session state
- conversation context
- mastery/misconception context
- intent
- retrieved evidence
- teaching strategy

No model generation occurs during preparation.

### Execution

`TutorTurnOrchestrator.complete()`

Performs:

- AI generation
- response validation
- grounded response acceptance

The capability runtime selects the capability between these phases.

This means the system can evolve from:

```
intent -> one generic tutor pipeline
```

to:

```
intent -> capability -> tool plan -> teaching strategy -> AI -> validation
```

without rewriting turn admission or persistence.

## Non-negotiable boundaries

1. PostgreSQL is the authoritative application/learning store.
2. Firebase/Auth identity is mapped into the application authorization boundary.
3. Gemini is behind `AIGateway`.
4. Retrieved content is evidence, not executable instruction.
5. AI output is untrusted until validated.
6. Capabilities and tools never bypass authorization or governance.
7. Learning updates are committed transactionally with the turn.
8. Idempotency and optimistic concurrency remain enforced by the existing turn pipeline.
9. Assessment policies can restrict capability/tool availability.
10. The model never directly writes authoritative learner state.

## DeepTutor relationship

Tias adopts architectural ideas from the open-source DeepTutor project, particularly the separation between single-purpose tools and multi-stage capabilities.

We are **not** making DeepTutor a runtime dependency and are not copying its implementation wholesale.

The product-specific core remains Tias:

- CAPS curriculum graph
- South African school context
- PostgreSQL learner model
- mastery
- misconceptions
- learning evidence
- assessment governance
- source authority hierarchy
- transactional turn processing

If source code from an external Apache-2.0 project is ever copied into Tias, the relevant license and NOTICE requirements must be preserved. The current architecture change is an original interface/design adaptation and does not copy DeepTutor source files.

## Next architectural layers

After local runtime validation, the next implementation sequence is:

1. Tool authorization service
2. Real curriculum/content retrieval tools
3. Question-bank tool
4. Adaptive practice capability
5. Mastery Path capability
6. Research and reading capabilities
7. Assessment capability with policy enforcement
8. Capability/tool audit events
9. Streaming and recoverable capability execution
10. Specialized agent loops only where they provide measurable educational value
