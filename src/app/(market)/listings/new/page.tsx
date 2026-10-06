import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { ListingForm } from "@/components/listing-form";
import { PageHeader } from "@/components/ui/page-header";
export default async function NewListing() {
  const t = await getTranslations("ListingForm");
  const locale = await getLocale();
  const [categories, points] = await Promise.all([
    db.category.findMany(),
    db.exchangePoint.findMany({ where: { active: true } }),
  ]);
  return (
    <section className="mx-auto max-w-3xl">
      <PageHeader title={t("heading")} description={t("intro")} />
      <ListingForm categories={categories} points={points} locale={locale} />
    </section>
  );
}
