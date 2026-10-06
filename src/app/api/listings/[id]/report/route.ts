import { z } from "zod";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/session";
import { assertSameOrigin, apiError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { visibleListings } from "@/lib/browse";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireStudent();
    const { id } = await params;
    const data = z
      .object({
        reason: z.enum(["PROHIBITED", "SCAM", "INAPPROPRIATE", "OTHER"]),
        details: z.string().trim().max(2000),
      })
      .parse(await request.json());
    const listing = await db.listing.findFirst({
      where: { AND: [{ id }, visibleListings()] },
      select: { sellerId: true },
    });
    if (!listing) throw new Error("NOT_FOUND");
    if (listing.sellerId === user.id) throw new Error("FORBIDDEN");
    await rateLimit(user.id, "report", 10);
    await db.report.create({
      data: { listingId: id, reporterId: user.id, ...data },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
