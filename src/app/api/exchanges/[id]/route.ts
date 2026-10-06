import { z } from "zod";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/session";
import { assertSameOrigin, apiError } from "@/lib/api";
import { nextExchangeStatus } from "@/lib/exchange-policy";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireStudent();
    const { id } = await params;
    const { action } = z
      .object({ action: z.enum(["accept", "arrive", "complete", "cancel"]) })
      .parse(await request.json());
    const result = await db.$transaction(async (tx) => {
      const initial = await tx.exchange.findUnique({ where: { id } });
      if (!initial) throw new Error("NOT_FOUND");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${initial.listingId}))`;
      const exchange = await tx.exchange.findUnique({
        where: { id },
        include: {
          listing: { include: { seller: true } },
          buyer: true,
          point: true,
        },
      });
      if (!exchange) throw new Error("NOT_FOUND");
      if (![exchange.buyerId, exchange.sellerId].includes(user.id))
        throw new Error("FORBIDDEN");
      if (
        exchange.listing.hiddenAt ||
        exchange.listing.seller.deletedAt ||
        exchange.listing.seller.suspendedAt ||
        exchange.buyer.suspendedAt ||
        exchange.buyer.deletedAt
      )
        throw new Error("FORBIDDEN");
      const isBuyer = user.id === exchange.buyerId;
      if (["CANCELLED", "COMPLETED"].includes(exchange.status))
        throw new Error("CONFLICT");
      if (action === "accept") {
        if (
          isBuyer ||
          exchange.status !== "PROPOSED" ||
          exchange.listing.status !== "AVAILABLE" ||
          exchange.scheduledAt <= new Date() ||
          !exchange.point.active ||
          !exchange.listing.campuses.includes(exchange.point.campus)
        )
          throw new Error("CONFLICT");
        await tx.listing.update({
          where: { id: exchange.listingId },
          data: { status: "RESERVED" },
        });
        await tx.exchange.updateMany({
          where: {
            listingId: exchange.listingId,
            id: { not: id },
            status: "PROPOSED",
          },
          data: { status: "CANCELLED" },
        });
        return tx.exchange.update({
          where: { id },
          data: { status: "ACCEPTED" },
        });
      }
      if (action === "cancel") {
        if (exchange.status === "ACCEPTED")
          await tx.listing.update({
            where: { id: exchange.listingId },
            data: { status: "AVAILABLE" },
          });
        return tx.exchange.update({
          where: { id },
          data: { status: "CANCELLED" },
        });
      }
      if (exchange.status !== "ACCEPTED") throw new Error("CONFLICT");
      if (action === "arrive")
        return tx.exchange.update({
          where: { id },
          data: isBuyer
            ? { buyerArrivedAt: new Date() }
            : { sellerArrivedAt: new Date() },
        });
      const status = nextExchangeStatus(
        isBuyer || !!exchange.buyerCompletedAt,
        !isBuyer || !!exchange.sellerCompletedAt,
      );
      if (status === "COMPLETED")
        await tx.listing.update({
          where: { id: exchange.listingId },
          data: { status: "SOLD", soldAt: new Date() },
        });
      return tx.exchange.update({
        where: { id },
        data: {
          status,
          ...(isBuyer
            ? { buyerCompletedAt: new Date() }
            : { sellerCompletedAt: new Date() }),
        },
      });
    });
    return Response.json({ status: result.status });
  } catch (error) {
    return apiError(error);
  }
}
