import Link from "next/link";
import { ServerCrash, ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
export default async function AuthError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("Auth");
  const a = await getTranslations("App");
  const e = await getTranslations("Errors");
  // Auth.js sends AccessDenied when the sign-in policy rejects an account;
  // other codes (such as Configuration) mean the server failed.
  const { error } = await searchParams;
  const serverProblem = Boolean(error && error !== "AccessDenied");
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <StatusMessage
        icon={serverProblem ? ServerCrash : ShieldAlert}
        tone={serverProblem ? "red" : "amber"}
        title={t(serverProblem ? "serverErrorTitle" : "errorTitle")}
        body={t(serverProblem ? "serverErrorBody" : "errorBody")}
      >
        <Button asChild>
          <Link href="/sign-in">{serverProblem ? e("retry") : t("retry")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/about">{a("rules")}</Link>
        </Button>
      </StatusMessage>
    </div>
  );
}
