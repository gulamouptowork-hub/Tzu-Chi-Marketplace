import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudentPage as requireStudent } from "@/lib/session";
import { ListingForm } from "@/components/listing-form";
import { PageHeader } from "@/components/ui/page-header";
export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireStudent();
  const { id } = await params;
  const listing = await db.listing.findFirst({
    where: { id, sellerId: user.id, hiddenAt: null },
    include: { images: { orderBy: { position: "asc" } } },
  });
  if (!listing) notFound();
  const t = await getTranslations("Listing");
  const locale = await getLocale();
  const [categories, points] = await Promise.all([
    db.category.findMany(),
    db.exchangePoint.findMany({ where: { active: true } }),
  ]);
  return (
    <section className="mx-auto max-w-3xl">
      <Link
        href={"/listings/" + id}
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        {t("back")}
      </Link>
      <PageHeader title={t("edit")} description={listing.title} />
      <ListingForm
        initial={listing}
        categories={categories}
        points={points}
        locale={locale}
      />
    </section>
  );
}
