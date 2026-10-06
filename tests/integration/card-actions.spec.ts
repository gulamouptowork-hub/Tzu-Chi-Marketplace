import { test, expect, type BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";
import { taipeiDateTimeInput } from "../../src/lib/exchange-time";

const db = new PrismaClient({
  datasourceUrl:
    "postgresql://marketplace:test-only@localhost:55432/marketplace_test",
});
const headers = { Origin: "http://localhost:3001" };
async function login(context: BrowserContext, id: string) {
  const token = await encode({
    token: { sub: id },
    secret: "integration-test-secret-never-for-production-123456",
    salt: "authjs.session-token",
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
}
test.afterAll(() => db.$disconnect());
test("feed cards arrange exchanges and send reports to admin moderation", async ({
  page,
  context,
  browser,
}) => {
  const stamp = Date.now();
  const [seller, buyer, admin] = await Promise.all(
    ["seller", "buyer", "admin"].map((role) =>
      db.user.create({
        data: {
          email: `card.${role}.${stamp}@gms.tcu.edu.tw`,
          displayName: `Card QA ${role}`,
          role: role === "admin" ? "ADMIN" : "STUDENT",
          rulesAcceptedAt: new Date(),
        },
      }),
    ),
  );
  const category = await db.category.findFirstOrThrow();
  const point = await db.exchangePoint.findFirstOrThrow({
    where: { campus: "JIEREN", active: true },
  });
  const listing = await db.listing.create({
    data: {
      sellerId: seller.id,
      title: `Card actions ${stamp}`,
      description:
        "An isolated product for verifying marketplace card actions.",
      categoryId: category.id,
      condition: "GOOD",
      priceNtd: 150,
      campuses: ["JIEREN"],
      meetupLocation: point.id,
      images: {
        create: {
          url: "/demo/1.webp",
          thumbUrl: "/demo/1.webp",
          alt: "Test product",
          position: 0,
        },
      },
    },
  });
  const feed = "/marketplace?q=" + encodeURIComponent(listing.title);
  const sellerContext = await browser.newContext();
  await login(sellerContext, seller.id);
  const sellerPage = await sellerContext.newPage();
  await sellerPage.goto(feed);
  await expect(
    sellerPage.getByRole("link", { name: "Edit listing", exact: true }),
  ).toBeVisible();
  await expect(
    sellerPage.getByRole("button", {
      name: `Buy ${listing.title}`,
      exact: true,
    }),
  ).toHaveCount(0);
  expect(
    (
      await sellerContext.request.post(`/api/listings/${listing.id}/report`, {
        headers,
        data: { reason: "SCAM", details: "Self-report should be rejected" },
      })
    ).status(),
  ).toBe(403);

  await login(context, buyer.id);
  await page.goto(feed);
  const buy = page.getByRole("button", {
    name: `Buy ${listing.title}`,
    exact: true,
  });
  const report = page.getByRole("button", {
    name: `Report ${listing.title}`,
    exact: true,
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(buy).toBeVisible();
    await expect(report).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/card-actions-${width}.png`,
      fullPage: true,
    });
  }
  await buy.click();
  const exchangeDialog = page.getByRole("dialog", {
    name: "Buy / Arrange Exchange",
  });
  await expect(exchangeDialog.getByRole("combobox").nth(1)).toHaveValue(
    point.id,
  );
  const tomorrow = taipeiDateTimeInput(new Date(Date.now() + 86400000)).slice(
    0,
    10,
  );
  await exchangeDialog
    .getByLabel("Date and time", { exact: true })
    .fill(tomorrow + "T14:00");
  await exchangeDialog
    .getByRole("button", { name: "Arrange exchange", exact: true })
    .click();
  await expect(
    exchangeDialog.getByRole("link", { name: "Open email app" }),
  ).toBeVisible();
  const exchange = await db.exchange.findFirstOrThrow({
    where: { listingId: listing.id, buyerId: buyer.id },
  });
  expect(exchange.status).toBe("PROPOSED");
  await page.keyboard.press("Escape");
  await report.click();
  const reportDialog = page.getByRole("dialog", { name: "Report listing" });
  await reportDialog.getByLabel("Reason", { exact: true }).selectOption("SCAM");
  await reportDialog
    .getByLabel("Details (optional)", { exact: true })
    .fill("Please review this seller's listing.");
  await reportDialog
    .getByRole("button", { name: "Send report", exact: true })
    .click();
  await expect(reportDialog.getByRole("status")).toContainText("Report sent");
  await expect(
    reportDialog.getByRole("button", { name: "Send report", exact: true }),
  ).toBeDisabled();
  const record = await db.report.findFirstOrThrow({
    where: { listingId: listing.id, reporterId: buyer.id },
  });
  expect(record.status).toBe("OPEN");
  expect((await context.request.get("/api/admin?tab=reports")).status()).toBe(
    403,
  );

  const adminContext = await browser.newContext();
  await login(adminContext, admin.id);
  const adminPage = await adminContext.newPage();
  await adminPage.goto(
    "/admin?tab=reports&q=" + encodeURIComponent(listing.title),
  );
  await expect(
    adminPage.getByRole("heading", { name: listing.title, exact: true }),
  ).toBeVisible();
  await expect(
    adminPage.getByText(record.details!, { exact: true }),
  ).toBeVisible();
  await adminPage
    .getByRole("button", { name: "Suspend user", exact: true })
    .click();
  const confirmation = adminPage.getByRole("dialog", { name: "Suspend user" });
  expect(
    (await db.user.findUniqueOrThrow({ where: { id: seller.id } })).suspendedAt,
  ).toBeNull();
  await confirmation
    .getByLabel("Reason / note (optional)", { exact: true })
    .fill("Reviewed marketplace card report");
  await confirmation
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(
    adminPage.getByRole("button", { name: "Restore user", exact: true }),
  ).toBeVisible();
  expect(
    (await db.user.findUniqueOrThrow({ where: { id: seller.id } })).suspendedAt,
  ).not.toBeNull();
  expect(
    (await db.exchange.findUniqueOrThrow({ where: { id: exchange.id } }))
      .status,
  ).toBe("CANCELLED");
  expect(
    (
      await db.adminAuditLog.findFirstOrThrow({
        where: { targetId: seller.id, action: "USER_SUSPENDED" },
      })
    ).actorId,
  ).toBe(admin.id);
  expect(
    (
      await sellerContext.request.post(`/api/listings/${listing.id}/report`, {
        headers,
        data: { reason: "SCAM" },
      })
    ).status(),
  ).toBe(403);
  await page.goto(feed);
  await expect(
    page.getByRole("heading", { name: listing.title, exact: true }),
  ).toHaveCount(0);
  await adminContext.close();
  await sellerContext.close();
});
