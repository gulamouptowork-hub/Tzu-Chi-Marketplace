import { test, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient({
  datasourceUrl:
    "postgresql://marketplace:test-only@localhost:55432/marketplace_test",
});
test.afterAll(() => db.$disconnect());
test("removed photos are excluded from publication and edits, with at least one photo required", async ({
  page,
  context,
}) => {
  const user = await db.user.create({
    data: {
      email: `photos.qa.${Date.now()}@gms.tcu.edu.tw`,
      displayName: "Photo verification",
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
      httpOnly: true,
    },
    { name: "locale", value: "en", domain: "localhost", path: "/" },
  ]);
  const title = "Photo removal QA " + Date.now();
  await page.goto("/listings/new");
  await page.getByLabel("Item title", { exact: true }).fill(title);
  await page
    .getByLabel("Description", { exact: true })
    .fill("Verify selected and saved photo removal.");
  await page.getByRole("spinbutton", { name: "Price (NT$)" }).fill("150");
  const photos = page.getByLabel("Photos", { exact: true });
  await photos.setInputFiles(["public/demo/1.webp", "public/demo/2.webp"]);
  await expect(page.getByRole("button", { name: /^Remove photo/ })).toHaveCount(
    2,
  );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: `artifacts/photo-removal-${width}.png`,
      fullPage: true,
      caret: "initial",
    });
  }
  await page
    .getByRole("button", { name: "Remove photo 1", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /^Remove photo/ })).toHaveCount(
    1,
  );
  await page
    .getByRole("button", { name: "Publish listing", exact: true })
    .click();
  await page.waitForURL((url) =>
    /^\/listings\/(?!new$)[^/]+$/.test(url.pathname),
  );
  const id = page.url().split("/").pop()!;
  const original = await db.listingImage.findMany({ where: { listingId: id } });
  expect(original).toHaveLength(1);
  expect(
    await db.upload.count({
      where: { userId: user.id, completedAt: { not: null } },
    }),
  ).toBe(1);

  await page.goto(`/listings/${id}/edit`);
  await photos.setInputFiles(["public/demo/1.webp", "public/demo/3.webp"]);
  await expect(page.getByRole("button", { name: /^Remove photo/ })).toHaveCount(
    3,
  );
  await page
    .getByRole("button", { name: "Remove photo 2", exact: true })
    .click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page).toHaveURL(`/listings/${id}`);
  const combined = await db.listingImage.findMany({
    where: { listingId: id },
    orderBy: { position: "asc" },
  });
  expect(combined).toHaveLength(2);
  expect(combined[0].url).toBe(original[0].url);

  await page.goto(`/listings/${id}/edit`);
  await page
    .getByRole("button", { name: "Remove photo 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page).toHaveURL(`/listings/${id}`);
  const remaining = await db.listingImage.findMany({
    where: { listingId: id },
  });
  expect(remaining).toHaveLength(1);
  expect(remaining[0].url).toBe(combined[1].url);

  await page.goto(`/listings/${id}/edit`);
  await page
    .getByRole("button", { name: "Remove photo 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Choose 1–6" }),
  ).toBeVisible();
  await expect(page).toHaveURL(`/listings/${id}/edit`);
  expect(await db.listingImage.count({ where: { listingId: id } })).toBe(1);

  // Selecting the same file after removing it must trigger selection again.
  await photos.setInputFiles("public/demo/1.webp");
  await page
    .getByRole("button", { name: "Remove photo 1", exact: true })
    .click();
  await photos.setInputFiles("public/demo/1.webp");
  await expect(page.getByRole("button", { name: /^Remove photo/ })).toHaveCount(
    1,
  );
  await photos.setInputFiles(Array(6).fill("public/demo/2.webp"));
  await expect(
    page.getByRole("alert").filter({ hasText: "Choose 1–6" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Remove photo/ })).toHaveCount(
    1,
  );
});
