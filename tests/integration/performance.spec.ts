import { test, expect, chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import lighthouse from "lighthouse";
import { writeFile, mkdir } from "node:fs/promises";
test("authenticated mobile marketplace meets performance and accessibility targets", async () => {
  test.skip(
    process.env.TEST_PRODUCTION !== "true",
    "Lighthouse measures the optimized production server.",
  );
  test.setTimeout(180000);
  const db = new PrismaClient({
    datasourceUrl:
      "postgresql://marketplace:test-only@localhost:55432/marketplace_test",
  });
  const user = await db.user.findUniqueOrThrow({
    where: { email: "marketplace.demo@gms.tcu.edu.tw" },
  });
  await db.$disconnect();
  const token = await encode({
    token: { sub: user.id },
    secret: "integration-test-secret-never-for-production-123456",
    salt: "authjs.session-token",
  });
  const browser = await chromium.launch({
    headless: true,
    args: ["--remote-debugging-port=9223"],
  });
  try {
    const result = await lighthouse("http://localhost:3001/marketplace", {
      port: 9223,
      output: "html",
      onlyCategories: ["performance", "accessibility"],
      extraHeaders: { Cookie: "authjs.session-token=" + token },
    });
    if (!result) throw new Error("No Lighthouse result");
    await mkdir("artifacts", { recursive: true });
    await writeFile("artifacts/lighthouse.html", result.report as string);
    await writeFile(
      "artifacts/lighthouse-scores.json",
      JSON.stringify(
        {
          performance: result.lhr.categories.performance.score,
          accessibility: result.lhr.categories.accessibility.score,
          audits: Object.fromEntries(
            Object.entries(result.lhr.audits)
              .filter(([, audit]) => audit.score !== null && audit.score < 1)
              .map(([id, audit]) => [
                id,
                {
                  score: audit.score,
                  title: audit.title,
                  details: audit.details,
                },
              ]),
          ),
        },
        null,
        2,
      ),
    );
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.addCookies([
      {
        name: "authjs.session-token",
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const page = await context.newPage();
    await page.goto("http://localhost:3001/marketplace");
    await page.screenshot({
      path: "artifacts/marketplace-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "artifacts/marketplace-mobile.png",
      fullPage: true,
    });
    await context.close();
    expect(result.lhr.categories.performance.score).toBeGreaterThanOrEqual(0.9);
    expect(result.lhr.categories.accessibility.score).toBeGreaterThanOrEqual(
      0.95,
    );
  } finally {
    await browser.close();
  }
});
