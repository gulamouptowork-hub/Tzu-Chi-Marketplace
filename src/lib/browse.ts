import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStudentPage as requireStudent } from "@/lib/session";
// Empty price fields mean "no bound", so the filter form can leave them blank.
const priceBound = (fallback: number) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().min(0).max(1000000).default(fallback),
  );
export const searchSchema = z.object({
  q: z.string().trim().max(100).default(""),
  category: z.string().max(100).default(""),
  campus: z.enum(["", "JIEREN", "JIANGUO", "CENTRAL"]).default(""),
  condition: z.enum(["", "NEW", "LIKE_NEW", "GOOD", "FAIR"]).default(""),
  status: z.enum(["", "AVAILABLE", "RESERVED", "SOLD"]).default(""),
  free: z.enum(["", "1"]).default(""),
  min: priceBound(0),
  max: priceBound(1000000),
  sort: z.enum(["newest", "low", "high"]).default("newest"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export function visibleListings(): Prisma.ListingWhereInput {
  return {
    hiddenAt: null,
    seller: { deletedAt: null, suspendedAt: null },
    OR: [
      { status: { not: "SOLD" } },
      { status: "SOLD", soldAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    ],
  };
}
export async function browse(input: Record<string, string | undefined>) {
  const user = await requireStudent();
  const parsed = searchSchema.safeParse(input);
  const filters = parsed.success ? parsed.data : searchSchema.parse({});
  let matchingIds: string[] | undefined;
  if (filters.q) {
    const rows = await db.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "Listing" WHERE to_tsvector('simple', title || ' ' || description) @@ plainto_tsquery('simple', ${filters.q}) OR strpos(lower(title || ' ' || description), lower(${filters.q})) > 0`;
    matchingIds = rows.map((row) => row.id);
  }
  const where: Prisma.ListingWhereInput = {
    AND: [
      visibleListings(),
      {
        ...(matchingIds ? { id: { in: matchingIds } } : {}),
        ...(filters.category ? { category: { slug: filters.category } } : {}),
        ...(filters.campus ? { campuses: { has: filters.campus } } : {}),
        ...(filters.condition ? { condition: filters.condition } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.free ? { isFree: true } : {}),
        ...(filters.min > 0 || filters.max < 1000000
          ? {
              OR: [
                { priceNtd: { gte: filters.min, lte: filters.max } },
                ...(filters.min === 0 ? [{ isFree: true }] : []),
              ],
            }
          : {}),
      },
    ],
  };
  const [listings, total] = await Promise.all([
    db.listing.findMany({
      where,
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        category: true,
        saved: { where: { userId: user.id }, select: { listingId: true } },
      },
      orderBy:
        filters.sort === "newest"
          ? [{ createdAt: "desc" }, { id: "desc" }]
          : [
              { isFree: filters.sort === "low" ? "desc" : "asc" },
              {
                priceNtd: {
                  sort: filters.sort === "low" ? "asc" : "desc",
                  nulls: "last",
                },
              },
              { createdAt: "desc" },
              { id: "desc" },
            ],
      skip: (filters.page - 1) * 24,
      take: 24,
    }),
    db.listing.count({ where }),
  ]);
  return { listings, total, filters };
}
