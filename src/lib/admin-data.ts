import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ADMIN_PAGE_SIZE, type AdminQuery } from "@/lib/admin-query";
const person = { id: true, displayName: true, email: true } as const;
const insensitive = (contains: string) => ({
  contains,
  mode: "insensitive" as const,
});
const orderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];
export async function getAdminData(query: AdminQuery) {
  await requireAdmin();
  const { tab, q, status, page, period } = query;
  const paging = { skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE };
  const base = { page, pageSize: ADMIN_PAGE_SIZE };
  if (tab === "users") {
    const where: Prisma.UserWhereInput = {
      ...(q
        ? {
            OR: [
              { email: insensitive(q) },
              { displayName: insensitive(q) },
              { department: insensitive(q) },
            ],
          }
        : {}),
      ...(status === "deleted"
        ? { deletedAt: { not: null } }
        : status === "suspended"
          ? { deletedAt: null, suspendedAt: { not: null } }
          : status === "onboarding"
            ? { deletedAt: null, suspendedAt: null, rulesAcceptedAt: null }
            : status === "active"
              ? {
                  deletedAt: null,
                  suspendedAt: null,
                  rulesAcceptedAt: { not: null },
                }
              : {}),
    };
    const [total, rows] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        ...paging,
        orderBy,
        select: {
          ...person,
          department: true,
          year: true,
          role: true,
          createdAt: true,
          suspendedAt: true,
          deletedAt: true,
          rulesAcceptedAt: true,
          _count: { select: { listings: true, purchases: true, sales: true } },
        },
      }),
    ]);
    return { tab: "users" as const, ...base, total, rows };
  }
  if (tab === "listings") {
    const where: Prisma.ListingWhereInput = {
      ...(q
        ? {
            OR: [
              { title: insensitive(q) },
              { seller: { email: insensitive(q) } },
              { seller: { displayName: insensitive(q) } },
              { category: { nameEn: insensitive(q) } },
              { category: { nameZh: insensitive(q) } },
            ],
          }
        : {}),
      ...(status === "hidden"
        ? { hiddenAt: { not: null } }
        : status === "AVAILABLE" || status === "RESERVED" || status === "SOLD"
          ? { status, hiddenAt: null }
          : {}),
    };
    const [total, rows] = await Promise.all([
      db.listing.count({ where }),
      db.listing.findMany({
        where,
        ...paging,
        orderBy,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          hiddenAt: true,
          createdAt: true,
          priceNtd: true,
          isFree: true,
          openToTrade: true,
          campuses: true,
          seller: { select: { ...person, suspendedAt: true, deletedAt: true } },
          category: { select: { nameEn: true, nameZh: true } },
          _count: {
            select: {
              saved: true,
              contacts: true,
              reports: true,
              exchanges: true,
            },
          },
        },
      }),
    ]);
    return { tab: "listings" as const, ...base, total, rows };
  }
  if (tab === "exchanges") {
    const where: Prisma.ExchangeWhereInput = {
      ...(q
        ? {
            OR: [
              { listing: { title: insensitive(q) } },
              { buyer: { email: insensitive(q) } },
              { seller: { email: insensitive(q) } },
              { buyer: { displayName: insensitive(q) } },
              { seller: { displayName: insensitive(q) } },
            ],
          }
        : {}),
      ...(status === "PROPOSED" ||
      status === "ACCEPTED" ||
      status === "COMPLETED" ||
      status === "CANCELLED"
        ? { status }
        : {}),
    };
    const [total, rows] = await Promise.all([
      db.exchange.count({ where }),
      db.exchange.findMany({
        where,
        ...paging,
        orderBy,
        select: {
          id: true,
          status: true,
          createdAt: true,
          scheduledAt: true,
          buyerArrivedAt: true,
          sellerArrivedAt: true,
          buyerCompletedAt: true,
          sellerCompletedAt: true,
          listing: { select: { id: true, title: true } },
          buyer: { select: person },
          seller: { select: person },
          point: { select: { nameZh: true, nameEn: true, campus: true } },
        },
      }),
    ]);
    return { tab: "exchanges" as const, ...base, total, rows };
  }
  if (tab === "reports") {
    const where: Prisma.ReportWhereInput = {
      ...(q
        ? {
            OR: [
              { listing: { title: insensitive(q) } },
              { details: insensitive(q) },
              { reporter: { email: insensitive(q) } },
            ],
          }
        : {}),
      ...(status === "OPEN" || status === "RESOLVED" ? { status } : {}),
    };
    const [total, rows] = await Promise.all([
      db.report.count({ where }),
      db.report.findMany({
        where,
        ...paging,
        orderBy,
        select: {
          id: true,
          reason: true,
          details: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
          reporter: { select: person },
          resolvedBy: { select: person },
          listing: {
            select: {
              id: true,
              title: true,
              hiddenAt: true,
              seller: {
                select: {
                  ...person,
                  role: true,
                  suspendedAt: true,
                  deletedAt: true,
                },
              },
            },
          },
        },
      }),
    ]);
    return { tab: "reports" as const, ...base, total, rows };
  }
  if (tab === "activity") {
    const where: Prisma.AdminAuditLogWhereInput = q
      ? {
          OR: [
            { targetLabel: insensitive(q) },
            { actor: { email: insensitive(q) } },
            { reason: insensitive(q) },
          ],
        }
      : {};
    const [total, rows] = await Promise.all([
      db.adminAuditLog.count({ where }),
      db.adminAuditLog.findMany({
        where,
        ...paging,
        orderBy,
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          targetLabel: true,
          reason: true,
          before: true,
          after: true,
          createdAt: true,
          actor: { select: person },
        },
      }),
    ]);
    return { tab: "activity" as const, ...base, total, rows };
  }
  const DAY = 86400000;
  const OFFSET = 8 * 3600000;
  const today = Math.floor((Date.now() + OFFSET) / DAY) * DAY - OFFSET;
  const since = new Date(today - (period - 1) * DAY);
  const activeSeller = { deletedAt: null, suspendedAt: null };
  type Daily = { day: string; count: number };
  const [
    users,
    activeUsers,
    available,
    reserved,
    completed,
    openReports,
    newUsers,
    newListings,
    periodCompleted,
    userDays,
    listingDays,
    exchangeDays,
    categoryCounts,
    categories,
    recentActions,
  ] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.user.count({
      where: { ...activeSeller, rulesAcceptedAt: { not: null } },
    }),
    db.listing.count({
      where: { hiddenAt: null, status: "AVAILABLE", seller: activeSeller },
    }),
    db.listing.count({
      where: { hiddenAt: null, status: "RESERVED", seller: activeSeller },
    }),
    db.exchange.count({ where: { status: "COMPLETED" } }),
    db.report.count({ where: { status: "OPEN" } }),
    db.user.count({ where: { deletedAt: null, createdAt: { gte: since } } }),
    db.listing.count({ where: { createdAt: { gte: since } } }),
    db.exchange.count({
      where: { status: "COMPLETED", updatedAt: { gte: since } },
    }),
    db.$queryRaw<
      Daily[]
    >`SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei', 'YYYY-MM-DD') AS day, count(*)::int AS count FROM "User" WHERE "createdAt" >= (${since}::timestamptz AT TIME ZONE 'UTC') AND "deletedAt" IS NULL GROUP BY day`,
    db.$queryRaw<
      Daily[]
    >`SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei', 'YYYY-MM-DD') AS day, count(*)::int AS count FROM "Listing" WHERE "createdAt" >= (${since}::timestamptz AT TIME ZONE 'UTC') GROUP BY day`,
    db.$queryRaw<
      Daily[]
    >`SELECT to_char("updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei', 'YYYY-MM-DD') AS day, count(*)::int AS count FROM "Exchange" WHERE "updatedAt" >= (${since}::timestamptz AT TIME ZONE 'UTC') AND status = 'COMPLETED' GROUP BY day`,
    db.listing.groupBy({
      by: ["categoryId"],
      where: { hiddenAt: null, seller: activeSeller },
      _count: { _all: true },
      orderBy: { _count: { categoryId: "desc" } },
    }),
    db.category.findMany({ select: { id: true, nameEn: true, nameZh: true } }),
    db.adminAuditLog.findMany({
      take: 5,
      orderBy,
      select: {
        id: true,
        action: true,
        targetLabel: true,
        createdAt: true,
        actor: { select: person },
      },
    }),
  ]);
  const series = Array.from({ length: period }, (_, index) => {
    const day = new Date(since.getTime() + index * DAY + OFFSET)
      .toISOString()
      .slice(0, 10);
    return {
      day,
      users: userDays.find((row) => row.day === day)?.count ?? 0,
      listings: listingDays.find((row) => row.day === day)?.count ?? 0,
      completed: exchangeDays.find((row) => row.day === day)?.count ?? 0,
    };
  });
  return {
    tab: "overview" as const,
    period,
    metrics: {
      users,
      activeUsers,
      available,
      reserved,
      completed,
      openReports,
      newUsers,
      newListings,
      periodCompleted,
    },
    series,
    categories: categoryCounts.map((row) => ({
      ...categories.find((category) => category.id === row.categoryId)!,
      count: row._count._all,
    })),
    recentActions,
  };
}
