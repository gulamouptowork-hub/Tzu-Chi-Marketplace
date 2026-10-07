import { db } from "@/lib/db";
import { requireStudent } from "@/lib/session";
import { assertSameOrigin, apiError } from "@/lib/api";
import { listingSchema } from "@/lib/listing-validation";
import { rateLimit } from "@/lib/rate-limit";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireStudent();
    const data = listingSchema.parse(await request.json());
    const point = await db.exchangePoint.findFirst({
      where: {
        id: data.meetupLocation,
        active: true,
        campus: { in: data.campuses },
      },
    });
    if (
      !point ||
      !(await db.category.findUnique({ where: { id: data.categoryId } }))
    )
      throw new Error("VALIDATION");
    // Count only requests that pass validation against the daily limit.
    await rateLimit(user.id, "create-listing", 10);
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id + ":listing"}))`;
      const uploads = await tx.upload.findMany({
        where: {
          id: { in: data.imageIds },
          userId: user.id,
          completedAt: { not: null },
          consumedAt: null,
        },
      });
      if (uploads.length !== data.imageIds.length)
        throw new Error("VALIDATION");
      const { imageIds, ...fields } = data;
      const listing = await tx.listing.create({
        data: {
          ...fields,
          sellerId: user.id,
          images: {
            create: imageIds.map((id, position) => {
              const image = uploads.find((u) => u.id === id)!;
              return {
                url: image.url!,
                thumbUrl: image.thumbUrl!,
                alt: data.title,
                position,
              };
            }),
          },
        },
      });
      // Claim uploads conditionally so a concurrent edit cannot attach them too.
      const claimed = await tx.upload.updateMany({
        where: { id: { in: imageIds }, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (claimed.count !== imageIds.length) throw new Error("CONFLICT");
      return listing;
    });
    return Response.json({ id: result.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
