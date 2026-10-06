import { test, expect } from "@playwright/test";
test("private feed requires school sign-in", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(
    page.getByRole("button", { name: /Google Workspace/ }),
  ).toBeVisible();
});
test("rules are public and explain prohibited items and payment policy", async ({
  page,
}) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "社群規範",
  );
  await expect(page.getByText(/本平台不處理付款/)).toBeVisible();
});
test("language preference changes sign-in text", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Continue with Google Workspace" }),
  ).toBeVisible();
});
