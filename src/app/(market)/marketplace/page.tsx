import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Armchair,
  Bike,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CookingPot,
  Dumbbell,
  LayoutGrid,
  Laptop,
  Package,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Shirt,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { browse } from "@/lib/browse";
import { ListingCard } from "@/components/listing-card";
import { Button, buttonVariants, cn } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterDrawer } from "@/components/filter-sheet";
import { campusPhoto } from "@/components/brand";
const categoryIcons: Record<string, LucideIcon> = {
  BookOpen,
  Laptop,
  Armchair,
  Shirt,
  Dumbbell,
  Bike,
  CookingPot,
  Pencil,
  Ticket,
  Package,
};
const chip =
  "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium";
export default async function Feed({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const input = await searchParams;
  const t = await getTranslations("Listing");
  const f = await getTranslations("Feed");
  const a = await getTranslations("App");
  const campusLabels = await getTranslations("ListingForm");
  const locale = await getLocale();
  const parsed = await browse(input);
  const categories = await db.category.findMany();
  const { filters } = parsed;
  const filtered = Boolean(
    filters.q ||
    filters.category ||
    filters.campus ||
    filters.condition ||
    filters.status ||
    filters.free ||
    filters.min > 0 ||
    filters.max < 1000000,
  );
  const pages = Math.max(1, Math.ceil(parsed.total / 24));
  const activeFilterCount = [
    filters.category,
    filters.campus,
    filters.condition,
    filters.status,
    filters.free,
    filters.min > 0 || filters.max < 1000000,
    filters.sort !== "newest",
  ].filter(Boolean).length;
  const categoryLink = (category: string) => {
    const params = new URLSearchParams(
      Object.entries(filters)
        .filter(([key]) => key !== "page" && key !== "category")
        .map(([key, value]) => [key, String(value)]),
    );
    if (category) params.set("category", category);
    return "/marketplace?" + params.toString();
  };
  const photo = campusPhoto();
  const fields = (
    <>
      <input type="hidden" name="q" value={filters.q} />
      <label className="block">
        {t("filterCampus")}
        <select
          name="campus"
          aria-label={t("filterCampus")}
          defaultValue={filters.campus}
        >
          <option value="">{t("all")}</option>
          {["JIEREN", "JIANGUO", "CENTRAL"].map((campus) => (
            <option key={campus} value={campus}>
              {campusLabels(campus)}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        {t("category")}
        <select
          name="category"
          aria-label={t("category")}
          defaultValue={filters.category}
        >
          <option value="">{t("all")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {locale === "en" ? c.nameEn : c.nameZh}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        {t("condition")}
        <select
          name="condition"
          aria-label={t("condition")}
          defaultValue={filters.condition}
        >
          <option value="">{t("all")}</option>
          {["NEW", "LIKE_NEW", "GOOD", "FAIR"].map((c) => (
            <option key={c} value={c}>
              {t(c)}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        {t("status")}
        <select
          name="status"
          aria-label={t("status")}
          defaultValue={filters.status}
        >
          <option value="">{t("all")}</option>
          {["AVAILABLE", "RESERVED", "SOLD"].map((c) => (
            <option key={c} value={c}>
              {t(c)}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          {t("min")}
          <input
            type="number"
            min={0}
            name="min"
            placeholder="0"
            defaultValue={filters.min || ""}
          />
        </label>
        <label>
          {t("max")}
          <input
            type="number"
            min={0}
            name="max"
            defaultValue={filters.max < 1000000 ? filters.max : ""}
          />
        </label>
      </div>
      <label className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-muted px-3 py-2.5">
        <input
          type="checkbox"
          name="free"
          value="1"
          defaultChecked={!!filters.free}
        />
        {t("freeOnly")}
      </label>
      <label className="block">
        {t("sort")}
        <select name="sort" aria-label={t("sort")} defaultValue={filters.sort}>
          {["newest", "low", "high"].map((s) => (
            <option key={s} value={s}>
              {t(s)}
            </option>
          ))}
        </select>
      </label>
      <div className="sticky bottom-0 flex gap-2 border-t border-border bg-surface pb-4 pt-4">
        <Button className="flex-1">{t("apply")}</Button>
        <Button asChild variant="outline">
          <Link href="/marketplace">{t("clear")}</Link>
        </Button>
      </div>
    </>
  );
  const pageLink = (page: number) =>
    "/marketplace?" +
    new URLSearchParams({
      ...(Object.fromEntries(
        Object.entries(input).filter(([, v]) => v !== undefined),
      ) as Record<string, string>),
      page: String(page),
    }).toString();
  const pageButton = buttonVariants({ variant: "outline" });
  return (
    <>
      <section className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[1fr_320px] lg:items-center">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-widest text-primary">
            {a("university")}
          </p>
          <h1 className="text-2xl font-semibold leading-tight sm:text-[32px]">
            {f("title")}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted">
            {filters.q
              ? String.fromCharCode(8220) +
                filters.q +
                String.fromCharCode(8221)
              : f("intro")}
          </p>
        </div>
        {
          <div className="hidden items-center gap-4 rounded-xl border border-border bg-surface p-4 lg:flex">
            {photo ? (
              <Image
                src={photo}
                alt=""
                width={80}
                height={80}
                className="size-20 rounded-lg object-cover"
              />
            ) : (
              <ShieldCheck
                size={24}
                strokeWidth={1.75}
                className="shrink-0 text-primary"
              />
            )}
            <div>
              <p className="text-sm font-semibold">{f("exchange")}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {f("exchangeBody")}
              </p>
              <Link
                href="/about"
                className="mt-2 inline-flex text-xs font-medium text-primary hover:underline"
              >
                {a("rules")}
              </Link>
            </div>
          </div>
        }
      </section>
      <form
        id="search"
        action="/marketplace"
        role="search"
        className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-surface p-1.5 md:hidden"
      >
        {Object.entries(filters)
          .filter(([key]) => key !== "q" && key !== "page")
          .map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={String(value)} />
          ))}
        <Search
          size={20}
          strokeWidth={1.75}
          className="ml-2 shrink-0 text-muted"
        />
        <input
          name="q"
          type="search"
          defaultValue={filters.q}
          aria-label={a("search")}
          placeholder={a("search")}
          className="border-0 px-1 shadow-none focus:shadow-none"
        />
        <Button size="sm">{t("search")}</Button>
      </form>
      <nav aria-label={f("categories")} className="mt-6">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          <Link
            href={categoryLink("")}
            aria-current={!filters.category ? "page" : undefined}
            className={cn(
              chip,
              !filters.category
                ? "border-primary bg-primary text-white shadow-sm shadow-primary/25"
                : "border-sky-strong bg-sky text-primary-deep hover:bg-sky-strong",
            )}
          >
            <LayoutGrid size={16} strokeWidth={1.75} />
            {f("all")}
          </Link>
          {categories.map((c) => {
            const Icon = categoryIcons[c.icon] ?? Package;
            const active = filters.category === c.slug;
            return (
              <Link
                key={c.id}
                href={categoryLink(c.slug)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  chip,
                  active
                    ? "border-primary bg-primary text-white shadow-sm shadow-primary/25"
                    : "border-sky-strong bg-sky text-primary-deep hover:bg-sky-strong",
                )}
              >
                <Icon size={16} strokeWidth={1.75} />
                {locale === "en" ? c.nameEn : c.nameZh}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="mt-6">
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted">
              {f("results", { count: parsed.total })}
            </p>
            <FilterDrawer count={activeFilterCount}>
              <form action="/marketplace" method="get" className="space-y-5">
                {fields}
              </form>
            </FilterDrawer>
          </div>
          {parsed.listings.length ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {parsed.listings.map((listing, index) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  eager={index < 4}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={PackageOpen}
              title={t("empty")}
              body={t("emptyHint")}
              action={
                <>
                  <Button
                    asChild
                    variant="bright"
                    size="icon"
                    className="size-16 rounded-full shadow-md"
                  >
                    <Link
                      href="/listings/new"
                      aria-label={t("create")}
                      title={t("create")}
                    >
                      <Plus size={30} strokeWidth={2} aria-hidden="true" />
                    </Link>
                  </Button>
                  {filtered && (
                    <Button asChild variant="outline">
                      <Link href="/marketplace">{t("clear")}</Link>
                    </Button>
                  )}
                </>
              }
            />
          )}
          {pages > 1 && (
            <nav
              className="mt-10 flex items-center justify-center gap-3"
              aria-label={t("pagination")}
            >
              {filters.page > 1 ? (
                <Link
                  href={pageLink(filters.page - 1)}
                  rel="prev"
                  className={pageButton}
                >
                  <ChevronLeft size={16} strokeWidth={1.75} />
                  {t("previous")}
                </Link>
              ) : (
                <span aria-disabled="true" className={pageButton}>
                  <ChevronLeft size={16} strokeWidth={1.75} />
                  {t("previous")}
                </span>
              )}
              <span className="px-2 text-sm text-muted">
                {t("pageOf", { page: filters.page, pages })}
              </span>
              {filters.page < pages ? (
                <Link
                  href={pageLink(filters.page + 1)}
                  rel="next"
                  className={pageButton}
                >
                  {t("next")}
                  <ChevronRight size={16} strokeWidth={1.75} />
                </Link>
              ) : (
                <span aria-disabled="true" className={pageButton}>
                  {t("next")}
                  <ChevronRight size={16} strokeWidth={1.75} />
                </span>
              )}
            </nav>
          )}
        </section>
      </div>
    </>
  );
}
