"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
export function DeleteAccount() {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState(false);
  return (
    <section className="mt-6 rounded-2xl border border-danger/20 bg-surface p-6">
      <div className="flex gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
          <TriangleAlert size={20} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{t("deleteAccount")}</h2>
          <p className="mt-1 text-sm text-muted">{t("deleteAccountHint")}</p>
          <div className="mt-4">
            {!confirm ? (
              <Button variant="danger-outline" onClick={() => setConfirm(true)}>
                {t("deleteAccount")}
              </Button>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="danger"
                  onClick={async () => {
                    const result = await fetch("/api/account", {
                      method: "DELETE",
                    });
                    if (result.ok) router.push("/sign-in");
                    else setError(true);
                  }}
                >
                  {t("confirmDelete")}
                </Button>
                <Button variant="ghost" onClick={() => setConfirm(false)}>
                  {t("cancel")}
                </Button>
              </div>
            )}
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {t("error")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
