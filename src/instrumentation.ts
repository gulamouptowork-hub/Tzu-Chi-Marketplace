export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production" &&
    process.env.DATABASE_URL
  ) {
    const { db } = await import("@/lib/db");
    try {
      await db.$connect();
    } catch {
      console.warn(
        "Database startup connection unavailable; check DATABASE_URL and service readiness.",
      );
    }
  }
}
