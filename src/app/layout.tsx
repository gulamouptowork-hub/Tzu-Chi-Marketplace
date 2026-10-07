import { Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";
import { FontEnhancement } from "@/components/font-enhancement";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { ToastProvider } from "@/components/toast-provider";
import { existsSync } from "node:fs";
import { join } from "node:path";
import "./globals.css";
const chinese = localFont({
  src: "../fonts/noto-tc-regular.woff2",
  variable: "--font-chinese",
  weight: "400",
  display: "optional",
  preload: true,
});
const latin = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-latin",
});
export async function generateMetadata() {
  const t = await getTranslations("App");
  return {
    title: t("name"),
    description: t("description"),
    // Generic bag mark until the official logo is supplied; avoids a favicon 404.
    icons: {
      icon: existsSync(join(process.cwd(), "public/brand/logo.svg"))
        ? "/brand/logo.svg"
        : "/brand/mark.svg",
    },
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      data-scroll-behavior="smooth"
      lang={await getLocale()}
      className={chinese.variable + " " + latin.variable}
    >
      <body>
        <NextIntlClientProvider>
          <FontEnhancement />
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
