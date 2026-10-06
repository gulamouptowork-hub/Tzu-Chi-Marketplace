import { z } from "zod";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/session";
import { assertSameOrigin, apiError } from "@/lib/api";
import catalogue from "../../../../messages/departments.json";
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireStudent();
    const data = z
      .object({
        displayName: z.string().trim().min(2).max(40),
        department: z.string().min(1),
        year: z.union([z.literal(""), z.coerce.number().int().min(1).max(8)]),
        preferredMeetup: z.enum(["", "JIEREN", "JIANGUO", "CENTRAL"]),
      })
      .parse(await request.json());
    const department = catalogue.departments.find(
      (d) => d.id === data.department,
    );
    if (!department) throw new Error("VALIDATION");
    await db.user.update({
      where: { id: user.id },
      data: {
        displayName: data.displayName,
        department: department.name,
        year: data.year === "" ? null : data.year,
        preferredMeetup: data.preferredMeetup || null,
      },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireStudent();
    await db.$transaction(async (tx) => {
      const related = await tx.exchange.findMany({
        where: {
          OR: [{ buyerId: user.id }, { sellerId: user.id }],
          status: { in: ["PROPOSED", "ACCEPTED"] },
        },
        orderBy: { listingId: "asc" },
      });
      for (const listingId of [...new Set(related.map((e) => e.listingId))])
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${listingId}))`;
      const accepted = await tx.exchange.findMany({
        where: { buyerId: user.id, status: "ACCEPTED" },
      });
      await tx.listing.updateMany({
        where: {
          id: { in: accepted.map((e) => e.listingId) },
          sellerId: { not: user.id },
          status: "RESERVED",
        },
        data: { status: "AVAILABLE" },
      });
      await tx.listing.updateMany({
        where: { sellerId: user.id },
        data: { hiddenAt: new Date() },
      });
      await tx.exchange.updateMany({
        where: {
          OR: [{ buyerId: user.id }, { sellerId: user.id }],
          status: { in: ["PROPOSED", "ACCEPTED"] },
        },
        data: { status: "CANCELLED" },
      });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.user.update({
        where: { id: user.id },
        data: { deletedAt: new Date() },
      });
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
