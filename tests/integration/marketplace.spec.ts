import { test, expect, type BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient({
  datasourceUrl:
    "postgresql://marketplace:test-only@localhost:55432/marketplace_test",
});
const secret = "integration-test-secret-never-for-production-123456";
async function login(context: BrowserContext, id: string) {
  const token = await encode({
    token: { sub: id },
    secret,
    salt: "authjs.session-token",
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
}
test.afterAll(() => db.$disconnect());
test("create with images, search, contact, mutual completion and moderation", async ({
  page,
  context,
  browser,
}) => {
  const seller = await db.user.upsert({
    where: { email: "integration.seller@gms.tcu.edu.tw" },
    create: {
      email: "integration.seller@gms.tcu.edu.tw",
      displayName: "測試賣家",
      department: "資訊工程學系",
      rulesAcceptedAt: new Date(),
    },
    update: { suspendedAt: null, deletedAt: null },
  });
  const buyer = await db.user.upsert({
    where: { email: "integration.buyer@gms.tcu.edu.tw" },
    create: {
      email: "integration.buyer@gms.tcu.edu.tw",
      displayName: "測試買家",
      department: "資訊工程學系",
      rulesAcceptedAt: new Date(),
    },
    update: { suspendedAt: null, deletedAt: null },
  });
  await db.rateLimitEvent.deleteMany({
    where: { userId: { in: [seller.id, buyer.id] } },
  });
  await login(context, seller.id);
  await page.goto("/listings/new");
  const title = "Integration textbook " + Date.now();
  await page.getByLabel("物品名稱", { exact: true }).fill(title);
  await page
    .getByLabel("物品說明", { exact: true })
    .fill("保存良好的課本，白天在圖書館入口交換。");
  await page.getByRole("spinbutton", { name: "價格（新臺幣）" }).fill("300");
  await page
    .getByLabel("照片", { exact: true })
    .setInputFiles("public/demo/1.webp");
  await page.getByRole("button", { name: "刊登物品", exact: true }).click();
  await expect(page).toHaveURL(/\/listings\/[^/]+$/, { timeout: 30000 });
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  const id = page.url().split("/").pop()!;
  await page.goto("/listings/" + id + "/edit");
  await page.getByRole("spinbutton", { name: "價格（新臺幣）" }).fill("350");
  await page.getByRole("button", { name: "儲存變更", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "購買／安排交換" }),
  ).toHaveCount(0);
  await page.goto(
    "/marketplace?q=" + encodeURIComponent("Integration") + "&min=200&max=400",
  );
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/feed-desktop.png",
    fullPage: true,
  });
  const buyerContext = await browser.newContext();
  await login(buyerContext, buyer.id);
  const buyerPage = await buyerContext.newPage();
  await buyerPage.goto("/listings/" + id);
  await expect(buyerPage.locator("body")).not.toContainText(
    "integration.seller@gms.tcu.edu.tw",
  );
  expect(
    (
      await buyerContext.request.patch("/api/listings/" + id, {
        headers: { Origin: "http://localhost:3001" },
        data: { status: "SOLD" },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await buyerContext.request.post("/api/listings/" + id + "/save", {
        headers: { Origin: "https://untrusted.example" },
        data: { saved: true },
      })
    ).status(),
  ).toBe(403);
  await buyerPage
    .getByRole("button", { name: "收藏物品", exact: true })
    .click();
  await expect(
    buyerPage.getByRole("button", { name: "取消收藏", exact: true }),
  ).toBeVisible();
  await buyerPage.goto("/saved");
  await expect(
    buyerPage.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await buyerPage.goto("/listings/" + id);
  await buyerPage.setViewportSize({ width: 390, height: 844 });
  await buyerPage.screenshot({
    path: "test-results/detail-mobile.png",
    fullPage: true,
  });
  await buyerPage.getByRole("button", { name: "購買／安排交換" }).click();
  const tomorrow = new Date(Date.now() + 86400000);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tomorrow);
  await buyerPage
    .getByLabel("日期與時間", { exact: true })
    .fill(date + "T14:00");
  await buyerPage
    .getByRole("button", { name: "安排交換", exact: true })
    .click();
  await expect(
    buyerPage.getByRole("link", { name: "開啟郵件程式" }),
  ).toHaveAttribute("href", /^mailto:/, { timeout: 15000 });
  const exchange = await db.exchange.findFirstOrThrow({
    where: { listingId: id, buyerId: buyer.id },
    orderBy: { createdAt: "desc" },
  });
  const headers = { Origin: "http://localhost:3001" };
  expect(
    (
      await context.request.patch("/api/exchanges/" + exchange.id, {
        headers,
        data: { action: "accept" },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await buyerContext.request.patch("/api/exchanges/" + exchange.id, {
        headers,
        data: { action: "complete" },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (await db.exchange.findUniqueOrThrow({ where: { id: exchange.id } }))
      .status,
  ).toBe("ACCEPTED");
  expect(
    (
      await context.request.patch("/api/exchanges/" + exchange.id, {
        headers,
        data: { action: "complete" },
      })
    ).ok(),
  ).toBe(true);
  expect((await db.listing.findUniqueOrThrow({ where: { id } })).status).toBe(
    "SOLD",
  );
  await buyerPage.goto("/listings/" + id);
  await buyerPage
    .getByRole("button", { name: "檢舉物品", exact: true })
    .click();
  await buyerPage.getByRole("dialog").getByLabel("原因").selectOption("SCAM");
  await buyerPage
    .getByRole("dialog")
    .getByRole("button", { name: "送出檢舉" })
    .click();
  await expect(
    buyerPage.getByRole("dialog").getByText("檢舉已送出"),
  ).toBeVisible();
  expect(
    (
      await buyerContext.request.patch("/api/admin", {
        headers,
        data: { action: "listing", id, hide: true },
      })
    ).status(),
  ).toBe(403);
  const admin = await db.user.findUniqueOrThrow({
    where: { email: "integration.admin@gms.tcu.edu.tw" },
  });
  await db.user.update({
    where: { id: admin.id },
    data: { rulesAcceptedAt: new Date() },
  });
  await login(context, admin.id);
  await page.goto("/admin?tab=reports");
  const reportCard = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await reportCard.getByRole("button", { name: "隱藏刊登" }).click();
  await page
    .getByRole("dialog", { name: "隱藏刊登" })
    .getByRole("button", { name: "確認操作", exact: true })
    .click();
  await expect(
    reportCard.getByRole("button", { name: "恢復刊登" }),
  ).toBeVisible();
  await buyerPage.goto("/listings/" + id);
  await expect(
    buyerPage.getByRole("heading", { name: "找不到這件物品或頁面" }),
  ).toBeVisible();
  await buyerContext.close();
});

test("contact limit is enforced atomically and invalid images are rejected", async ({
  context,
}) => {
  const user = await db.user.upsert({
    where: { email: "integration.limits@gms.tcu.edu.tw" },
    create: {
      email: "integration.limits@gms.tcu.edu.tw",
      displayName: "Limit test",
      rulesAcceptedAt: new Date(),
    },
    update: { deletedAt: null, suspendedAt: null },
  });
  await login(context, user.id);
  const headers = { Origin: "http://localhost:3001" };
  await db.rateLimitEvent.deleteMany({ where: { userId: user.id } });
  await db.rateLimitEvent.createMany({
    data: Array.from({ length: 19 }, () => ({
      userId: user.id,
      action: "contact",
    })),
  });
  const listing = await db.listing.findUniqueOrThrow({
    where: { id: "demo-listing-1" },
  });
  const proposed = new Date(Date.now() + 86400000);
  proposed.setUTCHours(6, 0, 0, 0);
  const responses = await Promise.all(
    [1, 2].map(() =>
      context.request.post("/api/listings/" + listing.id + "/contact", {
        headers,
        data: {
          message: "Integration limit test",
          pointId: "jieren-library",
          scheduledAt: proposed.toISOString(),
        },
      }),
    ),
  );
  expect(responses.map((r) => r.status()).sort()).toEqual([200, 429]);
  const presigned = await context.request.post("/api/uploads", {
    headers,
    data: { action: "presign", mimeType: "image/png", bytes: 4 },
  });
  expect(presigned.ok()).toBe(true);
  const upload = await presigned.json();
  await context.request.put(upload.url, {
    headers: { "Content-Type": "image/png" },
    data: Buffer.from("fake"),
  });
  const completion = await context.request.post("/api/uploads", {
    headers,
    data: { action: "complete", id: upload.id },
  });
  expect(completion.status()).toBe(400);
  const oversized = await context.request.post("/api/uploads", {
    headers,
    data: { action: "presign", mimeType: "image/png", bytes: 6 * 1024 * 1024 },
  });
  expect(oversized.status()).toBe(400);
});

test("deleting a buyer account cancels exchanges and releases the seller reservation", async ({
  context,
}) => {
  const buyer = await db.user.create({
    data: {
      email: "integration.retiring@gms.tcu.edu.tw",
      displayName: "Retiring student",
      rulesAcceptedAt: new Date(),
    },
  });
  const listing = await db.listing.update({
    where: { id: "demo-listing-2" },
    data: { status: "RESERVED" },
  });
  const exchange = await db.exchange.create({
    data: {
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: listing.sellerId,
      pointId: "jieren-library",
      scheduledAt: new Date(Date.now() + 86400000),
      status: "ACCEPTED",
    },
  });
  await login(context, buyer.id);
  expect(
    (
      await context.request.delete("/api/account", {
        headers: { Origin: "http://localhost:3001" },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (await db.exchange.findUniqueOrThrow({ where: { id: exchange.id } }))
      .status,
  ).toBe("CANCELLED");
  expect(
    (await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).status,
  ).toBe("AVAILABLE");
  expect(
    (
      await context.request.post("/api/listings/demo-listing-1/save", {
        headers: { Origin: "http://localhost:3001" },
        data: { saved: true },
      })
    ).status(),
  ).toBe(403);
});
