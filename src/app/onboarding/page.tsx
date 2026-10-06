import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { onboard } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { DepartmentSelect } from "@/components/department-select";
import { PublicHeader } from "@/components/site-chrome";
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.deletedAt || user.suspendedAt) redirect("/auth-error");
  if (user.rulesAcceptedAt) redirect("/marketplace");
  const t = await getTranslations("Onboarding");
  const a = await getTranslations("App");
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:py-14">
        <div className="card p-6 sm:p-9">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-sky text-primary">
            <UserRound size={24} strokeWidth={1.75} />
          </span>
          <h1 className="mt-5 text-2xl font-semibold">{t("title")}</h1>
          <p className="mt-2 text-muted">{t("intro")}</p>
          <form action={onboard} className="mt-8 space-y-5">
            {(await searchParams).error && (
              <p
                role="alert"
                className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"
              >
                {t("error")}
              </p>
            )}
            <label className="block">
              {t("displayName")}
              <input
                name="displayName"
                required
                minLength={2}
                maxLength={40}
                defaultValue={user.name ?? ""}
              />
            </label>
            <DepartmentSelect />
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                {t("year")}
                <input name="year" type="number" min={1} max={8} />
              </label>
              <label className="block">
                {t("meetup")}
                <select name="preferredMeetup">
                  <option value="">{t("none")}</option>
                  {["jieren", "jianguo", "central"].map((c) => (
                    <option key={c} value={c.toUpperCase()}>
                      {t(c)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-primary/15 bg-sky p-4">
              <input type="checkbox" name="accept" required className="mt-1" />
              <span>
                {t("accept")}{" "}
                <Link
                  className="font-semibold text-primary underline underline-offset-2"
                  href="/about"
                >
                  {a("rules")}
                </Link>
              </span>
            </label>
            <Button size="lg" className="w-full">
              {t("submit")}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
