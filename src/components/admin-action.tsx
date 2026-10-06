"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
export function AdminAction({
  label,
  body,
  danger = false,
}: {
  label: string;
  body: {
    action: "listing" | "user" | "report";
    id: string;
    hide?: boolean;
    suspend?: boolean;
  };
  danger?: boolean;
}) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!busy) {
          setOpen(value);
          setError("");
        }
      }}
    >
      <Dialog.Trigger asChild>
        <Button size="sm" variant={danger ? "danger-outline" : "outline"}>
          {label}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold">{label}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted">
            {t(
              body.action === "user" && body.suspend
                ? "suspendHint"
                : body.action === "listing" && body.hide
                  ? "hideHint"
                  : "actionHint",
            )}
          </Dialog.Description>
          <form
            className="mt-5 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const reason = String(
                new FormData(event.currentTarget).get("reason") ?? "",
              );
              setBusy(true);
              setError("");
              try {
                const response = await fetch("/api/admin", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...body, reason }),
                });
                if (!response.ok) throw new Error();
                toast(t("actionSaved"));
                setOpen(false);
                router.refresh();
              } catch {
                setError(t("actionError"));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="block">
              {t("reason")}
              <textarea
                name="reason"
                maxLength={500}
                rows={3}
                disabled={busy}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" disabled={busy}>
                  {t("cancel")}
                </Button>
              </Dialog.Close>
              <Button disabled={busy} variant={danger ? "danger" : "default"}>
                {t(busy ? "saving" : "confirm")}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
