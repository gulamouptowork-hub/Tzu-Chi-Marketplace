import { BrandLink } from "@/components/brand";
import { requireStudentPage } from "@/lib/session";
import { Suspense } from "react";
import Loading from "./loading";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { LanguageToggle, SiteFooter } from "@/components/site-chrome";
import {
  AccountMenu,
  BottomNav,
  HeaderNav,
  HeaderSearch,
} from "@/components/site-nav";
export default function MarketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Loading />
        </div>
      }
    >
      <AuthenticatedMarketLayout>{children}</AuthenticatedMarketLayout>
    </Suspense>
  );
}
async function AuthenticatedMarketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Share the request's authorization lookup with the page, without caching users across requests.
  const user = await requireStudentPage();
  const t = await getTranslations("App");
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:gap-6 lg:px-8">
          <BrandLink />
          <HeaderSearch />
          <HeaderNav />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button asChild variant="bright" className="hidden md:inline-flex">
              <Link href="/listings/new">
                <Plus size={16} strokeWidth={1.75} />
                {t("sell")}
              </Link>
            </Button>
            <LanguageToggle />
            <AccountMenu
              name={user.displayName ?? user.name ?? user.email}
              email={user.email}
              isAdmin={user.role === "ADMIN"}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
      <div className="pb-20 md:pb-0">
        <SiteFooter />
      </div>
      <BottomNav />
    </div>
  );
}
