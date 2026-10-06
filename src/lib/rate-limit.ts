import { db } from "@/lib/db";
export async function rateLimit(
  userId: string,
  action: string,
  maximum: number,
  hours = 24,
) {
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId + ":" + action}))`;
    const count = await tx.rateLimitEvent.count({
      where: {
        userId,
        action,
        createdAt: { gte: new Date(Date.now() - hours * 3600000) },
      },
    });
    if (count >= maximum) throw new Error("RATE_LIMIT");
    await tx.rateLimitEvent.create({ data: { userId, action } });
  });
}
