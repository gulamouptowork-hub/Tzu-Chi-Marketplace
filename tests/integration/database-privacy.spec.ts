import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient({
  datasourceUrl:
    "postgresql://marketplace:test-only@localhost:55432/marketplace_test",
});
test.afterAll(() => db.$disconnect());
test("application tables deny records to non-owner database roles", async () => {
  const tables = await db.$queryRaw<
    { relname: string; relrowsecurity: boolean }[]
  >`
    SELECT relname, relrowsecurity FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  `;
  expect(tables).toHaveLength(16);
  expect(tables.every((table) => table.relrowsecurity)).toBe(true);
  expect(await db.user.count()).toBeGreaterThan(0);
  await db.$executeRawUnsafe(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'marketplace_browser_qa') THEN
      CREATE ROLE marketplace_browser_qa NOLOGIN;
    END IF;
  END $$`);
  await db.$executeRawUnsafe(
    "GRANT USAGE ON SCHEMA public TO marketplace_browser_qa",
  );
  await db.$executeRawUnsafe(
    "GRANT SELECT ON ALL TABLES IN SCHEMA public TO marketplace_browser_qa",
  );
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL ROLE marketplace_browser_qa");
    for (const table of [
      "User",
      "Account",
      "Listing",
      "Report",
      "AdminAuditLog",
    ]) {
      const result = await tx.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT count(*) FROM "${table}"`,
      );
      expect(Number(result[0].count)).toBe(0);
    }
  });
  expect(await db.user.count()).toBeGreaterThan(0);
});
