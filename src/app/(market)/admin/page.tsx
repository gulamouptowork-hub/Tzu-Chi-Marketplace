import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeftRight,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  History,
  Package,
  ShieldCheck,
  Users,
  UserPlus,
} from "lucide-react";
import { requireAdminPage } from "@/lib/session";
import { getAdminData } from "@/lib/admin-data";
import { adminTabs, adminQuerySchema } from "@/lib/admin-query";
import { AdminAction } from "@/components/admin-action";
import {
  Badge,
  exchangeStatusTone,
  listingStatusTone,
} from "@/components/ui/badge";
import { Button, buttonVariants, cn } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
const icons = {
  overview: BarChart3,
  users: Users,
  listings: Package,
  exchanges: ArrowLeftRight,
  reports: Flag,
  activity: History,
};
function Table({
  headings,
  children,
}: {
  headings: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-border bg-surface-muted text-xs text-muted">
            <tr>
              {headings.map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-5 py-4 font-semibold"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border [&_td]:px-5 [&_td]:py-4 [&_td]:align-top">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const admin = await requireAdminPage();
  const t = await getTranslations("Admin");
  const m = await getTranslations("Moderation");
  const l = await getTranslations("Listing");
  const campus = await getTranslations("ListingForm");
  const locale = await getLocale();
  const format = await getFormatter();
  const parsed = adminQuerySchema.safeParse(await searchParams);
  const query = parsed.success ? parsed.data : adminQuerySchema.parse({});
  const data = await getAdminData(query);
  const link = (changes: Record<string, string | number>) =>
    "/admin?" +
    new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(query).map(([key, value]) => [key, String(value)]),
      ),
      ...Object.fromEntries(
        Object.entries(changes).map(([key, value]) => [key, String(value)]),
      ),
    });
  const date = (value: Date) =>
    format.dateTime(value, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Taipei",
    });
  const name = (user: { displayName: string | null; email: string }) =>
    user.displayName || user.email;
  const statuses = {
    users: ["active", "onboarding", "suspended", "deleted"],
    listings: ["AVAILABLE", "RESERVED", "SOLD", "hidden"],
    exchanges: ["PROPOSED", "ACCEPTED", "COMPLETED", "CANCELLED"],
    reports: ["OPEN", "RESOLVED"],
    activity: [],
    overview: [],
  };
  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title={t("title")}
        description={t("intro")}
        eyebrow={t("administrator")}
        actions={
          <Badge>
            <ShieldCheck size={14} />
            {admin.email}
          </Badge>
        }
      />
      <nav
        aria-label={t("sections")}
        className="flex gap-2 overflow-x-auto pb-2"
      >
        {adminTabs.map((tab) => {
          const Icon = icons[tab];
          return (
            <Link
              key={tab}
              href={link({ tab, page: 1, q: "", status: "" })}
              aria-current={query.tab === tab ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold",
                query.tab === tab
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-muted hover:bg-sky hover:text-primary",
              )}
            >
              <Icon size={18} />
              {t(tab)}
            </Link>
          );
        })}
      </nav>
      {data.tab === "overview" ? (
        <>
          <form
            action="/admin"
            className="flex flex-wrap items-end justify-between gap-3"
          >
            <div>
              <h2 className="text-lg font-semibold">
                {t("communityOverview")}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {t("periodCaption", { days: query.period })}
              </p>
            </div>
            <div className="flex items-end gap-2">
              <label className="text-sm">
                {t("period")}
                <select
                  name="period"
                  defaultValue={query.period}
                  className="mt-1 w-40"
                >
                  {[7, 30, 90].map((days) => (
                    <option key={days} value={days}>
                      {t("lastDays", { days })}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" variant="outline">
                {t("apply")}
              </Button>
            </div>
          </form>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { key: "totalUsers", value: data.metrics.users, icon: Users },
              {
                key: "activeUsers",
                value: data.metrics.activeUsers,
                icon: ShieldCheck,
              },
              {
                key: "availableListings",
                value: data.metrics.available,
                icon: Package,
              },
              {
                key: "reservedListings",
                value: data.metrics.reserved,
                icon: ArrowLeftRight,
              },
              {
                key: "completedExchanges",
                value: data.metrics.completed,
                icon: CheckCircle2,
              },
              {
                key: "openReports",
                value: data.metrics.openReports,
                icon: Flag,
              },
              { key: "newUsers", value: data.metrics.newUsers, icon: UserPlus },
              {
                key: "newListings",
                value: data.metrics.newListings,
                icon: Package,
              },
            ].map(({ key, value, icon: Icon }) => (
              <div key={key} className="card p-4 sm:p-5">
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-sky text-primary">
                  <Icon size={20} />
                </div>
                <p className="text-3xl font-semibold tracking-tight">
                  {format.number(value)}
                </p>
                <p className="mt-1 text-sm text-muted">{t(key)}</p>
                {["newUsers", "newListings"].includes(key) && (
                  <p className="mt-1 text-xs text-muted">
                    {t("lastDays", { days: query.period })}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section
              className="card min-w-0 p-5 sm:p-6"
              aria-labelledby="admin-trend-heading"
            >
              <h2 id="admin-trend-heading" className="text-lg font-semibold">
                {t("activityTrend")}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {t("completedInPeriod", {
                  count: data.metrics.periodCompleted,
                  days: query.period,
                })}
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
                {["users", "listings", "completed"].map((key, index) => (
                  <span key={key} className="inline-flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2.5 rounded-full",
                        index === 0
                          ? "bg-primary"
                          : index === 1
                            ? "bg-sky-strong"
                            : "bg-slate-400",
                      )}
                    />
                    {t(key === "completed" ? "completedExchanges" : key)}
                  </span>
                ))}
              </div>
              <div
                className="mt-6 flex h-40 items-end gap-1 border-b border-border"
                role="img"
                aria-label={t("chartDescription", { days: query.period })}
              >
                {data.series.map((day) => {
                  const max = Math.max(
                    1,
                    ...data.series.flatMap((row) => [
                      row.users,
                      row.listings,
                      row.completed,
                    ]),
                  );
                  return (
                    <div
                      key={day.day}
                      className="flex h-full min-w-0 flex-1 items-end gap-px"
                      title={`${day.day}: ${t("users")} ${day.users}, ${t("listings")} ${day.listings}, ${t("completedExchanges")} ${day.completed}`}
                    >
                      {[day.users, day.listings, day.completed].map(
                        (count, index) => (
                          <div
                            key={index}
                            style={{ height: `${(count / max) * 100}%` }}
                            className={cn(
                              "min-w-0 flex-1 rounded-t-sm",
                              index === 0
                                ? "bg-primary"
                                : index === 1
                                  ? "bg-sky-strong"
                                  : "bg-slate-400",
                            )}
                          />
                        ),
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>{data.series[0]?.day}</span>
                <span>{data.series.at(-1)?.day}</span>
              </div>
              <details className="mt-5">
                <summary className="cursor-pointer text-sm font-medium text-primary">
                  {t("viewDailyCounts")}
                </summary>
                <div className="mt-3 max-h-72 overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {[
                          "date",
                          "users",
                          "listings",
                          "completedExchanges",
                        ].map((key) => (
                          <th key={key} className="p-2 text-left font-medium">
                            {t(key)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.series.map((day) => (
                        <tr key={day.day} className="border-t border-border">
                          <td className="p-2">{day.day}</td>
                          <td className="p-2">{day.users}</td>
                          <td className="p-2">{day.listings}</td>
                          <td className="p-2">{day.completed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
            <section className="card p-5 sm:p-6">
              <h2 className="text-lg font-semibold">{t("byCategory")}</h2>
              <p className="mt-1 text-sm text-muted">{t("visibleListings")}</p>
              <div className="mt-5 space-y-4">
                {data.categories.length ? (
                  data.categories.map((category) => (
                    <div key={category.id}>
                      <div className="mb-1.5 flex justify-between gap-3 text-sm">
                        <span>
                          {locale === "en" ? category.nameEn : category.nameZh}
                        </span>
                        <span className="font-semibold">{category.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-sky">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${(category.count / Math.max(...data.categories.map((item) => item.count), 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">{t("noData")}</p>
                )}
              </div>
            </section>
          </div>
          <section className="card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("recentActions")}</h2>
              <Link
                href={link({ tab: "activity", page: 1 })}
                className="text-sm font-medium text-primary"
              >
                {t("viewAll")}
              </Link>
            </div>
            <div className="mt-4 divide-y divide-border">
              {data.recentActions.length ? (
                data.recentActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex flex-wrap justify-between gap-2 py-3 text-sm"
                  >
                    <div>
                      <span className="font-medium">{t(action.action)}</span>
                      <p className="mt-1 break-all text-muted">
                        {action.targetLabel}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted">
                      <p>{name(action.actor)}</p>
                      <p className="mt-1">{date(action.createdAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-3 text-sm text-muted">{t("noActions")}</p>
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          <form
            action="/admin"
            role="search"
            className="card flex flex-wrap items-end gap-3 p-4"
          >
            <input type="hidden" name="tab" value={query.tab} />
            <input type="hidden" name="period" value={query.period} />
            <label className="min-w-[180px] flex-1 text-sm">
              {t("search")}
              <input
                type="search"
                name="q"
                maxLength={100}
                defaultValue={query.q}
                placeholder={t("searchHint")}
                className="mt-1"
              />
            </label>
            {statuses[query.tab].length > 0 && (
              <label className="text-sm">
                {t("status")}
                <select
                  name="status"
                  defaultValue={query.status}
                  className="mt-1 min-w-36"
                >
                  <option value="">{t("allStates")}</option>
                  {statuses[query.tab].map((status) => (
                    <option key={status} value={status}>
                      {t(status)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Button type="submit">{t("apply")}</Button>
            <Link
              href={link({ q: "", status: "", page: 1 })}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("clear")}
            </Link>
          </form>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t(data.tab)}</h2>
            <p className="text-sm text-muted">
              {t("resultCount", { count: data.total })}
            </p>
          </div>
          {data.total === 0 ? (
            <EmptyState
              icon={icons[data.tab]}
              title={t("noResults")}
              body={t("noResultsHint")}
            />
          ) : (
            <>
              {data.tab === "users" && (
                <Table
                  headings={[
                    t("user"),
                    t("department"),
                    t("status"),
                    t("activity"),
                    t("actions"),
                  ]}
                >
                  {data.rows.map((user) => {
                    const state = user.deletedAt
                      ? "deleted"
                      : user.suspendedAt
                        ? "suspended"
                        : user.rulesAcceptedAt
                          ? "active"
                          : "onboarding";
                    return (
                      <tr key={user.id}>
                        <td>
                          <p className="font-semibold">{name(user)}</p>
                          <p className="mt-1 break-all text-xs text-muted">
                            {user.email}
                          </p>
                          <p className="mt-2 text-xs text-muted">
                            {t("joined")}: {date(user.createdAt)}
                          </p>
                        </td>
                        <td>
                          {user.department || "—"}
                          {user.year && (
                            <p className="mt-1 text-xs text-muted">
                              {t("year", { year: user.year })}
                            </p>
                          )}
                        </td>
                        <td>
                          <Badge
                            tone={
                              state === "active"
                                ? "green"
                                : state === "suspended"
                                  ? "red"
                                  : "gray"
                            }
                          >
                            {t(state)}
                          </Badge>
                          {user.role === "ADMIN" && (
                            <p className="mt-2 text-xs font-semibold text-primary">
                              {t("administrator")}
                            </p>
                          )}
                        </td>
                        <td>
                          <Link
                            className="font-medium text-primary"
                            href={link({
                              tab: "listings",
                              q: user.email,
                              status: "",
                              page: 1,
                            })}
                          >
                            {t("userListings", { count: user._count.listings })}
                          </Link>
                          <p className="mt-2 text-xs text-muted">
                            {t("userExchanges", {
                              count: user._count.purchases + user._count.sales,
                            })}
                          </p>
                        </td>
                        <td>
                          {user.role !== "ADMIN" && !user.deletedAt ? (
                            <AdminAction
                              label={t(
                                user.suspendedAt
                                  ? "restoreUser"
                                  : "suspendUser",
                              )}
                              body={{
                                action: "user",
                                id: user.id,
                                suspend: !user.suspendedAt,
                              }}
                              danger={!user.suspendedAt}
                            />
                          ) : (
                            <span className="text-xs text-muted">
                              {t(
                                user.role === "ADMIN"
                                  ? "protectedAdmin"
                                  : "deletedAccount",
                              )}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </Table>
              )}
              {data.tab === "listings" && (
                <Table
                  headings={[
                    t("item"),
                    t("seller"),
                    t("status"),
                    t("activity"),
                    t("actions"),
                  ]}
                >
                  {data.rows.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <p className="font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs text-muted">
                          {locale === "en"
                            ? item.category.nameEn
                            : item.category.nameZh}{" "}
                          ·{" "}
                          {item.isFree
                            ? l("free")
                            : item.openToTrade
                              ? l("trade")
                              : format.number(item.priceNtd ?? 0, {
                                  style: "currency",
                                  currency: "TWD",
                                  maximumFractionDigits: 0,
                                })}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {item.campuses
                            .map((value) => campus(value))
                            .join(" · ")}
                        </p>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-primary">
                            {t("details")}
                          </summary>
                          <p className="mt-2 max-w-sm whitespace-pre-wrap break-words text-xs text-muted">
                            {item.description}
                          </p>
                        </details>
                      </td>
                      <td>
                        <p>{name(item.seller)}</p>
                        <p className="mt-1 break-all text-xs text-muted">
                          {item.seller.email}
                        </p>
                      </td>
                      <td>
                        <Badge
                          tone={
                            item.hiddenAt
                              ? "red"
                              : listingStatusTone[item.status]
                          }
                        >
                          {t(item.hiddenAt ? "hidden" : item.status)}
                        </Badge>
                        {(item.seller.suspendedAt || item.seller.deletedAt) && (
                          <p className="mt-2 text-xs text-danger">
                            {t("sellerUnavailable")}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-muted">
                          {date(item.createdAt)}
                        </p>
                      </td>
                      <td className="text-xs text-muted">
                        <p>{t("savedCount", { count: item._count.saved })}</p>
                        <p className="mt-1">
                          {t("contactCount", { count: item._count.contacts })}
                        </p>
                        <p className="mt-1">
                          {t("reportCount", { count: item._count.reports })}
                        </p>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <AdminAction
                            label={m(item.hiddenAt ? "restore" : "hide")}
                            body={{
                              action: "listing",
                              id: item.id,
                              hide: !item.hiddenAt,
                            }}
                            danger={!item.hiddenAt}
                          />
                          {!item.hiddenAt &&
                            !item.seller.suspendedAt &&
                            !item.seller.deletedAt && (
                              <Link
                                href={"/listings/" + item.id}
                                className={buttonVariants({
                                  variant: "outline",
                                  size: "sm",
                                })}
                              >
                                {t("view")}
                              </Link>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
              {data.tab === "exchanges" && (
                <Table
                  headings={[
                    t("item"),
                    t("participants"),
                    t("meetup"),
                    t("status"),
                  ]}
                >
                  {data.rows.map((exchange) => (
                    <tr key={exchange.id}>
                      <td className="font-semibold">
                        {exchange.listing.title}
                        <p className="mt-2 text-xs font-normal text-muted">
                          {date(exchange.createdAt)}
                        </p>
                      </td>
                      <td>
                        <p className="text-xs text-muted">{t("buyer")}</p>
                        <p>{name(exchange.buyer)}</p>
                        <p className="break-all text-xs text-muted">
                          {exchange.buyer.email}
                        </p>
                        <p className="mt-3 text-xs text-muted">{t("seller")}</p>
                        <p>{name(exchange.seller)}</p>
                        <p className="break-all text-xs text-muted">
                          {exchange.seller.email}
                        </p>
                      </td>
                      <td>
                        <p>
                          {campus(exchange.point.campus)} —{" "}
                          {locale === "en"
                            ? exchange.point.nameEn
                            : exchange.point.nameZh}
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          {date(exchange.scheduledAt)} · {t("taipei")}
                        </p>
                      </td>
                      <td>
                        <Badge tone={exchangeStatusTone[exchange.status]}>
                          {t(exchange.status)}
                        </Badge>
                        <p className="mt-2 text-xs text-muted">
                          {t("arrivedCount", {
                            count:
                              Number(!!exchange.buyerArrivedAt) +
                              Number(!!exchange.sellerArrivedAt),
                          })}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {t("confirmedCount", {
                            count:
                              Number(!!exchange.buyerCompletedAt) +
                              Number(!!exchange.sellerCompletedAt),
                          })}
                        </p>
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
              {data.tab === "reports" && (
                <div className="space-y-4">
                  {data.rows.map((report) => (
                    <article key={report.id} className="card p-5">
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">
                            {report.listing.title}
                          </h3>
                          <p className="mt-1 text-sm text-muted">
                            {t("seller")}: {name(report.listing.seller)}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {t("reportedBy")}: {report.reporter.email} ·{" "}
                            {date(report.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <Badge tone="red">{m(report.reason)}</Badge>
                          <Badge
                            tone={report.status === "OPEN" ? "amber" : "green"}
                          >
                            {t(report.status)}
                          </Badge>
                        </div>
                      </div>
                      {report.details && (
                        <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-surface-muted p-4 text-sm">
                          {report.details}
                        </p>
                      )}
                      {report.resolvedAt && (
                        <p className="mt-3 text-xs text-muted">
                          {t("resolvedBy")}:{" "}
                          {report.resolvedBy ? name(report.resolvedBy) : "—"} ·{" "}
                          {date(report.resolvedAt)}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                        <AdminAction
                          label={m(
                            report.listing.hiddenAt ? "restore" : "hide",
                          )}
                          body={{
                            action: "listing",
                            id: report.listing.id,
                            hide: !report.listing.hiddenAt,
                          }}
                          danger={!report.listing.hiddenAt}
                        />
                        {report.listing.seller.role !== "ADMIN" &&
                          !report.listing.seller.deletedAt && (
                            <AdminAction
                              label={t(
                                report.listing.seller.suspendedAt
                                  ? "restoreUser"
                                  : "suspendUser",
                              )}
                              body={{
                                action: "user",
                                id: report.listing.seller.id,
                                suspend: !report.listing.seller.suspendedAt,
                              }}
                              danger={!report.listing.seller.suspendedAt}
                            />
                          )}
                        {report.status === "OPEN" && (
                          <AdminAction
                            label={m("resolve")}
                            body={{ action: "report", id: report.id }}
                          />
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {data.tab === "activity" && (
                <Table
                  headings={[
                    t("date"),
                    t("administrator"),
                    t("action"),
                    t("target"),
                    t("reason"),
                  ]}
                >
                  {data.rows.map((action) => (
                    <tr key={action.id}>
                      <td className="whitespace-nowrap">
                        {date(action.createdAt)}
                      </td>
                      <td>
                        {name(action.actor)}
                        <p className="mt-1 break-all text-xs text-muted">
                          {action.actor.email}
                        </p>
                      </td>
                      <td className="font-medium">{t(action.action)}</td>
                      <td className="break-all">
                        {action.targetLabel}
                        <p className="mt-1 text-xs text-muted">
                          {t(action.targetType)} · {action.targetId}
                        </p>
                      </td>
                      <td className="max-w-xs whitespace-pre-wrap break-words">
                        {action.reason || "—"}
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  {t("pageOf", {
                    page: query.page,
                    pages: Math.max(1, Math.ceil(data.total / data.pageSize)),
                  })}
                </p>
                <div className="flex gap-2">
                  {query.page > 1 && (
                    <Link
                      href={link({ page: query.page - 1 })}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      <ChevronLeft size={16} />
                      {t("previous")}
                    </Link>
                  )}
                  {query.page * data.pageSize < data.total && (
                    <Link
                      href={link({ page: query.page + 1 })}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      {t("next")}
                      <ChevronRight size={16} />
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
