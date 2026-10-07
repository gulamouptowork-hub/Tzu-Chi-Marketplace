import { z } from "zod";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/session";
import { assertSameOrigin, apiError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { visibleListings } from "@/lib/browse";
import { sendContactEmail } from "@/lib/contact-email";
import { exchangeTimeError } from "@/lib/exchange-time";
const schema = z.object({
  message: z.string().trim().min(1).max(2000),
  pointId: z.string().min(1),
  scheduledAt: z.iso.datetime(),
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const buyer = await requireStudent();
    const data = schema.parse(await request.json());
    const { id } = await params;
    const listing = await db.listing.findFirst({
      where: { AND: [visibleListings(), { id, status: "AVAILABLE" }] },
      include: { seller: true },
    });
    if (!listing) throw new Error("NOT_FOUND");
    if (listing.sellerId === buyer.id) throw new Error("FORBIDDEN");
    const point = await db.exchangePoint.findFirst({
      where: {
        id: data.pointId,
        active: true,
        campus: { in: listing.campuses },
      },
    });
    const scheduledAt = new Date(data.scheduledAt);
    if (!point) throw new Error("VALIDATION");
    const timeError = exchangeTimeError(scheduledAt);
    if (timeError) throw new Error(timeError);
    const duplicate = {
      listingId: id,
      buyerId: buyer.id,
      pointId: point.id,
      scheduledAt,
      status: "PROPOSED",
    } as const;
    // Re-sending an identical proposal reuses it without spending the daily limit.
    if (!(await db.exchange.findFirst({ where: duplicate })))
      await rateLimit(buyer.id, "contact", 20);
    const exchange = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const current = await tx.listing.findFirst({
        where: { AND: [visibleListings(), { id, status: "AVAILABLE" }] },
      });
      if (!current || !current.campuses.includes(point.campus))
        throw new Error("CONFLICT");
      const existing = await tx.exchange.findFirst({ where: duplicate });
      if (existing) return existing;
      await tx.contactEvent.create({
        data: { listingId: id, buyerId: buyer.id },
      });
      return tx.exchange.create({
        data: {
          listingId: id,
          buyerId: buyer.id,
          sellerId: listing.sellerId,
          pointId: point.id,
          scheduledAt,
        },
      });
    });
    const listingUrl = new URL(
      "/listings/" + id,
      process.env.AUTH_URL ?? request.url,
    ).toString();
    const subject = "[Campus Marketplace] Interested in: " + listing.title;
    const body =
      data.message +
      "\n\n" +
      point.campus +
      " — " +
      point.nameZh +
      "\n" +
      scheduledAt.toLocaleString("en-GB", { timeZone: "Asia/Taipei" }) +
      " (Asia/Taipei)\n" +
      listingUrl;
    if (
      await sendContactEmail({
        to: listing.seller.email,
        replyTo: buyer.email,
        subject,
        body,
      })
    )
      return Response.json({ exchangeId: exchange.id, sent: true });
    return Response.json({
      exchangeId: exchange.id,
      sent: false,
      mailto:
        "mailto:" +
        encodeURIComponent(listing.seller.email) +
        "?" +
        "subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body),
    });
  } catch (error) {
    return apiError(error);
  }
}
