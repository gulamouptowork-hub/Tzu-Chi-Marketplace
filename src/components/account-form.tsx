"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CircleCheck, Mail } from "lucide-react";
import { DepartmentSelect } from "@/components/department-select";
import { Button, cn } from "@/components/ui/button";
export function AccountForm({
  name,
  email,
  year,
  campus,
  department,
}: {
  name: string;
  email: string;
  year: number | null;
  campus: string | null;
  department: string | null;
}) {
  const t = useTranslations("Onboarding");
  const d = useTranslations("Dashboard");
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="card space-y-5 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setBusy(true);
        try {
          const response = await fetch("/api/account", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.fromEntries(form)),
          });
          if (!response.ok) throw new Error();
          setMessage({ ok: true, text: d("saved") });
          router.refresh();
        } catch {
          setMessage({ ok: false, text: d("error") });
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-muted">
        <Mail size={16} strokeWidth={1.75} className="text-primary" />
        {email}
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          {t("displayName")}
          <input
            name="displayName"
            defaultValue={name}
            required
            minLength={2}
            maxLength={40}
          />
        </label>
        <label className="block">
          {t("year")}
          <input
            name="year"
            type="number"
            min={1}
            max={8}
            defaultValue={year ?? ""}
          />
        </label>
      </div>
      <DepartmentSelect initial={department ?? ""} />
      <label className="block">
        {t("meetup")}
        <select name="preferredMeetup" defaultValue={campus ?? ""}>
          <option value="">{t("none")}</option>
          {["jieren", "jianguo", "central"].map((c) => (
            <option key={c} value={c.toUpperCase()}>
              {t(c)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center justify-end gap-4 border-t border-border pt-5">
        {message && (
          <p
            role="status"
            className={cn(
              "mr-auto flex items-center gap-2 text-sm font-medium",
              message.ok ? "text-success" : "text-danger",
            )}
          >
            {message.ok && <CircleCheck size={16} strokeWidth={1.75} />}
            {message.text}
          </p>
        )}
        <Button disabled={busy}>{d("save")}</Button>
      </div>
    </form>
  );
}
