import { Prisma } from "@prisma/client";

export async function cancelActiveExchanges(
  tx: Prisma.TransactionClient,
  where: Prisma.ExchangeWhereInput,
) {
  const activeWhere: Prisma.ExchangeWhereInput = {
    AND: [where, { status: { in: ["PROPOSED", "ACCEPTED"] } }],
  };
  const active = await tx.exchange.findMany({
    where: activeWhere,
    orderBy: { listingId: "asc" },
  });
  for (const listingId of [...new Set(active.map((e) => e.listingId))])
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${listingId}))`;
  const accepted = await tx.exchange.findMany({
    where: { AND: [where, { status: "ACCEPTED" }] },
  });
  await tx.listing.updateMany({
    where: { id: { in: accepted.map((e) => e.listingId) }, status: "RESERVED" },
    data: { status: "AVAILABLE" },
  });
  await tx.exchange.updateMany({
    where: activeWhere,
    data: { status: "CANCELLED" },
  });
}
