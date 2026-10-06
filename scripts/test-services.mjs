import EmbeddedPostgres from "embedded-postgres";
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
const postgres = new EmbeddedPostgres({
  databaseDir: ".test-data/postgres-utf8",
  user: "marketplace",
  password: "test-only",
  port: 55432,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: (message) => console.error(message),
});
if (!existsSync(".test-data/postgres-utf8/PG_VERSION"))
  await postgres.initialise();
await postgres.start();
try {
  await postgres.createDatabase("marketplace_test");
} catch (error) {
  if (!String(error).includes("already exists")) throw error;
}
const env = {
  ...process.env,
  DATABASE_URL:
    "postgresql://marketplace:test-only@localhost:55432/marketplace_test",
  SEED_DEMO: "true",
  ADMIN_EMAILS: "integration.admin@gms.tcu.edu.tw",
};
for (const args of [
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  ["--import", "tsx", "prisma/seed.ts"],
]) {
  if (args[0] === "--import") {
    // Reset only this harness-owned database so stale fixture URLs never leak
    // into later runs. Production DATABASE_URL is never read for this operation.
    const client = postgres.getPgClient("marketplace_test", "127.0.0.1");
    await client.connect();
    await client.query(
      'TRUNCATE TABLE "User", "Category", "ExchangePoint", "RateLimitEvent", "VerificationToken" CASCADE',
    );
    await client.end();
  }
  const result = spawnSync(process.execPath, args, {
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.status !== 0) {
    await postgres.stop();
    process.exit(result.status ?? 1);
  }
}
// Isolated in-memory S3 protocol fixture. Never used by production application code.
const objects = new Map();
const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
  res.setHeader("Access-Control-Allow-Methods", "PUT,GET,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const key = new URL(req.url, "http://localhost").pathname;
  if (key === "/") {
    res.end("ready");
    return;
  }
  if (req.method === "PUT") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    objects.set(key, {
      body: Buffer.concat(chunks),
      type: req.headers["content-type"] ?? "application/octet-stream",
    });
    res.setHeader("ETag", '"fixture"');
    res.end();
    return;
  }
  const object = objects.get(key);
  if (!object) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader("Content-Type", object.type);
  res.setHeader("Content-Length", object.body.length);
  res.end(req.method === "HEAD" ? undefined : object.body);
});
server.listen(59000, "127.0.0.1", () =>
  console.log("Test database and S3 fixture ready on http://localhost:59000"),
);
async function stop() {
  server.close();
  await postgres.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
