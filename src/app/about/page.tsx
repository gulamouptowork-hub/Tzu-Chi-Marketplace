import Link from "next/link";
import { Ban, HandCoins, MapPin, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PublicHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
const rules = [
  { key: "prohibited", icon: Ban, tone: "bg-danger-soft text-danger" },
  { key: "safety", icon: MapPin, tone: "bg-sky text-primary" },
  { key: "payment", icon: HandCoins, tone: "bg-warning-soft text-warning" },
  { key: "exchange", icon: ShieldCheck, tone: "bg-success-soft text-success" },
];
export default async function About() {
  const t = await getTranslations("Rules");
  const a = await getTranslations("App");
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader>
        <Button asChild variant="outline" size="sm" className="hidden sm:flex">
          <Link href="/marketplace">{t("back")}</Link>
        </Button>
      </PublicHeader>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <section className="relative overflow-hidden rounded-3xl bg-primary-dark px-6 py-12 text-white sm:px-12">
          <p className="relative text-sm font-semibold text-blue-100">
            {a("name")}
          </p>
          <h1 className="relative mt-2 text-3xl font-semibold sm:text-4xl">
            {t("title")}
          </h1>
          <p className="relative mt-3 max-w-xl text-lg text-blue-100">
            {t("intro")}
          </p>
        </section>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {rules.map(({ key, icon: Icon, tone }) => (
            <section key={key} className="card p-6 sm:p-7">
              <span
                className={
                  "flex size-11 items-center justify-center rounded-xl " + tone
                }
              >
                <Icon size={24} strokeWidth={1.75} />
              </span>
              <h2 className="mt-5 text-lg font-semibold">{t(key + "Title")}</h2>
              <p className="mt-2 leading-relaxed text-muted">{t(key)}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg">
            <Link href="/marketplace">{t("back")}</Link>
          </Button>
        </div>
      </main>
      <SiteFooter showPrivacy={false} />
    </div>
  );
}
