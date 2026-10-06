import Link from "next/link";
import { ArrowRight, BookOpen, Lock, MapPin, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BrandLink } from "@/components/brand";
import { LanguageToggle } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { login } from "@/app/actions";
export default async function SignIn() {
  const t = await getTranslations("Auth");
  const a = await getTranslations("App");
  const f = await getTranslations("Feed");
  const r = await getTranslations("Rules");
  const features = [
    { icon: ShieldCheck, title: t("schoolOnly"), body: t("domain") },
    { icon: MapPin, title: f("exchange"), body: f("exchangeBody") },
    { icon: BookOpen, title: a("rules"), body: r("intro") },
  ];
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-primary-dark p-12 text-white lg:flex lg:flex-col xl:p-16">
        <div className="relative">
          <BrandLink href="/sign-in" inverse />
        </div>
        <div className="relative my-auto max-w-lg py-12">
          <p className="text-sm font-semibold tracking-wider text-blue-100">
            {t("eyebrow")}
          </p>
          <h1 className="mt-4 text-[32px] font-semibold leading-tight">
            {t("title")}
          </h1>
          <p className="mt-5 text-lg text-blue-100">{t("intro")}</p>
          <ul className="mt-10 space-y-5">
            {features.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="mt-0.5 block text-sm text-blue-100">
                    {body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-blue-200">{a("description")}</p>
      </section>
      <section className="flex flex-col bg-surface px-5 py-5 sm:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="lg:invisible">
            <BrandLink href="/sign-in" />
          </div>
          <LanguageToggle />
        </header>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <div className="mb-8 lg:hidden">
            <p className="text-sm font-semibold text-primary">{t("eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">
              {t("title")}
            </h1>
            <p className="mt-3 text-muted">{t("intro")}</p>
          </div>
          <div className="card p-6 sm:p-9">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-sky text-primary">
              <ShieldCheck size={24} strokeWidth={1.75} />
            </span>
            <h2 className="mt-6 text-2xl font-semibold">{t("schoolOnly")}</h2>
            <p className="mt-2 text-muted">{t("domain")}</p>
            <form action={login} className="mt-8">
              <Button
                size="lg"
                className="h-auto min-h-12 w-full whitespace-normal py-2 pl-2 pr-4"
              >
                <span className="flex size-8 items-center justify-center rounded-md bg-white">
                  <ShieldCheck
                    size={20}
                    strokeWidth={1.75}
                    className="text-primary"
                  />
                </span>
                <span className="flex-1 text-center">{t("signIn")}</span>
                <ArrowRight size={20} strokeWidth={1.75} />
              </Button>
            </form>
            <p className="mt-6 flex gap-2 text-xs text-muted">
              <Lock size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              {t("privacy")}
            </p>
          </div>
          <Link
            href="/about"
            className="mt-6 inline-flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {a("rules")}
            <ArrowRight size={16} strokeWidth={1.75} />
          </Link>
        </div>
      </section>
    </main>
  );
}
