import Image from "next/image";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { ImageOff, Package, Pencil, Plus } from "lucide-react";
import { requireStudentPage as requireStudent } from "@/lib/session";
import { db } from "@/lib/db";
import { MutationButton } from "@/components/mutation-button";
import { Button } from "@/components/ui/button";
import { Badge, listingStatusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
export default async function Dashboard() {
  const user = await requireStudent();
  const t = await getTranslations("Dashboard");
  const l = await getTranslations("Listing");
  const a = await getTranslations("App");
  const lf = await getTranslations("ListingForm");
  const format = await getFormatter();
  const listings = await db.listing.findMany({
    where: { sellerId: user.id, hiddenAt: null },
    include: { images: { take: 1, orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  const sell = (
    <Button asChild>
      <Link href="/listings/new">
        <Plus size={16} strokeWidth={1.75} />
        {a("sell")}
      </Link>
    </Button>
  );
  return (
    <>
      <PageHeader
        title={t("listings")}
        actions={listings.length > 0 ? sell : undefined}
      />
      {listings.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t("noListings")}
          body={lf("intro")}
          action={sell}
        />
      ) : (
        <div className="space-y-3">
          {listings.map((item, index) => (
            <article
              key={item.id}
              className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <Link
                  href={"/listings/" + item.id}
                  className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-sky"
                >
                  {item.images[0] ? (
                    <Image
                      src={item.images[0].thumbUrl}
                      alt={item.images[0].alt}
                      fill
                      sizes="80px"
                      loading={index < 4 ? "eager" : "lazy"}
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-primary/40">
                      <ImageOff size={24} strokeWidth={1.5} />
                    </span>
                  )}
                </Link>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">
                    <Link
                      href={"/listings/" + item.id}
                      className="hover:text-primary"
                    >
                      {item.title}
                    </Link>
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                    <Badge tone={listingStatusTone[item.status]}>
                      {l(item.status)}
                    </Badge>
                    <span className="font-semibold text-primary">
                      {item.isFree
                        ? l("free")
                        : item.openToTrade
                          ? l("trade")
                          : l("priceAmount", {
                              amount: format.number(item.priceNtd ?? 0, {
                                maximumFractionDigits: 0,
                              }),
                            })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <div
                  role="group"
                  aria-label={l("status")}
                  className="col-span-2 flex rounded-lg bg-surface-muted p-0.5 ring-1 ring-border sm:inline-flex"
                >
                  {["AVAILABLE", "RESERVED", "SOLD"].map((status) => (
                    <MutationButton
                      key={status}
                      url={"/api/listings/" + item.id}
                      body={{ status }}
                      label={l(status)}
                      size="sm"
                      pressed={item.status === status}
                      variant={item.status === status ? "default" : "ghost"}
                      className="h-8 flex-1 sm:flex-none"
                    />
                  ))}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={"/listings/" + item.id + "/edit"}>
                    <Pencil size={16} strokeWidth={1.75} />
                    {l("edit")}
                  </Link>
                </Button>
                <MutationButton
                  url={"/api/listings/" + item.id}
                  method="DELETE"
                  label={t("delete")}
                  confirm={t("deleteConfirm")}
                  variant="danger-outline"
                  size="sm"
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
