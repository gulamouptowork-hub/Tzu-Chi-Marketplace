"use client";
import { Bookmark } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/toast-provider";
import { Button, cn } from "@/components/ui/button";
export function SaveButton({
  id,
  initial = false,
  compact = false,
}: {
  id: string;
  initial?: boolean;
  compact?: boolean;
}) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const t = useTranslations("Listing");
  const toast = useToast();
  const router = useRouter();
  async function save() {
    setBusy(true);
    setError(false);
    try {
      const result = await fetch("/api/listings/" + id + "/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: !saved }),
      });
      if (!result.ok) throw new Error();
      setSaved(!saved);
      // Keeps lists such as the Saved page in sync with the new state.
      router.refresh();
    } catch {
      setError(true);
      if (compact) toast(t("error"));
    } finally {
      setBusy(false);
    }
  }
  const icon = (
    <Bookmark
      size={20}
      strokeWidth={1.75}
      fill={saved ? "currentColor" : "none"}
    />
  );
  if (compact)
    return (
      <button
        type="button"
        disabled={busy}
        onClick={save}
        aria-pressed={saved}
        aria-label={t(saved ? "unsave" : "save")}
        title={t(saved ? "unsave" : "save")}
        className={cn(
          "flex size-10 items-center justify-center rounded-full border border-border bg-surface shadow-sm hover:bg-sky disabled:opacity-60",
          saved ? "text-primary" : "text-foreground hover:text-primary",
        )}
      >
        {icon}
      </button>
    );
  return (
    <>
      <Button
        variant={saved ? "secondary" : "outline"}
        disabled={busy}
        onClick={save}
        aria-pressed={saved}
        aria-label={t(saved ? "unsave" : "save")}
        className="flex-1"
      >
        {icon}
        {t(saved ? "unsave" : "save")}
      </Button>
      {error && (
        <span role="alert" className="text-sm text-danger">
          {t("error")}
        </span>
      )}
    </>
  );
}
