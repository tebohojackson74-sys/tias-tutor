import "dotenv/config";
import { createServer } from "node:http";
import { pool, healthcheck } from "./infrastructure/postgres.js";
import { PgTutorTurnAdmissionRepository } from "./infrastructure/pg/tutor-turn-admission-repository.js";
import { PgTutorContextSources } from "./infrastructure/pg/tutor-context-sources.js";
import { PgPendingInteractionRepository } from "./infrastructure/pg/pending-interaction-repository.js";
import { TutorContextBuilder } from "./application/tutor-context-builder.js";
import { RetrievalManager } from "./application/retrieval-manager.js";
import { EmptyRetrievalProvider } from "./infrastructure/retrieval/empty-provider.js";
import { GeminiInteractionsAdapter } from "./infrastructure/ai/gemini-interactions-adapter.js";
import { PgTutorTurnCommitRepository } from "./infrastructure/pg/tutor-turn-commit-repository.js";
import { TutorService } from "./application/tutor-service.js";
import { TutorTurnOrchestrator } from "./application/tutor-turn-orchestrator.js";
import { PendingInteractionService } from "./application/pending-interaction-service.js";
import { LearningEngine } from "./application/learning-engine.js";
import { handleTutorMessageRoute } from "./api/tutor-route.js";

const port = Number(process.env.PORT ?? 3000);

const contextSources = new PgTutorContextSources(pool);
const contextBuilder = new TutorContextBuilder(contextSources);
const retrieval = new RetrievalManager(new EmptyRetrievalProvider());
const ai = new GeminiInteractionsAdapter();
const admission = new PgTutorTurnAdmissionRepository(pool);
const pendingReader = new PgPendingInteractionRepository(pool);
const pendingInteractions = new PendingInteractionService(
  pendingReader,
  ai,
);
const learning = new LearningEngine();
const commit = new PgTutorTurnCommitRepository(pool);
const orchestrator = new TutorTurnOrchestrator(
  contextBuilder,
  retrieval,
  ai,
);
const tutorService = new TutorService(
  admission,
  orchestrator,
  pendingInteractions,
  learning,
  commit,
);

const server = createServer(async (req, res) => {
  if (req.url === "/health") {
    try {
      await healthcheck();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: "tias-tutor" }));
    } catch {
      res.writeHead(503, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, service: "tias-tutor" }));
    }
    return;
  }

  if (req.url?.startsWith("/api/tutor/sessions/")) {
    await handleTutorMessageRoute(req, res, tutorService);
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "NOT_FOUND" }));
});

server.listen(port, () => {
  console.log("Tias Tutor listening on :" + port);
});
