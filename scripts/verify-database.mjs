import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is required. Load the intended environment file explicitly.",
  );
  process.exit(1);
}
const db = new PrismaClient();
try {
  await db.$queryRaw`SELECT 1`;
  const migrations = await db.$queryRaw`
    SELECT count(*)::int AS count FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
  `;
  const tables = await db.$queryRaw`
    SELECT c.relname, c.relrowsecurity FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND c.relname IN ('User', 'Account', 'Session', 'VerificationToken',
        'Category', 'Listing', 'ListingImage', 'SavedListing', 'Report',
        'ContactEvent', 'ExchangePoint', 'Exchange', 'Upload', 'RateLimitEvent',
        'AdminAuditLog', '_prisma_migrations')
  `;
  if (tables.length !== 16 || tables.some((table) => !table.relrowsecurity))
    throw new Error("DATABASE_SCHEMA_PRIVACY");
  const [categories, points, admins] = await Promise.all([
    db.category.count(),
    db.exchangePoint.count({ where: { active: true } }),
    db.user.count({
      where: { role: "ADMIN", suspendedAt: null, deletedAt: null },
    }),
  ]);
  if (!categories || !points || !admins)
    throw new Error("DATABASE_INITIALIZATION_INCOMPLETE");
  console.log(
    JSON.stringify({
      connected: true,
      migrations: migrations[0].count,
      privateTables: tables.length,
      categories,
      exchangePoints: points,
      administratorConfigured: true,
    }),
  );
} catch (error) {
  // Connection strings, school email addresses and OAuth tokens never enter logs.
  const code =
    error.code ??
    (["DATABASE_SCHEMA_PRIVACY", "DATABASE_INITIALIZATION_INCOMPLETE"].includes(
      error.message,
    )
      ? error.message
      : "DATABASE_CONNECTION_FAILED");
  console.error("Database verification failed:", code);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
