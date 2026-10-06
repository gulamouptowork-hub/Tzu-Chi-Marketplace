import { fork, spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

for (const path of [".env.local", ".env"])
  if (existsSync(path)) process.loadEnvFile(path);
const db = new PrismaClient();
let database;
let server;
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (server?.pid && process.platform === "win32")
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
  else server?.kill();
  if (database?.connected) {
    database.send("stop");
    await new Promise((resolve) => {
      database.once("exit", resolve);
      setTimeout(resolve, 10000).unref();
    });
  }
  await db.$disconnect();
  process.exit(code);
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
try {
  let connected = false;
  try {
    await db.$connect();
    connected = true;
  } catch {
    /* Managed local development may start it below. */
  }
  if (
    !connected &&
    process.env.DEV_DATABASE_MANAGED === "true" &&
    process.env.MARKETPLACE_INTEGRATION !== "true"
  ) {
    database = fork("scripts/dev-db.mjs", [], {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      windowsHide: true,
    });
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Local database startup timed out")),
        90000,
      );
      database.once("message", (message) => {
        if (message === "ready") {
          clearTimeout(timeout);
          resolve();
        }
      });
      database.once("exit", () => {
        clearTimeout(timeout);
        if (!stopping) reject(new Error("Local database failed to start"));
      });
    });
    await db.$connect();
  } else if (!connected && process.env.MARKETPLACE_INTEGRATION !== "true") {
    throw new Error(
      "Database unavailable. Start PostgreSQL, or set DEV_DATABASE_MANAGED=true for the bundled localhost database.",
    );
  }
  await db.$disconnect();
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", ...process.argv.slice(2)],
    { stdio: "inherit", windowsHide: true },
  );
  server.once("exit", (code) => void stop(code ?? 1));
} catch (error) {
  console.error(error.message);
  await stop(1);
}
