import Link from "next/link";
import { getLocale, getTranslations, getFormatter } from "next-intl/server";
import {
  ArrowLeftRight,
  CalendarClock,
  CircleCheck,
  MapPin,
  User,
  type LucideIcon,
} from "lucide-react";
import { requireStudentPage as requireStudent } from "@/lib/session";
import { db } from "@/lib/db";
import { MutationButton } from "@/components/mutation-button";
import { Button } from "@/components/ui/button";
import { Badge, exchangeStatusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  // dt/dd must be direct children of the group div, so the icon sits in dt.
  return (
    <div className="relative min-w-0 pl-12">
      <dt className="text-xs text-muted">
        <span className="absolute left-0 top-0 flex size-9 items-center justify-center rounded-lg bg-surface text-primary ring-1 ring-border">
          <Icon size={16} strokeWidth={1.75} />
        </span>
        {label}
      </dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
export default async function Exchanges() {
  const user = await requireStudent();
  const t = await getTranslations("Dashboard");
  const l = await getTranslations("Listing");
  const c = await getTranslations("ListingForm");
  const a = await getTranslations("App");
  const locale = await getLocale();
  const format = await getFormatter();
  const exchanges = await db.exchange.findMany({
    where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
    include: {
      listing: {
        select: {
          title: true,
          priceNtd: true,
          isFree: true,
          openToTrade: true,
        },
      },
      buyer: { select: { displayName: true } },
      seller: { select: { displayName: true } },
      point: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHeader title={t("exchanges")} />
      {exchanges.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={t("noExchanges")}
          body={t("noExchangesHint")}
          action={
            <Button asChild>
              <Link href="/marketplace">{a("home")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {exchanges.map((e) => (
            <article key={e.id} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{e.listing.title}</h2>
                  <p className="mt-0.5 font-semibold text-primary">
                    {e.listing.isFree
                      ? l("free")
                      : e.listing.openToTrade
                        ? l("trade")
                        : l("priceAmount", {
                            amount: format.number(e.listing.priceNtd ?? 0, {
                              maximumFractionDigits: 0,
                            }),
                          })}
                  </p>
                </div>
                <Badge tone={exchangeStatusTone[e.status]} className="text-sm">
                  {t(e.status)}
                </Badge>
              </div>
              <dl className="mt-5 grid gap-4 rounded-xl bg-surface-muted p-4 sm:grid-cols-2">
                <Detail icon={User} label={t("buyer")}>
                  {e.buyer.displayName}
                </Detail>
                <Detail icon={User} label={t("seller")}>
                  {e.seller.displayName}
                </Detail>
                <Detail icon={MapPin} label={t("meetup")}>
                  {c(e.point.campus)} —{" "}
                  {locale === "en" ? e.point.nameEn : e.point.nameZh}
                </Detail>
                <Detail icon={CalendarClock} label={t("time")}>
                  {format.dateTime(e.scheduledAt, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Taipei",
                  })}
                </Detail>
              </dl>
              {(e.buyerArrivedAt || e.sellerArrivedAt) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {e.buyerArrivedAt && (
                    <Badge tone="green">
                      <CircleCheck size={16} strokeWidth={1.75} />
                      {t("buyerArrived")}
                    </Badge>
                  )}
                  {e.sellerArrivedAt && (
                    <Badge tone="green">
                      <CircleCheck size={16} strokeWidth={1.75} />
                      {t("sellerArrived")}
                    </Badge>
                  )}
                </div>
              )}
              {["PROPOSED", "ACCEPTED"].includes(e.status) && (
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-5">
                  {e.status === "PROPOSED" && e.sellerId === user.id && (
                    <MutationButton
                      url={"/api/exchanges/" + e.id}
                      body={{ action: "accept" }}
                      label={t("accept")}
                      variant="default"
                    />
                  )}
                  {e.status === "ACCEPTED" && (
                    <>
                      <MutationButton
                        url={"/api/exchanges/" + e.id}
                        body={{ action: "arrive" }}
                        label={t("arrive")}
                      />
                      <MutationButton
                        url={"/api/exchanges/" + e.id}
                        body={{ action: "complete" }}
                        label={t("complete")}
                        variant="default"
                      />
                    </>
                  )}
                  <MutationButton
                    url={"/api/exchanges/" + e.id}
                    body={{ action: "cancel" }}
                    label={t("cancel")}
                    confirm={t("cancelConfirm")}
                    variant="ghost"
                    className="text-danger hover:bg-danger-soft hover:text-danger"
                  />
                  {e.status === "ACCEPTED" && (
                    <p className="w-full text-xs text-muted sm:ml-auto sm:w-auto">
                      {t("confirmations", {
                        count:
                          Number(!!e.buyerCompletedAt) +
                          Number(!!e.sellerCompletedAt),
                      })}
                    </p>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
