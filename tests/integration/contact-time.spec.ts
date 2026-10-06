import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import {
  taipeiDateTimeInput,
  parseTaipeiDateTime,
} from "../../src/lib/exchange-time";
const db = new PrismaClient({
  datasourceUrl:
    "postgresql://marketplace:test-only@localhost:55432/marketplace_test",
});
test.use({ timezoneId: "America/Los_Angeles" });
test.afterAll(() => db.$disconnect());
test("evening exchange times show a specific inline error; valid Taipei times create a proposal", async ({
  page,
  context,
}) => {
  const stamp = Date.now();
  const seller = await db.user.create({
    data: {
      email: `time.seller.${stamp}@gms.tcu.edu.tw`,
      displayName: "Time seller",
      rulesAcceptedAt: new Date(),
    },
  });
  const buyer = await db.user.create({
    data: {
      email: `time.buyer.${stamp}@gms.tcu.edu.tw`,
      displayName: "Time buyer",
      rulesAcceptedAt: new Date(),
    },
  });
  const category = await db.category.findFirstOrThrow();
  const point = await db.exchangePoint.findFirstOrThrow({
    where: { campus: "JIEREN", active: true },
  });
  const listing = await db.listing.create({
    data: {
      sellerId: seller.id,
      title: "Exchange time verification",
      description: "A fixture for checking daytime exchange times.",
      categoryId: category.id,
      condition: "GOOD",
      priceNtd: 150,
      campuses: ["JIEREN"],
      meetupLocation: point.id,
      images: {
        create: {
          url: "/demo/1.webp",
          thumbUrl: "/demo/1.webp",
          alt: "Test item",
          position: 0,
        },
      },
    },
  });
  const token = await encode({
    token: { sub: buyer.id },
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
  const tomorrow = taipeiDateTimeInput(new Date(Date.now() + 86400000)).slice(
    0,
    10,
  );
  for (const [value, expected] of [
    [tomorrow + "T22:07", "EXCHANGE_TIME_HOURS"],
    [tomorrow + "T19:00", "EXCHANGE_TIME_HOURS"],
    [
      taipeiDateTimeInput(new Date(Date.now() - 86400000)),
      "EXCHANGE_TIME_PAST",
    ],
    [
      taipeiDateTimeInput(new Date(Date.now() + 91 * 86400000)),
      "EXCHANGE_TIME_TOO_FAR",
    ],
  ]) {
    const response = await context.request.post(
      `/api/listings/${listing.id}/contact`,
      {
        headers: { Origin: "http://localhost:3001" },
        data: {
          pointId: point.id,
          message: "Interested in this item",
          scheduledAt: parseTaipeiDateTime(value)!.toISOString(),
        },
      },
    );
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ error: expected });
  }
  expect(await db.exchange.count({ where: { listingId: listing.id } })).toBe(0);
  expect(
    await db.rateLimitEvent.count({
      where: { userId: buyer.id, action: "contact" },
    }),
  ).toBe(0);
  let posts = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/contact"))
      posts++;
  });
  await page.goto(`/listings/${listing.id}`);
  await page
    .getByRole("button", { name: "Buy / Arrange Exchange", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const time = dialog.getByLabel("Date and time", { exact: true });
  await time.fill(tomorrow + "T22:07");
  await expect(dialog.getByRole("alert")).toContainText("08:00 and 18:59");
  await dialog
    .getByRole("button", { name: "Arrange exchange", exact: true })
    .click();
  expect(posts).toBe(0);
  await expect(time).toHaveAttribute("aria-invalid", "true");
  await time.fill(tomorrow + "T14:00");
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await page.route("**/api/listings/*/contact", (route) =>
    route.fulfill({ status: 429, json: { error: "RATE_LIMIT" } }),
  );
  await dialog
    .getByRole("button", { name: "Arrange exchange", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "exchange request limit",
  );
  await page.unroute("**/api/listings/*/contact");
  await dialog
    .getByRole("button", { name: "Arrange exchange", exact: true })
    .click();
  await expect(
    dialog.getByRole("link", { name: "Open email app" }),
  ).toHaveAttribute("href", /^mailto:/);
  const exchange = await db.exchange.findFirstOrThrow({
    where: { listingId: listing.id, buyerId: buyer.id },
  });
  expect(exchange.status).toBe("PROPOSED");
  expect(exchange.scheduledAt.toISOString()).toBe(tomorrow + "T06:00:00.000Z");
});
