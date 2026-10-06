"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Info, Mail, MessageCircle, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  exchangeTimeBounds,
  exchangeTimeError,
  parseTaipeiDateTime,
  type ExchangeTimeError,
} from "@/lib/exchange-time";
type Point = {
  id: string;
  campus: string;
  nameZh: string;
  nameEn: string;
  verified: boolean;
};
export function ContactDialog({
  id,
  title,
  points,
  locale,
  compact = false,
}: {
  id: string;
  title: string;
  points: Point[];
  locale: string;
  compact?: boolean;
}) {
  const t = useTranslations("Listing");
  const campusLabel = useTranslations("ListingForm");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mailto, setMailto] = useState("");
  const [campus, setCampus] = useState(points[0]?.campus ?? "");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [timeError, setTimeError] = useState<ExchangeTimeError | null>(null);
  const [bounds, setBounds] = useState<{ min?: string; max?: string }>({});
  const timeInput = useRef<HTMLInputElement>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const scheduledAt = parseTaipeiDateTime(scheduledLocal);
    const validation = exchangeTimeError(scheduledAt);
    if (validation) {
      setTimeError(validation);
      timeInput.current?.focus();
      return;
    }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/listings/" + id + "/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: form.get("message"),
          pointId: form.get("pointId"),
          scheduledAt: scheduledAt!.toISOString(),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (
          [
            "EXCHANGE_TIME_INVALID",
            "EXCHANGE_TIME_PAST",
            "EXCHANGE_TIME_TOO_FAR",
            "EXCHANGE_TIME_HOURS",
          ].includes(result.error)
        ) {
          setTimeError(result.error);
          timeInput.current?.focus();
        } else {
          const messages: Record<string, string> = {
            RATE_LIMIT: t("contactRateLimit"),
            NOT_FOUND: t("contactUnavailable"),
            CONFLICT: t("contactUnavailable"),
            UNAUTHORIZED: t("contactSignIn"),
            VALIDATION: t("contactValidation"),
          };
          setError(messages[result.error] ?? t("error"));
        }
        return;
      }
      if (result.mailto) setMailto(result.mailto);
      else router.push("/exchanges");
    } catch {
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (open) setBounds(exchangeTimeBounds());
      }}
    >
      <Dialog.Trigger asChild>
        <Button
          size={compact ? "default" : "lg"}
          className={compact ? "w-full px-3" : "w-full"}
          aria-label={compact ? t("buyItem", { title }) : undefined}
        >
          {compact ? (
            <ShoppingBag size={16} strokeWidth={1.75} />
          ) : (
            <MessageCircle size={20} strokeWidth={1.75} />
          )}
          {t(compact ? "buy" : "contact")}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl bg-surface p-6 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold">
                {t("contact")}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                {t("contactIntro")}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("close")}
                className="-mr-2 -mt-1"
              >
                <X size={20} strokeWidth={1.75} />
              </Button>
            </Dialog.Close>
          </div>
          <form onSubmit={submit} className="mt-6 space-y-5">
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger"
              >
                {error}
              </p>
            )}
            <label className="block">
              {t("point")}
              <select
                aria-label={campusLabel("campuses")}
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
              >
                {[...new Set(points.map((p) => p.campus))].map((c) => (
                  <option key={c} value={c}>
                    {campusLabel(c)}
                  </option>
                ))}
              </select>
              <select
                name="pointId"
                aria-label={t("point")}
                className="mt-2"
                required
              >
                {points
                  .filter((p) => p.campus === campus)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {locale === "en" ? p.nameEn : p.nameZh}
                    </option>
                  ))}
              </select>
            </label>
            <p className="flex gap-2 rounded-lg bg-sky px-3 py-2.5 text-xs text-muted">
              <Info
                size={16}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0 text-primary"
              />
              {t("provisional")}
            </p>
            <label className="block">
              {t("time")}
              <input
                type="datetime-local"
                name="scheduledAt"
                ref={timeInput}
                aria-label={t("time")}
                required
                disabled={busy}
                value={scheduledLocal}
                min={bounds.min}
                max={bounds.max}
                aria-invalid={!!timeError}
                aria-describedby={
                  timeError
                    ? "exchange-time-hint exchange-time-error"
                    : "exchange-time-hint"
                }
                onChange={(event) => {
                  const value = event.target.value;
                  setScheduledLocal(value);
                  setTimeError(
                    value
                      ? exchangeTimeError(parseTaipeiDateTime(value))
                      : null,
                  );
                  setError("");
                }}
              />
              <span
                id="exchange-time-hint"
                className="mt-1.5 block text-xs font-normal text-muted"
              >
                {t("safeHours")}
              </span>
              {timeError && (
                <span
                  id="exchange-time-error"
                  role="alert"
                  className="mt-2 block text-sm font-normal text-danger"
                >
                  {t(timeError)}
                </span>
              )}
            </label>
            <label className="block">
              {t("message")}
              <textarea
                name="message"
                defaultValue={t("defaultMessage", { title })}
                required
                maxLength={2000}
                rows={4}
              />
            </label>
            {mailto ? (
              <Button asChild size="lg" className="w-full">
                <a href={mailto}>
                  <Mail size={20} strokeWidth={1.75} />
                  {t("email")}
                </a>
              </Button>
            ) : (
              <Button disabled={busy} size="lg" className="w-full">
                {t("send")}
              </Button>
            )}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
