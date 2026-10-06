"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function FilterDrawer({
  children,
  count,
}: {
  children: React.ReactNode;
  count: number;
}) {
  const t = useTranslations("Listing");
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <Button
            variant="outline"
            className="fixed bottom-24 right-4 z-30 rounded-xl border-primary/20 shadow-md sm:right-6 md:bottom-6"
          >
            <SlidersHorizontal
              size={20}
              strokeWidth={1.75}
              className="text-primary"
            />
            {t("filterCount", { count })}
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="filter-overlay fixed inset-0 z-40 bg-slate-900/40" />
          <Dialog.Content
            className="filter-drawer fixed inset-y-0 right-0 z-50 flex h-[100dvh] w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <Dialog.Title className="text-lg font-semibold">
                {t("filters")}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label={t("close")}>
                  <X size={20} strokeWidth={1.75} />
                </Button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              {t("filterDescription")}
            </Dialog.Description>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
              {children}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
