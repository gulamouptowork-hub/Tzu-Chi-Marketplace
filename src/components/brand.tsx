import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/components/ui/button";
// Optional campus photo for hero banners, supplied by the university team.
export function campusPhoto() {
  return ["campus.jpg", "campus.jpeg", "campus.png", "campus.webp"]
    .map((name) => "/brand/" + name)
    .find((path) => existsSync(join(process.cwd(), "public", path)));
}
export async function Brand({ inverse = false }: { inverse?: boolean }) {
  const t = await getTranslations("App");
  return existsSync(join(process.cwd(), "public/brand/logo.svg")) ? (
    <Image
      src="/brand/logo.svg"
      alt={t("university")}
      width={36}
      height={36}
      unoptimized
    />
  ) : (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm",
        inverse
          ? "bg-white text-primary"
          : "bg-primary text-white shadow-primary/30",
      )}
    >
      <ShoppingBag size={20} strokeWidth={1.75} />
    </span>
  );
}
export async function BrandLink({
  href = "/marketplace",
  inverse = false,
  compact = false,
}: {
  href?: string;
  inverse?: boolean;
  compact?: boolean;
}) {
  const t = await getTranslations("App");
  return (
    <Link href={href} className="flex min-w-0 items-center gap-3 md:shrink-0">
      <Brand inverse={inverse} />
      <span className="min-w-0 leading-tight">
        <span
          className={cn(
            "block truncate text-[15px] font-semibold tracking-tight",
            inverse ? "text-white" : "text-foreground",
          )}
        >
          {t("name")}
        </span>
        {!compact && (
          <span
            className={cn(
              "hidden text-xs sm:block",
              inverse ? "text-blue-100" : "text-muted",
            )}
          >
            {t("university")}
          </span>
        )}
      </span>
    </Link>
  );
}
