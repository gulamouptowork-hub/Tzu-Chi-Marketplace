import Link from "next/link";
import { Globe } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { toggleLocale } from "@/app/actions";
import { BrandLink } from "@/components/brand";
import { Button, cn } from "@/components/ui/button";
export async function LanguageToggle({
  inverse = false,
}: {
  inverse?: boolean;
}) {
  const t = await getTranslations("App");
  return (
    <form action={toggleLocale}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          inverse && "text-white hover:bg-white/10 hover:text-white",
        )}
      >
        <Globe size={16} strokeWidth={1.75} />
        {/* Icon-only on phones so the header fits; the name stays readable. */}
        <span className="sr-only sm:not-sr-only">{t("language")}</span>
      </Button>
    </form>
  );
}
// Header for pages outside the signed-in marketplace shell.
export async function PublicHeader({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <BrandLink />
        <div className="flex items-center gap-2">
          {children}
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
export async function SiteFooter({
  showPrivacy = true,
}: {
  showPrivacy?: boolean;
}) {
  const t = await getTranslations("App");
  const auth = await getTranslations("Auth");
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between lg:px-8">
        <div className="max-w-sm">
          <BrandLink compact />
          <p className="mt-3 text-sm text-muted">{t("description")}</p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium">
          <Link href="/marketplace" className="text-muted hover:text-primary">
            {t("home")}
          </Link>
          <Link href="/listings/new" className="text-muted hover:text-primary">
            {t("sell")}
          </Link>
          <Link href="/about" className="text-muted hover:text-primary">
            {t("rules")}
          </Link>
        </nav>
      </div>
      {showPrivacy && (
        <div className="border-t border-border">
          <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted sm:px-6 lg:px-8">
            {auth("privacy")}
          </p>
        </div>
      )}
    </footer>
  );
}
