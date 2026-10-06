import EmbeddedPostgres from "embedded-postgres";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

// Docker-free local PostgreSQL for development. It reads DATABASE_URL from
// .env.local so Next.js, Prisma and this server always share credentials.
const envFile = [".env.local", ".env"].find((path) => existsSync(path));
if (envFile) process.loadEnvFile(envFile);
const url = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("db:local only serves a localhost DATABASE_URL");
const dataDir = ".dev-data/postgres";
const postgres = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: Number(url.port || 5432),
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: (message) => console.error(message),
});
if (!existsSync(`${dataDir}/PG_VERSION`)) await postgres.initialise();
await postgres.start();
try {
  await postgres.createDatabase(url.pathname.slice(1));
} catch (error) {
  if (!String(error).includes("already exists")) throw error;
}
// Seeding uses upserts, so it is safe on every start.
for (const args of [
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  ["--import", "tsx", "prisma/seed.ts"],
]) {
  const result = spawnSync(process.execPath, args, {
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.status !== 0) {
    await postgres.stop();
    process.exit(result.status ?? 1);
  }
}
console.log(`Development database ready on ${url.host}. Ctrl+C to stop.`);
if (process.send) process.send("ready");
async function stop() {
  await postgres.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("message", (message) => {
  if (message === "stop") void stop();
});
process.on("disconnect", () => void stop());
