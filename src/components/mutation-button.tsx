"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { VariantProps } from "class-variance-authority";
import { useToast } from "@/components/toast-provider";
import { Button, buttonVariants } from "@/components/ui/button";
export function MutationButton({
  url,
  body,
  label,
  method = "PATCH",
  variant = "outline",
  size,
  className,
  pressed,
  confirm,
}: {
  url: string;
  body?: Record<string, unknown>;
  label: string;
  method?: string;
  className?: string;
  pressed?: boolean;
  /** Asks before running irreversible actions. */
  confirm?: string;
} & VariantProps<typeof buttonVariants>) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const t = useTranslations("Listing");
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      aria-pressed={pressed}
      disabled={busy}
      onClick={async () => {
        if (confirm && !window.confirm(confirm)) return;
        setBusy(true);
        try {
          const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : undefined,
          });
          if (!response.ok) throw new Error();
          toast(t("done"));
          router.refresh();
        } catch {
          toast(t("error"));
        } finally {
          setBusy(false);
        }
      }}
    >
      {label}
    </Button>
  );
}
