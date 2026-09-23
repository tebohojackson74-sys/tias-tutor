# Tias Tutor

Adaptive AI learning platform built around a learner-model-driven tutor loop: learner message -> evidence -> interpretation -> teaching move -> AI response -> learner action -> learning update.

## Foundation added

- TypeScript project configuration
- Zod request and AI-response schemas
- Tutor domain types and repository contracts
- Tutor-turn idempotency and admission service
- PostgreSQL connection foundation
- Initial tutor session, session-state, turn, and message migration
- Health endpoint

## Architecture direction

The application is a modular monolith first. The core flow is designed as:

API -> application service -> domain service -> repository -> PostgreSQL

The tutor engine will sit behind this boundary with context building, authorised retrieval, intent detection, strategy selection, Gemini generation, response validation, learning updates, and final transaction commit.

## Run locally

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Run `npm run typecheck`.
4. Start the service with `npm run dev`.

The next implementation layer is the real Tutor Turn pipeline: repositories, context builder, retrieval manager, intent detector, strategy engine, Gemini adapter, response validator, learning engine, final commit, and recovery worker.
