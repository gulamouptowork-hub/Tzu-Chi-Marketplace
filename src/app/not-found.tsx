import Link from "next/link";
import { SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
export default async function NotFound() {
  const t = await getTranslations("Errors");
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <StatusMessage
        icon={SearchX}
        title={t("notFound")}
        body={t("notFoundHint")}
      >
        <Button asChild>
          <Link href="/marketplace">{t("back")}</Link>
        </Button>
      </StatusMessage>
    </div>
  );
}
