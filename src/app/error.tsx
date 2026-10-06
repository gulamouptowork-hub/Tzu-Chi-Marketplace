"use client";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations("Errors");
  return (
    <div className="flex min-h-[70vh] flex-col">
      <StatusMessage
        icon={TriangleAlert}
        tone="red"
        title={t("error")}
        body={t("errorHint")}
      >
        <Button onClick={reset}>{t("retry")}</Button>
      </StatusMessage>
    </div>
  );
}
