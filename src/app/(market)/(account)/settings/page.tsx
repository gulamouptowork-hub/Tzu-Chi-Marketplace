import { getTranslations } from "next-intl/server";
import { requireStudentPage as requireStudent } from "@/lib/session";
import { AccountForm } from "@/components/account-form";
import { DeleteAccount } from "@/components/delete-account";
import { PageHeader } from "@/components/ui/page-header";
export default async function Settings() {
  const user = await requireStudent();
  const t = await getTranslations("Dashboard");
  const o = await getTranslations("Onboarding");
  return (
    <section className="max-w-3xl">
      <PageHeader title={t("settings")} description={o("intro")} />
      <AccountForm
        name={user.displayName ?? ""}
        email={user.email}
        year={user.year}
        campus={user.preferredMeetup}
        department={user.department}
      />
      <DeleteAccount />
    </section>
  );
}
