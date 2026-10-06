import { defineConfig, devices } from "@playwright/test";
const env = {
  MARKETPLACE_INTEGRATION: "true",
  DATABASE_URL:
    "postgresql://marketplace:test-only@localhost:55432/marketplace_test",
  AUTH_SECRET: "integration-test-secret-never-for-production-123456",
  AUTH_URL: "http://localhost:3001",
  ALLOWED_EMAIL_DOMAINS: "gms.tcu.edu.tw",
  S3_ENDPOINT: "http://127.0.0.1:59000",
  S3_REGION: "auto",
  S3_BUCKET: "test",
  S3_ACCESS_KEY_ID: "test",
  S3_SECRET_ACCESS_KEY: "test",
  S3_PUBLIC_URL: "http://127.0.0.1:59000/test",
  SERVER_EMAIL_CONTACT: "false",
};
export default defineConfig({
  testDir: "tests/integration",
  workers: 1,
  timeout: 90000,
  use: { baseURL: "http://localhost:3001" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node scripts/test-services.mjs",
      url: "http://127.0.0.1:59000",
      timeout: 120000,
      env,
    },
    {
      command:
        process.env.TEST_PRODUCTION === "true"
          ? "npm run build && npm run start -- --port 3001"
          : "npm run dev -- --port 3001",
      url: "http://localhost:3001/sign-in",
      timeout: 120000,
      env,
    },
  ],
});
