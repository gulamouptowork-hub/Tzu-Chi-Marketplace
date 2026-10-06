import { SaveButton } from "@/components/save-button";
import Image from "next/image";
import Link from "next/link";
import { Clock, ImageOff, Pencil, ShoppingBag } from "lucide-react";
import { getTranslations, getFormatter, getLocale } from "next-intl/server";
import { Badge, listingStatusTone } from "@/components/ui/badge";
import { Button, cn } from "@/components/ui/button";
import { ContactDialog } from "@/components/contact-dialog";
import { ReportDialog } from "@/components/report-dialog";
import { activeExchangePoints } from "@/lib/exchange-points";
import { requireStudentPage as requireStudent } from "@/lib/session";
type Listing = {
  id: string;
  sellerId?: string;
  title: string;
  priceNtd: number | null;
  isFree: boolean;
  openToTrade: boolean;
  condition: string;
  status: string;
  createdAt: Date;
  campuses: string[];
  meetupLocation?: string;
  images: { url: string; thumbUrl: string; alt: string }[];
  saved?: unknown[];
};
export async function ListingCard({
  listing,
  eager = false,
  savedInitial,
}: {
  listing: Listing;
  eager?: boolean;
  savedInitial?: boolean;
}) {
  const saved = savedInitial ?? Boolean(listing.saved?.length);
  // Cached per request, so cards do not add queries.
  const own = listing.sellerId === (await requireStudent()).id;
  const t = await getTranslations("Listing");
  const format = await getFormatter();
  const locale = await getLocale();
  const points =
    !own && listing.status === "AVAILABLE"
      ? (await activeExchangePoints())
          .filter((point) => listing.campuses.includes(point.campus))
          .sort(
            (a, b) =>
              Number(b.id === listing.meetupLocation) -
                Number(a.id === listing.meetupLocation) ||
              listing.campuses.indexOf(a.campus) -
                listing.campuses.indexOf(b.campus),
          )
      : [];
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition hover:border-primary/30 hover:shadow-sm">
      <Link href={"/listings/" + listing.id} className="flex flex-1 flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-sky">
          {listing.images[0] ? (
            <Image
              src={listing.images[0].thumbUrl}
              alt={listing.images[0].alt}
              fill
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-primary/40">
              <ImageOff size={24} strokeWidth={1.75} />
            </span>
          )}
          {listing.status !== "AVAILABLE" && (
            <Badge
              tone={listingStatusTone[listing.status]}
              className="absolute left-3 top-3 shadow-sm"
            >
              {t(listing.status)}
            </Badge>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3.5 sm:p-4">
          <p
            className={cn(
              "text-base font-semibold",
              listing.isFree ? "text-warning" : "text-primary",
            )}
          >
            {listing.isFree ? (
              <Badge tone="amber">{t("free")}</Badge>
            ) : listing.openToTrade ? (
              t("trade")
            ) : (
              t("priceAmount", {
                amount: format.number(listing.priceNtd ?? 0, {
                  maximumFractionDigits: 0,
                }),
              })
            )}
          </p>
          <h2 className="mt-1 line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary">
            {listing.title}
          </h2>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-muted">
            <Badge tone="gray">{t(listing.condition)}</Badge>
            <span className="inline-flex items-center gap-1">
              <Clock size={16} strokeWidth={1.75} />
              {format.relativeTime(listing.createdAt, new Date())}
            </span>
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-2 border-t border-border p-3 sm:px-4">
        {own ? (
          <Button asChild variant="outline" className="w-full">
            <Link href={"/listings/" + listing.id + "/edit"}>
              <Pencil size={16} />
              {t("edit")}
            </Link>
          </Button>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              {listing.status === "AVAILABLE" && points.length ? (
                <ContactDialog
                  id={listing.id}
                  title={listing.title}
                  points={points}
                  locale={locale}
                  compact
                />
              ) : (
                <Button
                  disabled
                  variant="secondary"
                  className="w-full px-3"
                  title={t(listing.status)}
                >
                  <ShoppingBag size={16} />
                  {t("buy")}
                </Button>
              )}
            </div>
            <ReportDialog id={listing.id} title={listing.title} compact />
          </>
        )}
      </div>
      {!own && (
        <div className="absolute right-2.5 top-2.5">
          <SaveButton id={listing.id} initial={!!saved} compact />
        </div>
      )}
    </article>
  );
}
