import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
const db = new PrismaClient({
  datasourceUrl:
    "postgresql://marketplace:test-only@localhost:55432/marketplace_test",
});
test.afterAll(() => db.$disconnect());
test("free listings remain in zero-based price filters, sort first and expired sold listings disappear", async ({
  page,
  context,
}) => {
  const user = await db.user.create({
    data: {
      email: `search.${Date.now()}@gms.tcu.edu.tw`,
      displayName: "Search fixture",
      rulesAcceptedAt: new Date(),
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
    },
  ]);
  const category = await db.category.findFirstOrThrow();
  const base = {
    sellerId: user.id,
    categoryId: category.id,
    description: "A search regression fixture.",
    condition: "GOOD" as const,
    meetupLocation: "jieren-library",
    campuses: ["JIEREN"],
  };
  const title = `Filter QA ${Date.now()}`;
  await db.listing.create({
    data: { ...base, title: title + " free", isFree: true, priceNtd: null },
  });
  await db.listing.create({
    data: { ...base, title: title + " paid", priceNtd: 100 },
  });
  await db.listing.create({
    data: {
      ...base,
      title: title + " expired",
      priceNtd: 50,
      status: "SOLD",
      soldAt: new Date(Date.now() - 8 * 86400000),
    },
  });
  await page.goto(
    "/marketplace?q=" + encodeURIComponent(title) + "&max=200&sort=low",
  );
  const cards = page.locator("article h2");
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toHaveText(title + " free");
  await page.goto(
    "/marketplace?q=" + encodeURIComponent(title) + "&max=200&free=1",
  );
  await expect(page.locator("article h2")).toHaveCount(1);
  await expect(page.locator("article h2")).toHaveText(title + " free");
  await context.addCookies([
    { name: "locale", value: "en", domain: "localhost", path: "/" },
  ]);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/marketplace?q=" + encodeURIComponent(title));
    await expect(page.locator("aside")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Filters (0)", exact: true })
      .click();
    const drawer = page.getByRole("dialog", { name: "Search and filters" });
    await expect(drawer).toBeVisible();
    await drawer
      .getByLabel("Exchange campus", { exact: true })
      .selectOption("JIEREN");
    await drawer.getByLabel("Condition", { exact: true }).selectOption("GOOD");
    await drawer
      .getByRole("button", { name: "Apply filters", exact: true })
      .click();
    await expect(page).toHaveURL(/campus=JIEREN/);
    await expect(page).toHaveURL(/condition=GOOD/);
    await expect(
      page.getByRole("button", { name: "Filters (2)", exact: true }),
    ).toBeVisible();
    await expect(page.locator("article h2")).toHaveCount(2);
    expect(new URL(page.url()).searchParams.get("q")).toBe(title);
    await page
      .getByRole("button", { name: "Filters (2)", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Filters (2)", exact: true }),
    ).toBeFocused();
  }
});
