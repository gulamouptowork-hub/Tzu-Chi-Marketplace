import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, getFormatter } from "next-intl/server";
import { ChevronLeft, MapPin, Pencil, ShieldCheck } from "lucide-react";
import { requireStudentPage as requireStudent } from "@/lib/session";
import { db } from "@/lib/db";
import { visibleListings } from "@/lib/browse";
import { PhotoGallery } from "@/components/photo-gallery";
import { ContactDialog } from "@/components/contact-dialog";
import { ListingCard } from "@/components/listing-card";
import { Button, cn } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, listingStatusTone } from "@/components/ui/badge";
import { ReportDialog } from "@/components/report-dialog";
import { SaveButton } from "@/components/save-button";
export default async function ListingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireStudent();
  const t = await getTranslations("Listing");
  const c = await getTranslations("ListingForm");
  const f = await getTranslations("Feed");
  const a = await getTranslations("App");
  const r = await getTranslations("Rules");
  const locale = await getLocale();
  const format = await getFormatter();
  const listing = await db.listing.findFirst({
    where: {
      id,
      hiddenAt: null,
      seller: { deletedAt: null, suspendedAt: null },
    },
    include: {
      images: { orderBy: { position: "asc" } },
      seller: {
        select: {
          id: true,
          displayName: true,
          department: true,
          createdAt: true,
        },
      },
    },
  });
  if (!listing) notFound();
  const own = listing.sellerId === user.id;
  const [points, other] = await Promise.all([
    db.exchangePoint.findMany({
      where: { campus: { in: listing.campuses }, active: true },
    }),
    db.listing.findMany({
      where: {
        AND: [
          visibleListings(),
          { sellerId: listing.sellerId, id: { not: id } },
        ],
      },
      include: {
        images: { take: 1, orderBy: { position: "asc" } },
        saved: { where: { userId: user.id }, select: { listingId: true } },
      },
      take: 3,
    }),
  ]);
  const saved = await db.savedListing.findUnique({
    where: { userId_listingId: { userId: user.id, listingId: id } },
  });
  const preferred = points.find((p) => p.id === listing.meetupLocation);
  return (
    <>
      <Link
        href="/marketplace"
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        {r("back")}
      </Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-8">
        <PhotoGallery images={listing.images} />
        <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="space-y-4 lg:sticky lg:top-24">
            <section className="card p-6">
              <div className="flex flex-wrap gap-2">
                <Badge tone={listingStatusTone[listing.status]}>
                  {t(listing.status)}
                </Badge>
                <Badge tone="gray">{t(listing.condition)}</Badge>
              </div>
              <h1 className="mt-4 text-2xl font-semibold leading-snug">
                {listing.title}
              </h1>
              <p
                className={cn(
                  "mt-3 text-3xl font-semibold",
                  listing.isFree ? "text-success" : "text-primary",
                )}
              >
                {listing.isFree
                  ? t("free")
                  : listing.openToTrade
                    ? t("trade")
                    : t("priceAmount", {
                        amount: format.number(listing.priceNtd ?? 0, {
                          maximumFractionDigits: 0,
                        }),
                      })}
              </p>
              {(listing.campuses.length > 0 || preferred) && (
                <div className="mt-5 space-y-2 rounded-xl bg-surface-muted p-4 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {listing.campuses.map((campus) => (
                      <Badge key={campus} tone="blue">
                        <MapPin size={16} strokeWidth={1.75} />
                        {c(campus)}
                      </Badge>
                    ))}
                  </div>
                  {preferred && (
                    <p className="text-muted">
                      {t("meetup")}:{" "}
                      <span className="font-medium text-foreground">
                        {locale === "en" ? preferred.nameEn : preferred.nameZh}
                      </span>
                    </p>
                  )}
                </div>
              )}
              <div className="mt-6 space-y-3">
                {own ? (
                  <Button asChild size="lg" className="w-full">
                    <Link href={"/listings/" + id + "/edit"}>
                      <Pencil size={20} strokeWidth={1.75} />
                      {t("edit")}
                    </Link>
                  </Button>
                ) : listing.status === "AVAILABLE" ? (
                  <ContactDialog
                    id={id}
                    title={listing.title}
                    points={points}
                    locale={locale}
                  />
                ) : null}
                {!own && (
                  <div className="flex flex-wrap items-center gap-2">
                    <SaveButton id={id} initial={!!saved} />
                    <ReportDialog id={id} />
                  </div>
                )}
              </div>
            </section>
            <section className="card flex items-center gap-4 p-5">
              <Avatar name={listing.seller.displayName} size="lg" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">{t("seller")}</p>
                <Link
                  href={"/profiles/" + listing.seller.id}
                  className="block truncate font-semibold text-foreground hover:text-primary"
                >
                  {listing.seller.displayName}
                </Link>
                <p className="truncate text-sm text-muted">
                  {listing.seller.department}
                </p>
                <p className="text-xs text-muted">
                  {t("memberSince")}{" "}
                  {format.dateTime(listing.seller.createdAt, {
                    year: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
            </section>
            <section className="flex gap-3 rounded-2xl border border-primary/15 bg-sky p-5">
              <ShieldCheck
                size={24}
                strokeWidth={1.75}
                className="shrink-0 text-primary"
              />
              <div className="text-sm">
                <p className="font-semibold text-foreground">{f("exchange")}</p>
                <p className="mt-1 text-muted">{f("exchangeBody")}</p>
                <Link
                  href="/about"
                  className="mt-2 inline-block font-medium text-primary hover:underline"
                >
                  {a("rules")}
                </Link>
              </div>
            </section>
          </div>
        </aside>
        <section className="card p-6 lg:col-start-1 lg:self-start">
          <h2 className="text-lg font-semibold">{t("description")}</h2>
          <p className="mt-3 whitespace-pre-wrap leading-relaxed text-muted">
            {listing.description}
          </p>
        </section>
      </div>
      {other.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 text-xl font-semibold">{t("other")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
            {other.map((item) => (
              <ListingCard listing={item} key={item.id} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
