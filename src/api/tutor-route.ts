import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { sessionIdSchema, sendTutorMessageSchema } from "./schemas.js";
import type { TutorService } from "../application/tutor-service.js";

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

export async function handleTutorMessageRoute(
  req: IncomingMessage,
  res: ServerResponse,
  service: TutorService,
): Promise<void> {
  if (req.method !== "POST" || !req.url) {
    json(res, 405, { error: "METHOD_NOT_ALLOWED" });
    return;
  }

  const match = req.url.match(/^\/api\/tutor\/sessions\/([^/]+)\/messages$/);
  if (!match || !match[1]) {
    json(res, 404, { error: "NOT_FOUND" });
    return;
  }

  const parsedSession = sessionIdSchema.safeParse(match[1]);
  if (!parsedSession.success) {
    json(res, 400, { error: "INVALID_SESSION_ID" });
    return;
  }

  const userHeader = req.headers["x-tias-user-id"];
  const learnerHeader = req.headers["x-tias-learner-id"];
  const userId = Array.isArray(userHeader) ? userHeader[0] : userHeader;
  const learnerId = Array.isArray(learnerHeader) ? learnerHeader[0] : learnerHeader;

  if (!userId || !learnerId) {
    json(res, 401, {
      error: "IDENTITY_REQUIRED",
      requestId: randomUUID(),
    });
    return;
  }

  const rawBody = await readBody(req);
  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch {
    json(res, 400, { error: "INVALID_JSON" });
    return;
  }

  const parsedBody = sendTutorMessageSchema.safeParse(body);
  if (!parsedBody.success) {
    json(res, 422, {
      error: "VALIDATION_ERROR",
      issues: parsedBody.error.issues,
    });
    return;
  }

  try {
    const result = await service.sendMessage({
      userId,
      learnerId,
      sessionId: parsedSession.data,
      body: parsedBody.data,
    });

    json(res, 200, result);
  } catch (error) {
    json(res, 500, {
      error: error instanceof Error ? error.message : "INTERNAL_ERROR",
    });
  }
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
