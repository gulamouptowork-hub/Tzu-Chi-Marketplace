import { test, expect, type BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";
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
test("admin analytics, pagination and moderation are private and audited", async ({
  page,
  context,
  browser,
}) => {
  const stamp = Date.now();
  const prefix = `Admin QA ${stamp}`;
  const admin = await db.user.create({
    data: {
      email: `admin.qa.${stamp}@gms.tcu.edu.tw`,
      displayName: "QA administrator",
      role: "ADMIN",
      rulesAcceptedAt: new Date(),
    },
  });
  const student = await db.user.create({
    data: {
      email: `student.qa.${stamp}@gms.tcu.edu.tw`,
      displayName: prefix + " student",
      rulesAcceptedAt: new Date(),
    },
  });
  await db.user.createMany({
    data: Array.from({ length: 21 }, (_, index) => ({
      email: `pagination.${stamp}.${index}@gms.tcu.edu.tw`,
      displayName: prefix + " student " + index,
      rulesAcceptedAt: new Date(),
    })),
  });
  const point = await db.exchangePoint.findFirstOrThrow({
    where: { campus: "JIEREN", active: true },
  });
  const category = await db.category.findFirstOrThrow();
  const listing = await db.listing.create({
    data: {
      sellerId: student.id,
      title: prefix + " product",
      description: "A test product for admin analytics and moderation.",
      categoryId: category.id,
      condition: "GOOD",
      priceNtd: 150,
      campuses: ["JIEREN"],
      meetupLocation: point.id,
    },
  });
  const report = await db.report.create({
    data: {
      listingId: listing.id,
      reporterId: student.id,
      reason: "SCAM",
      details: prefix + " report details",
    },
  });
  const anonymous = await browser.newContext();
  expect((await anonymous.request.get("/api/admin?tab=users")).status()).toBe(
    401,
  );
  await anonymous.close();
  const studentContext = await browser.newContext();
  await login(studentContext, student.id);
  expect(
    (await studentContext.request.get("/api/admin?tab=users")).status(),
  ).toBe(403);
  expect(
    (
      await studentContext.request.patch("/api/admin", {
        headers,
        data: { action: "listing", id: listing.id, hide: true },
      })
    ).status(),
  ).toBe(403);
  const studentPage = await studentContext.newPage();
  await studentPage.goto("/admin?tab=users");
  await expect(studentPage).toHaveURL(/\/marketplace$/);
  await studentContext.close();
  await login(context, admin.id);
  const overviewResponse = await context.request.get("/api/admin?period=7");
  expect(overviewResponse.status()).toBe(200);
  expect(overviewResponse.headers()["cache-control"]).toBe("private, no-store");
  const overview = await overviewResponse.json();
  expect(overview.series).toHaveLength(7);
  expect(overview.metrics.users).toBe(
    await db.user.count({ where: { deletedAt: null } }),
  );
  expect(
    overview.series.reduce(
      (sum: number, day: { users: number }) => sum + day.users,
      0,
    ),
  ).toBe(overview.metrics.newUsers);
  expect(overview.metrics.openReports).toBe(
    await db.report.count({ where: { status: "OPEN" } }),
  );
  expect((await context.request.get("/api/admin?page=10001")).status()).toBe(
    400,
  );
  const first = await (
    await context.request.get(
      "/api/admin?tab=users&q=" + encodeURIComponent(prefix),
    )
  ).json();
  expect(first.total).toBe(22);
  expect(first.rows).toHaveLength(20);
  expect(Object.keys(first.rows[0])).not.toContain("accounts");
  expect(Object.keys(first.rows[0])).not.toContain("sessions");
  expect(Object.keys(first.rows[0])).not.toContain("emailVerified");
  const second = await (
    await context.request.get(
      "/api/admin?tab=users&page=2&q=" + encodeURIComponent(prefix),
    )
  ).json();
  expect(second.rows).toHaveLength(2);
  expect(
    first.rows
      .map((row: { id: string }) => row.id)
      .some((id: string) =>
        second.rows.some((row: { id: string }) => row.id === id),
      ),
  ).toBe(false);

  await page.goto("/admin?period=7");
  await expect(
    page.getByRole("heading", { name: "Admin dashboard", exact: true }),
  ).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/admin-overview-${width}.png`,
      fullPage: true,
      caret: "initial",
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "Users", exact: true }).click();
  await page.getByLabel("Search", { exact: true }).fill(prefix);
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(20);
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(2);

  await page.goto("/admin?tab=listings&q=" + encodeURIComponent(prefix));
  await page.getByRole("button", { name: "Hide listing", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Hide listing" });
  expect(
    (await db.listing.findUniqueOrThrow({ where: { id: listing.id } }))
      .hiddenAt,
  ).toBeNull();
  await confirmation
    .getByLabel("Reason / note (optional)", { exact: true })
    .fill("Reviewing reported product");
  await confirmation
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Restore listing", exact: true }),
  ).toBeVisible();
  expect(
    (await db.listing.findUniqueOrThrow({ where: { id: listing.id } }))
      .hiddenAt,
  ).not.toBeNull();
  const audit = await db.adminAuditLog.findFirstOrThrow({
    where: { targetId: listing.id },
  });
  expect(audit.actorId).toBe(admin.id);
  expect(audit.reason).toBe("Reviewing reported product");
  expect(audit.before).toEqual({ hidden: false });
  expect(audit.after).toEqual({ hidden: true });
  await context.request.patch("/api/admin", {
    headers,
    data: { action: "listing", id: listing.id, hide: true },
  });
  expect(
    await db.adminAuditLog.count({ where: { targetId: listing.id } }),
  ).toBe(1);
  expect(
    (
      await context.request.patch("/api/admin", {
        headers: { Origin: "https://other.example" },
        data: { action: "listing", id: listing.id, hide: false },
      })
    ).status(),
  ).toBe(403);
  await context.request.patch("/api/admin", {
    headers,
    data: { action: "listing", id: listing.id, hide: false },
  });
  await context.request.patch("/api/admin", {
    headers,
    data: {
      action: "user",
      id: student.id,
      suspend: true,
      reason: "Account review",
    },
  });
  const suspended = await (
    await context.request.get(
      "/api/admin?tab=users&status=suspended&q=" + encodeURIComponent(prefix),
    )
  ).json();
  expect(suspended.total).toBe(1);
  await context.request.patch("/api/admin", {
    headers,
    data: { action: "user", id: student.id, suspend: false },
  });
  expect(
    (
      await context.request.patch("/api/admin", {
        headers,
        data: { action: "user", id: admin.id, suspend: true },
      })
    ).status(),
  ).toBe(403);
  await context.request.patch("/api/admin", {
    headers,
    data: { action: "report", id: report.id, reason: "Reviewed" },
  });
  const resolved = await (
    await context.request.get(
      "/api/admin?tab=reports&status=RESOLVED&q=" + encodeURIComponent(prefix),
    )
  ).json();
  expect(resolved.total).toBe(1);
  expect(resolved.rows[0].resolvedBy.id).toBe(admin.id);
  await page.goto("/admin?tab=activity&q=" + encodeURIComponent(prefix));
  await expect(page.getByRole("table")).toContainText("Product hidden");
  await expect(page.getByRole("table")).toContainText(
    "Reviewing reported product",
  );
  await page.goto(
    "/admin?tab=reports&status=RESOLVED&q=" + encodeURIComponent(prefix),
  );
  await expect(
    page.getByRole("heading", { name: listing.title, exact: true }),
  ).toBeVisible();
});
