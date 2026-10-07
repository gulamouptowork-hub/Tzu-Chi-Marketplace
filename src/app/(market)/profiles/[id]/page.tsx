import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { PackageOpen } from "lucide-react";
import { db } from "@/lib/db";
import { visibleListings } from "@/lib/browse";
import { ListingCard } from "@/components/listing-card";
import { requireStudentPage as requireStudent } from "@/lib/session";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
export default async function Profile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await requireStudent();
  const l = await getTranslations("Listing");
  const f = await getTranslations("Feed");
  const format = await getFormatter();
  const user = await db.user.findFirst({
    where: { id, deletedAt: null, suspendedAt: null },
    select: { displayName: true, department: true, createdAt: true },
  });
  if (!user) notFound();
  const listings = await db.listing.findMany({
    where: {
      AND: [
        visibleListings(),
        { sellerId: id, status: { in: ["AVAILABLE", "RESERVED"] } },
      ],
    },
    include: {
      images: { take: 1, orderBy: { position: "asc" } },
      saved: {
        where: { userId: currentUser.id },
        select: { listingId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <section className="card overflow-hidden">
        <div className="relative h-28 bg-primary-dark sm:h-32">
          <div
            aria-hidden="true"
            className="absolute -right-10 -top-16 size-56 rounded-full bg-white/10"
          />
        </div>
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <Avatar
            name={user.displayName}
            size="xl"
            className="-mt-10 ring-4 ring-surface"
          />
          <div className="min-w-0 sm:pb-1">
            <h1 className="text-2xl font-semibold">{user.displayName}</h1>
            <p className="text-muted">{user.department}</p>
          </div>
          <div className="text-sm text-muted sm:ml-auto sm:pb-1 sm:text-right">
            <p className="font-semibold text-foreground">
              {f("results", { count: listings.length })}
            </p>
            <p>
              {l("memberSince")}{" "}
              {format.dateTime(user.createdAt, {
                year: "numeric",
                month: "short",
              })}
            </p>
          </div>
        </div>
      </section>
      <div className="mt-8">
        {listings.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing, index) => (
              <ListingCard
                listing={listing}
                key={listing.id}
                eager={index < 4}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={PackageOpen} title={l("empty")} />
        )}
      </div>
    </>
  );
}
