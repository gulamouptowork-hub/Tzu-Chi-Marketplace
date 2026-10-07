import { z } from "zod";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/session";
import { assertSameOrigin, apiError } from "@/lib/api";
import { listingSchema } from "@/lib/listing-validation";
import { cancelActiveExchanges } from "@/lib/cancel-exchanges";
const edit = z.union([
  z.object({ status: z.enum(["AVAILABLE", "RESERVED", "SOLD"]) }).strict(),
  listingSchema,
]);
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireStudent();
    const { id } = await params;
    const data = edit.parse(await request.json());
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const listing = await tx.listing.findFirst({
        where: { id, sellerId: user.id, hiddenAt: null },
        include: { images: true },
      });
      if (!listing) throw new Error("NOT_FOUND");
      if (
        await tx.exchange.count({
          where: { listingId: id, status: "ACCEPTED" },
        })
      )
        throw new Error("CONFLICT");
      if ("status" in data) {
        await tx.listing.update({
          where: { id },
          data: {
            status: data.status,
            soldAt: data.status === "SOLD" ? new Date() : null,
          },
        });
        if (data.status !== "AVAILABLE")
          await tx.exchange.updateMany({
            where: { listingId: id, status: "PROPOSED" },
            data: { status: "CANCELLED" },
          });
        return;
      }
      const point = await tx.exchangePoint.findFirst({
        where: {
          id: data.meetupLocation,
          active: true,
          campus: { in: data.campuses },
        },
      });
      if (
        !point ||
        !(await tx.category.findUnique({ where: { id: data.categoryId } }))
      )
        throw new Error("VALIDATION");
      const uploads = await tx.upload.findMany({
        where: {
          id: { in: data.imageIds },
          userId: user.id,
          completedAt: { not: null },
          consumedAt: null,
        },
      });
      const images = data.imageIds.map((imageId, position) => {
        const old = listing.images.find((i) => i.id === imageId);
        const uploaded = uploads.find((u) => u.id === imageId);
        if (!old && !uploaded) throw new Error("VALIDATION");
        return {
          url: old?.url ?? uploaded!.url!,
          thumbUrl: old?.thumbUrl ?? uploaded!.thumbUrl!,
          alt: data.title,
          position,
        };
      });
      const { imageIds, ...fields } = data;
      await tx.listingImage.deleteMany({ where: { listingId: id } });
      await tx.listing.update({
        where: { id },
        data: { ...fields, images: { create: images } },
      });
      // Claim new uploads conditionally so a concurrent request cannot attach them too.
      const claimed = await tx.upload.updateMany({
        where: {
          id: { in: imageIds },
          userId: user.id,
          completedAt: { not: null },
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });
      if (claimed.count !== uploads.length) throw new Error("CONFLICT");
      await tx.exchange.updateMany({
        where: { listingId: id, status: "PROPOSED" },
        data: { status: "CANCELLED" },
      });
    });
    return Response.json({ ok: true, id });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireStudent();
    const { id } = await params;
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const result = await tx.listing.updateMany({
        where: { id, sellerId: user.id },
        data: { hiddenAt: new Date() },
      });
      if (!result.count) throw new Error("NOT_FOUND");
      await cancelActiveExchanges(tx, { listingId: id });
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
