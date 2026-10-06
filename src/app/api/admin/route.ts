import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { assertSameOrigin, apiError } from "@/lib/api";
import { cancelActiveExchanges } from "@/lib/cancel-exchanges";
import { getAdminData } from "@/lib/admin-data";
import { adminQuerySchema } from "@/lib/admin-query";
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("listing"),
    id: z.string().min(1),
    hide: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("user"),
    id: z.string().min(1),
    suspend: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("report"),
    id: z.string().min(1),
    reason: z.string().trim().max(500).optional(),
  }),
]);
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const query = adminQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await getAdminData(query), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const data = schema.parse(await request.json());
    await db.$transaction(async (tx) => {
      if (data.action === "listing") {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.id}))`;
        const target = await tx.listing.findUnique({ where: { id: data.id } });
        if (!target) throw new Error("NOT_FOUND");
        if (!!target.hiddenAt === data.hide) return;
        await tx.listing.update({
          where: { id: data.id },
          data: { hiddenAt: data.hide ? new Date() : null },
        });
        if (data.hide) await cancelActiveExchanges(tx, { listingId: data.id });
        await tx.adminAuditLog.create({
          data: {
            actorId: admin.id,
            action: data.hide ? "LISTING_HIDDEN" : "LISTING_RESTORED",
            targetType: "listing",
            targetId: data.id,
            targetLabel: target.title,
            reason: data.reason,
            before: { hidden: !!target.hiddenAt },
            after: { hidden: data.hide },
          },
        });
      }
      if (data.action === "user") {
        if (data.id === admin.id) throw new Error("FORBIDDEN");
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"user:" + data.id}))`;
        const target = await tx.user.findUnique({ where: { id: data.id } });
        if (!target) throw new Error("NOT_FOUND");
        if (target.role === "ADMIN" || target.deletedAt)
          throw new Error("FORBIDDEN");
        if (!!target.suspendedAt === data.suspend) return;
        await tx.user.update({
          where: { id: data.id },
          data: { suspendedAt: data.suspend ? new Date() : null },
        });
        if (data.suspend)
          await cancelActiveExchanges(tx, {
            OR: [{ buyerId: data.id }, { sellerId: data.id }],
          });
        await tx.adminAuditLog.create({
          data: {
            actorId: admin.id,
            action: data.suspend ? "USER_SUSPENDED" : "USER_RESTORED",
            targetType: "user",
            targetId: data.id,
            targetLabel: target.email,
            reason: data.reason,
            before: { suspended: !!target.suspendedAt },
            after: { suspended: data.suspend },
          },
        });
      }
      if (data.action === "report") {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"report:" + data.id}))`;
        const target = await tx.report.findUnique({
          where: { id: data.id },
          include: { listing: { select: { title: true } } },
        });
        if (!target) throw new Error("NOT_FOUND");
        if (target.status === "RESOLVED") return;
        await tx.report.update({
          where: { id: data.id },
          data: {
            status: "RESOLVED",
            resolvedAt: new Date(),
            resolvedById: admin.id,
          },
        });
        await tx.adminAuditLog.create({
          data: {
            actorId: admin.id,
            action: "REPORT_RESOLVED",
            targetType: "report",
            targetId: data.id,
            targetLabel: target.listing.title,
            reason: data.reason,
            before: { status: target.status },
            after: { status: "RESOLVED" },
          },
        });
      }
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
