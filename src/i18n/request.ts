import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
export default getRequestConfig(async () => {
  const locale =
    (await cookies()).get("locale")?.value === "en" ? "en" : "zh-TW";
  return {
    locale,
    // Campus dates read in Taipei time regardless of the host's time zone.
    timeZone: "Asia/Taipei",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
