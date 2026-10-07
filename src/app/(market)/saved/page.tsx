import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Bookmark } from "lucide-react";
import { requireStudentPage as requireStudent } from "@/lib/session";
import { db } from "@/lib/db";
import { visibleListings } from "@/lib/browse";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
export default async function Saved() {
  const user = await requireStudent();
  const t = await getTranslations("App");
  const l = await getTranslations("Listing");
  const f = await getTranslations("Feed");
  const saved = await db.savedListing.findMany({
    where: { userId: user.id, listing: visibleListings() },
    include: {
      listing: {
        include: { images: { take: 1, orderBy: { position: "asc" } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHeader
        title={t("saved")}
        description={
          saved.length ? f("results", { count: saved.length }) : undefined
        }
      />
      {!saved.length ? (
        <EmptyState
          icon={Bookmark}
          title={l("empty")}
          body={l("emptyHint")}
          action={
            <Button asChild>
              <Link href="/marketplace">{t("home")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {saved.map((s, index) => (
            <ListingCard
              key={s.listingId}
              listing={s.listing}
              savedInitial
              eager={index < 4}
            />
          ))}
        </div>
      )}
    </>
  );
}
