import Link from "next/link";
import { SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
// Rendered inside the marketplace shell, which already provides the header.
export default async function MarketNotFound() {
  const t = await getTranslations("Errors");
  return (
    <StatusMessage
      as="div"
      icon={SearchX}
      title={t("notFound")}
      body={t("notFoundHint")}
    >
      <Button asChild>
        <Link href="/marketplace">{t("back")}</Link>
      </Button>
    </StatusMessage>
  );
}
