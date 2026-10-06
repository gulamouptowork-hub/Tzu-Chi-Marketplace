import { test, expect, type BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import catalogue from "../../messages/departments.json";
const db = new PrismaClient({
  datasourceUrl:
    "postgresql://marketplace:test-only@localhost:55432/marketplace_test",
});
const headers = { Origin: "http://localhost:3001" };
async function identity(
  context: BrowserContext,
  name: string,
  admin = false,
  onboarded = true,
) {
  const user = await db.user.create({
    data: {
      email: `${name}.${Date.now()}@gms.tcu.edu.tw`,
      displayName: name,
      role: admin ? "ADMIN" : "STUDENT",
      rulesAcceptedAt: onboarded ? new Date() : null,
    },
  });
  const token = await encode({
    token: { sub: user.id },
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
      sameSite: "Lax",
    },
  ]);
  return user;
}
async function fixture(sellerId: string) {
  const category = await db.category.findFirstOrThrow();
  const point = await db.exchangePoint.findFirstOrThrow({
    where: { campus: "JIEREN", active: true },
  });
  const listing = await db.listing.create({
    data: {
      sellerId,
      categoryId: category.id,
      title: "Regression textbook",
      description: "A test fixture for exchange consistency.",
      condition: "GOOD",
      priceNtd: 300,
      meetupLocation: point.id,
      campuses: ["JIEREN"],
      images: {
        create: {
          url: "/demo/1.webp",
          thumbUrl: "/demo/1.webp",
          alt: "Test textbook",
          position: 0,
        },
      },
    },
    include: { images: true },
  });
  return { listing, point };
}
test.afterAll(() => db.$disconnect());
test("API errors are JSON, and onboarding/settings accept only official departments", async ({
  page,
  context,
  browser,
}) => {
  const anonymous = await browser.newContext();
  const denied = await anonymous.request.post("/api/listings", {
    headers,
    data: {},
  });
  expect(denied.status()).toBe(401);
  expect((await denied.json()).error).toBe("UNAUTHORIZED");
  await anonymous.close();
  const user = await identity(context, "onboarding", false, false);
  await page.goto("/marketplace");
  await expect(page).toHaveURL(/onboarding/);
  await page.getByLabel("顯示名稱", { exact: true }).fill("測試同學");
  await page.locator("#department-search").fill(catalogue.departments[0].name);
  await page
    .locator("#department-options")
    .selectOption(catalogue.departments[0].id);
  await page.locator('input[name="accept"]').check();
  await page.getByRole("button", { name: "開始逛市集", exact: true }).click();
  await expect(page).toHaveURL(/marketplace/);
  expect(
    (await db.user.findUniqueOrThrow({ where: { id: user.id } })).department,
  ).toBe(catalogue.departments[0].name);
  const malformed = await context.request.patch("/api/account", {
    headers: { ...headers, "Content-Type": "application/json" },
    data: "{",
  });
  expect(malformed.status()).toBe(400);
  const details = {
    displayName: "Updated student",
    department: "invented-department",
    year: "",
    preferredMeetup: "",
  };
  expect(
    (
      await context.request.patch("/api/account", { headers, data: details })
    ).status(),
  ).toBe(400);
  expect(
    (
      await context.request.patch("/api/account", {
        headers,
        data: { ...details, department: catalogue.departments[0].id },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await context.request.patch("/api/admin", {
        headers,
        data: { action: "listing", id: "missing", hide: true },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await context.request.get("/api/local-storage/images/no-image.webp")
    ).status(),
  ).toBe(404);
});
test("concurrent acceptance, edit protection, arrival, cancellation and moderation keep exchanges consistent", async ({
  context,
  browser,
}) => {
  const seller = await identity(context, "seller-regression");
  const buyerContext = await browser.newContext();
  const buyer = await identity(buyerContext, "buyer-regression");
  const adminContext = await browser.newContext();
  await identity(adminContext, "admin-regression", true);
  const { listing, point } = await fixture(seller.id);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setUTCHours(5, 0, 0, 0);
  const proposal = {
    message: "Interested in this test textbook",
    pointId: point.id,
    scheduledAt: tomorrow.toISOString(),
  };
  const first = await buyerContext.request.post(
    `/api/listings/${listing.id}/contact`,
    { headers, data: proposal },
  );
  expect(first.status()).toBe(200);
  const contact = await first.json();
  expect(contact.mailto).toContain("Interested%20in");
  const repeated = await buyerContext.request.post(
    `/api/listings/${listing.id}/contact`,
    { headers, data: proposal },
  );
  expect((await repeated.json()).exchangeId).toBe(contact.exchangeId);
  const url = `/api/exchanges/${contact.exchangeId}`;
  const concurrent = await Promise.all([
    context.request.patch(url, { headers, data: { action: "accept" } }),
    context.request.patch(url, { headers, data: { action: "accept" } }),
  ]);
  expect(concurrent.map((r) => r.status()).sort()).toEqual([200, 409]);
  const edit = {
    title: listing.title,
    description: listing.description,
    categoryId: listing.categoryId,
    condition: "GOOD",
    priceNtd: 900,
    isFree: false,
    openToTrade: false,
    campuses: ["JIEREN"],
    meetupLocation: point.id,
    imageIds: listing.images.map((i) => i.id),
  };
  expect(
    (
      await context.request.patch(`/api/listings/${listing.id}`, {
        headers,
        data: edit,
      })
    ).status(),
  ).toBe(409);
  for (const participant of [context, buyerContext])
    expect(
      (
        await participant.request.patch(url, {
          headers,
          data: { action: "arrive" },
        })
      ).status(),
    ).toBe(200);
  const arrived = await db.exchange.findUniqueOrThrow({
    where: { id: contact.exchangeId },
  });
  expect(arrived.buyerArrivedAt).not.toBeNull();
  expect(arrived.sellerArrivedAt).not.toBeNull();
  expect(
    (
      await adminContext.request.patch("/api/admin", {
        headers,
        data: { action: "user", id: buyer.id, suspend: true },
      })
    ).status(),
  ).toBe(200);
  expect(
    (await db.exchange.findUniqueOrThrow({ where: { id: contact.exchangeId } }))
      .status,
  ).toBe("CANCELLED");
  expect(
    (await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).status,
  ).toBe("AVAILABLE");
  expect(
    (
      await buyerContext.request.post(`/api/listings/${listing.id}/save`, {
        headers,
        data: { saved: true },
      })
    ).status(),
  ).toBe(403);
  await adminContext.request.patch("/api/admin", {
    headers,
    data: { action: "user", id: buyer.id, suspend: false },
  });
  const fresh = await buyerContext.request.post(
    `/api/listings/${listing.id}/contact`,
    { headers, data: proposal },
  );
  const next = (await fresh.json()).exchangeId;
  await context.request.patch(`/api/exchanges/${next}`, {
    headers,
    data: { action: "accept" },
  });
  await buyerContext.request.patch(`/api/exchanges/${next}`, {
    headers,
    data: { action: "cancel" },
  });
  expect(
    (await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).status,
  ).toBe("AVAILABLE");
  const last = await buyerContext.request.post(
    `/api/listings/${listing.id}/contact`,
    { headers, data: proposal },
  );
  await context.request.patch(
    `/api/exchanges/${(await last.json()).exchangeId}`,
    { headers, data: { action: "accept" } },
  );
  await adminContext.request.patch("/api/admin", {
    headers,
    data: { action: "listing", id: listing.id, hide: true },
  });
  expect(
    await db.exchange.count({
      where: { listingId: listing.id, status: "ACCEPTED" },
    }),
  ).toBe(0);
  await adminContext.request.patch("/api/admin", {
    headers,
    data: { action: "listing", id: listing.id, hide: false },
  });
  expect(
    (await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).status,
  ).toBe("AVAILABLE");
  expect(
    (
      await adminContext.request.patch("/api/admin", {
        headers,
        data: { action: "listing", id: "nonexistent", hide: true },
      })
    ).status(),
  ).toBe(404);
  const pending = await buyerContext.request.post(
    `/api/listings/${listing.id}/contact`,
    { headers, data: proposal },
  );
  await context.request.patch(`/api/listings/${listing.id}`, {
    headers,
    data: { status: "SOLD" },
  });
  expect(
    (
      await db.exchange.findUniqueOrThrow({
        where: { id: (await pending.json()).exchangeId },
      })
    ).status,
  ).toBe("CANCELLED");
  await buyerContext.close();
  await adminContext.close();
});
test("expired proposals and deleted listings cannot be exchanged", async ({
  context,
  browser,
}) => {
  const seller = await identity(context, "expired-seller");
  const other = await browser.newContext();
  const buyer = await identity(other, "expired-buyer");
  const { listing, point } = await fixture(seller.id);
  const exchange = await db.exchange.create({
    data: {
      sellerId: seller.id,
      buyerId: buyer.id,
      listingId: listing.id,
      pointId: point.id,
      scheduledAt: new Date(Date.now() - 1000),
    },
  });
  expect(
    (
      await context.request.patch(`/api/exchanges/${exchange.id}`, {
        headers,
        data: { action: "accept" },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await context.request.delete(`/api/listings/${listing.id}`, { headers })
    ).status(),
  ).toBe(200);
  expect(
    (await db.exchange.findUniqueOrThrow({ where: { id: exchange.id } }))
      .status,
  ).toBe("CANCELLED");
  expect(
    (
      await other.request.post(`/api/listings/${listing.id}/save`, {
        headers,
        data: { saved: true },
      })
    ).status(),
  ).toBe(404);
  await other.close();
});
