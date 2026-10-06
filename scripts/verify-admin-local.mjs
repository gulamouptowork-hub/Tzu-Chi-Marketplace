import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { chromium } from "@playwright/test";
process.loadEnvFile(".env.local");
const db = new PrismaClient();
let browser;
try {
  const email = process.env.ADMIN_EMAILS.split(",")[0].trim();
  const admin = await db.user.findFirstOrThrow({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (
    admin.role !== "ADMIN" ||
    !admin.rulesAcceptedAt ||
    admin.suspendedAt ||
    admin.deletedAt
  )
    throw new Error(
      "The configured admin must sign in and finish onboarding before this local check.",
    );
  const token = await encode({
    token: { sub: admin.id },
    secret: process.env.AUTH_SECRET,
    salt: "authjs.session-token",
  });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: "http://localhost:3000",
  });
  await context.addCookies([
    {
      name: "authjs.session-token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
    },
    { name: "locale", value: "en", domain: "localhost", path: "/" },
  ]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/admin");
  await page
    .getByRole("heading", { name: "Admin dashboard", exact: true })
    .waitFor();
  const response = await context.request.get("/api/admin?period=7");
  if (response.status() !== 200 || (await response.json()).series.length !== 7)
    throw new Error("Local admin analytics failed");
  await page.waitForLoadState("networkidle");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      )
    )
      throw new Error("Admin page has horizontal overflow");
    await page.screenshot({
      path: `artifacts/admin-local-${width}.png`,
      fullPage: true,
      caret: "initial",
      style: "nextjs-portal { display: none !important; }",
    });
  }
  for (const tab of ["users", "listings", "exchanges", "reports", "activity"]) {
    await page.goto("/admin?tab=" + tab);
    await page.waitForLoadState("networkidle");
    const result = await context.request.get("/api/admin?tab=" + tab);
    if (result.status() !== 200 || (await result.json()).tab !== tab)
      throw new Error("Local admin section failed: " + tab);
  }
  if (errors.length)
    throw new Error("Admin browser errors: " + errors.join("; "));
  console.log(
    "PASS: configured owner admin, local analytics, all admin sections, responsive layout and browser error checks. No application records were changed.",
  );
} finally {
  await browser?.close();
  await db.$disconnect();
}
