import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { chromium } from "@playwright/test";
import { readFile, unlink, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
process.loadEnvFile(".env.local");
const db = new PrismaClient();
let browser;
let user;
try {
  user = await db.user.create({
    data: {
      email: `local.qa.${Date.now()}@gms.tcu.edu.tw`,
      displayName: "Local verification",
      rulesAcceptedAt: new Date(),
    },
  });
  const token = await encode({
    token: { sub: user.id },
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
      sameSite: "Lax",
    },
    { name: "locale", value: "en", domain: "localhost", path: "/" },
  ]);
  const page = await context.newPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  await page.goto("/listings/new");
  await page
    .getByLabel("Item title", { exact: true })
    .fill("Local upload verification");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Temporary verification of local image upload and rendering.");
  await page.getByRole("spinbutton", { name: "Price (NT$)" }).fill("250");
  await page
    .getByLabel("Photos", { exact: true })
    .setInputFiles("public/demo/1.webp");
  await page
    .getByRole("button", { name: "Publish listing", exact: true })
    .click();
  await page.waitForURL(
    (url) => /^\/listings\/(?!new$)[^/]+$/.test(url.pathname),
    { timeout: 30000 },
  );
  const listing = await db.listing.findFirstOrThrow({
    where: { sellerId: user.id },
    include: { images: true },
  });
  const image = await context.request.get(listing.images[0].url);
  if (!image.ok() || image.headers()["content-type"] !== "image/webp")
    throw new Error("Local processed image failed");
  await page.locator('img[alt="Local upload verification"]').first().waitFor();
  await page.waitForFunction(() =>
    [...document.querySelectorAll('img[alt="Local upload verification"]')].some(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
  const upload = await db.upload.findFirstOrThrow({
    where: { userId: user.id },
  });
  const denied = await context.request.put(
    "/api/local-storage/" + upload.key + "?token=invalid",
    {
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "image/webp",
      },
      data: await readFile("public/demo/1.webp"),
    },
  );
  if (denied.status() !== 403) throw new Error("Unsigned upload accepted");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/marketplace?q=No%20matching%20items");
  await page
    .getByRole("heading", { name: "No items here yet", exact: true })
    .waitFor();
  if (
    (await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    )) !== "rgb(248, 250, 252)"
  )
    throw new Error("Light theme changed with device preference");
  await mkdir("artifacts", { recursive: true });
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: "artifacts/emerald-empty-desktop.png",
    fullPage: true,
    caret: "initial",
    style: "nextjs-portal { display: none !important; }",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  if (
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
  )
    throw new Error("Mobile horizontal overflow");
  await page.screenshot({
    path: "artifacts/emerald-empty-mobile.png",
    fullPage: true,
    caret: "initial",
    style: "nextjs-portal { display: none !important; }",
  });
  await page.getByRole("button", { name: "Filters (0)", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("dialog").evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished),
    );
  });
  await page.screenshot({
    path: "artifacts/emerald-drawer-mobile.png",
    fullPage: true,
    caret: "initial",
    style: "nextjs-portal { display: none !important; }",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "artifacts/emerald-drawer-desktop.png",
    fullPage: true,
    caret: "initial",
    style: "nextjs-portal { display: none !important; }",
  });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  if (failures.length)
    throw new Error("Browser errors: " + failures.join("; "));
  console.log(
    "PASS: local photo compression, signed upload, server processing, persisted listing, optimized image rendering and unsigned-upload rejection.",
  );
} finally {
  await browser?.close();
  if (user) {
    const uploads = await db.upload.findMany({ where: { userId: user.id } });
    for (const upload of uploads)
      for (const key of [
        upload.key,
        `images/${upload.id}.webp`,
        `images/${upload.id}-thumb.webp`,
      ]) {
        if (
          /^(staging\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+|images\/[a-zA-Z0-9_-]+\.webp)$/.test(
            key,
          )
        )
          await unlink(resolve(".dev-data/media", key)).catch(() => {});
      }
    await db.listing.deleteMany({ where: { sellerId: user.id } });
    await db.upload.deleteMany({ where: { userId: user.id } });
    await db.rateLimitEvent.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
  await db.$disconnect();
}
