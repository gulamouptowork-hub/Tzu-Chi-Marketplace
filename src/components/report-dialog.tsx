"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
export function ReportDialog({
  id,
  compact = false,
  title,
}: {
  id: string;
  compact?: boolean;
  title?: string;
}) {
  const t = useTranslations("Moderation");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (open) {
          setMessage("");
          setSubmitted(false);
        }
      }}
    >
      <Dialog.Trigger asChild>
        <Button
          variant={compact ? "outline" : "ghost"}
          size={compact ? "icon" : "default"}
          className="text-muted hover:border-danger/30 hover:bg-danger-soft hover:text-danger"
          aria-label={
            compact && title ? t("reportItem", { title }) : t("report")
          }
          title={t("report")}
        >
          <Flag size={16} strokeWidth={1.75} />
          {!compact && t("report")}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-6 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
                <Flag size={20} strokeWidth={1.75} />
              </span>
              <div>
                <Dialog.Title className="text-xl font-semibold">
                  {t("report")}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted">
                  {t("intro")}
                </Dialog.Description>
              </div>
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
          <form
            className="mt-6 space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const form = new FormData(e.currentTarget);
              try {
                const response = await fetch(
                  "/api/listings/" + id + "/report",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(Object.fromEntries(form)),
                  },
                );
                if (!response.ok) throw new Error();
                setMessage(t("sent"));
                setSubmitted(true);
              } catch {
                setMessage(t("error"));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="block">
              {t("reason")}
              <select
                name="reason"
                aria-label={t("reason")}
                disabled={busy || submitted}
              >
                {["PROHIBITED", "SCAM", "INAPPROPRIATE", "OTHER"].map(
                  (reason) => (
                    <option key={reason} value={reason}>
                      {t(reason)}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="block">
              {t("details")}
              <textarea
                name="details"
                maxLength={2000}
                rows={4}
                disabled={busy || submitted}
              />
            </label>
            <Button
              disabled={busy || submitted}
              variant="danger"
              className="w-full"
            >
              {t("submit")}
            </Button>
            {message && (
              <p
                role="status"
                className="rounded-lg bg-surface-muted px-4 py-3 text-center text-sm font-medium"
              >
                {message}
              </p>
            )}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
