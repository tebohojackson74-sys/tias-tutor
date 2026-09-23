import "dotenv/config";
import { createServer } from "node:http";
import { healthcheck } from "./infrastructure/postgres.js";

const port = Number(process.env.PORT ?? 3000);

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

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "NOT_FOUND" }));
});

server.listen(port, () => {
  console.log("Tias Tutor listening on :" + port);
});
