import { z } from "zod";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/session";
import { visibleListings } from "@/lib/browse";
import { assertSameOrigin, apiError } from "@/lib/api";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireStudent();
    const { id } = await params;
    const { saved } = z
      .object({ saved: z.boolean() })
      .parse(await request.json());
    if (
      !(await db.listing.findFirst({
        where: { AND: [visibleListings(), { id }] },
      }))
    )
      throw new Error("NOT_FOUND");
    if (saved)
      await db.savedListing.upsert({
        where: { userId_listingId: { userId: user.id, listingId: id } },
        create: { userId: user.id, listingId: id },
        update: {},
      });
    else
      await db.savedListing.deleteMany({
        where: { userId: user.id, listingId: id },
      });
    return Response.json({ saved });
  } catch (error) {
    return apiError(error);
  }
}
