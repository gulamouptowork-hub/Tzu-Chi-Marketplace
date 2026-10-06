"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeftRight,
  BookOpen,
  Bookmark,
  ChevronDown,
  House,
  LogOut,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import { logout } from "@/app/actions";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/button";
const accountPaths = ["/settings", "/my-listings", "/exchanges", "/admin"];
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}
function SearchField({
  query = "",
  filters = [],
}: {
  query?: string;
  filters?: [string, string][];
}) {
  const t = useTranslations("App");
  return (
    <form
      action="/marketplace"
      role="search"
      className="relative hidden max-w-xl flex-1 md:block"
    >
      {filters.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Search
        size={20}
        strokeWidth={1.75}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        key={query}
        name="q"
        type="search"
        defaultValue={query}
        aria-label={t("search")}
        placeholder={t("search")}
        className="h-10 rounded-full border-border-strong bg-surface pl-10 shadow-none"
      />
    </form>
  );
}
function CurrentSearch() {
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <SearchField
      query={pathname === "/marketplace" ? (params.get("q") ?? "") : ""}
      filters={
        pathname === "/marketplace"
          ? [...params.entries()].filter(([key]) =>
              [
                "category",
                "campus",
                "condition",
                "status",
                "min",
                "max",
                "free",
                "sort",
              ].includes(key),
            )
          : []
      }
    />
  );
}
// Keeps the header search box showing the query after a search.
export function HeaderSearch() {
  return (
    <Suspense fallback={<SearchField />}>
      <CurrentSearch />
    </Suspense>
  );
}
export function HeaderNav() {
  const pathname = usePathname();
  const t = useTranslations("App");
  return (
    <nav aria-label={t("name")} className="hidden items-center gap-1 lg:flex">
      {[
        { href: "/marketplace", label: t("home") },
        { href: "/saved", label: t("saved") },
      ].map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium",
              active
                ? "bg-sky text-primary"
                : "text-muted hover:bg-sky hover:text-primary",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("App");
  const items = [
    { key: "home", href: "/marketplace", icon: House },
    { key: "searchNav", href: "/marketplace#search", icon: Search },
    { key: "sell", href: "/listings/new", icon: Plus },
    { key: "saved", href: "/saved", icon: Bookmark },
    { key: "profile", href: "/settings", icon: User },
  ];
  return (
    <nav
      aria-label={t("name")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 px-2">
        {items.map(({ key, href, icon: Icon }) => {
          const active =
            key === "profile"
              ? accountPaths.some((path) => isActive(pathname, path))
              : key !== "searchNav" && isActive(pathname, href);
          if (key === "sell")
            return (
              <Link
                key={key}
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-primary"
              >
                <span className="-mt-6 flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-surface">
                  <Plus size={24} strokeWidth={1.75} />
                </span>
                {t(key)}
              </Link>
            );
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                active ? "text-primary" : "text-muted hover:text-primary",
              )}
            >
              <Icon
                size={24}
                strokeWidth={active ? 2.25 : 1.75}
                fill={active && key === "saved" ? "currentColor" : "none"}
              />
              {t(key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
export function AccountMenu({
  name,
  email,
  isAdmin,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
}) {
  const t = useTranslations("App");
  const d = useTranslations("Dashboard");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const links = [
    { href: "/settings", label: d("settings"), icon: Settings },
    { href: "/my-listings", label: d("listings"), icon: Package },
    { href: "/exchanges", label: d("exchanges"), icon: ArrowLeftRight },
    ...(isAdmin
      ? [{ href: "/admin", label: d("admin"), icon: ShieldCheck }]
      : []),
    { href: "/about", label: t("rules"), icon: BookOpen },
  ];
  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label={t("profile")}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full p-1 hover:bg-sky md:pr-2"
      >
        <Avatar name={name} size="sm" />
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={cn(
            "hidden text-muted transition-transform md:block",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          id="account-menu"
          className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-slate-900/10"
        >
          <div className="flex items-center gap-3 border-b border-border bg-surface-muted px-4 py-4">
            <Avatar name={name} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{name}</p>
              <p className="truncate text-xs text-muted">{email}</p>
            </div>
          </div>
          <ul className="p-2">
            {links.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-sky hover:text-primary"
                >
                  <Icon size={20} strokeWidth={1.75} className="text-muted" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <form action={logout} className="border-t border-border p-2">
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger-soft">
              <LogOut size={20} strokeWidth={1.75} />
              {t("signOut")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
export function AccountNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const d = useTranslations("Dashboard");
  const links = [
    { href: "/settings", label: d("settings"), icon: Settings },
    { href: "/my-listings", label: d("listings"), icon: Package },
    { href: "/exchanges", label: d("exchanges"), icon: ArrowLeftRight },
    ...(isAdmin
      ? [{ href: "/admin", label: d("admin"), icon: ShieldCheck }]
      : []),
  ];
  return (
    <nav aria-label={d("settings")}>
      <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium",
                  active
                    ? "bg-primary text-white shadow-sm shadow-primary/25"
                    : "border border-border bg-surface text-foreground hover:border-primary/30 hover:text-primary lg:border-transparent lg:bg-transparent lg:hover:bg-sky",
                )}
              >
                <Icon size={20} strokeWidth={1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
