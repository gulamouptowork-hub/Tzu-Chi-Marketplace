import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testIgnore: "**/integration/**",
  use: { baseURL: "http://localhost:3000" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/sign-in",
    reuseExistingServer: !process.env.CI,
  },
});
