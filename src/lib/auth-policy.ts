export function isAllowedSchoolEmail(
  email: string | null | undefined,
  domains: string,
): boolean {
  if (!email || !/^[^\s@]+@[^\s@]+$/.test(email)) return false;
  const domain = email.split("@")[1].toLowerCase();
  return domains
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(domain);
}

export function isAdminEmail(email: string, admins: string): boolean {
  return admins
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}
export function isVerifiedSchoolIdentity(
  provider: string | undefined,
  email: string | null | undefined,
  profile: { email?: unknown; email_verified?: unknown } | undefined,
  domains: string,
) {
  return (
    provider === "google" &&
    profile?.email_verified === true &&
    typeof profile.email === "string" &&
    profile.email.toLowerCase() === email?.toLowerCase() &&
    isAllowedSchoolEmail(email, domains)
  );
}
