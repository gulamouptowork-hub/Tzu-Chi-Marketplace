import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAllowedSchoolEmail } from "@/lib/auth-policy";
import { cache } from "react";
import { redirect } from "next/navigation";
export const requireStudent = cache(async function requireStudent() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (
    !user ||
    user.deletedAt ||
    user.suspendedAt ||
    !user.rulesAcceptedAt ||
    !isAllowedSchoolEmail(user.email, process.env.ALLOWED_EMAIL_DOMAINS ?? "")
  )
    throw new Error("FORBIDDEN");
  return user;
});
export const requireStudentPage = cache(async function requireStudentPage() {
  try {
    return await requireStudent();
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    if (error.message === "UNAUTHORIZED") redirect("/sign-in");
    if (error.message !== "FORBIDDEN") throw error;
    const session = await auth();
    const user = session?.user?.id
      ? await db.user.findUnique({ where: { id: session.user.id } })
      : null;
    if (
      user &&
      !user.deletedAt &&
      !user.suspendedAt &&
      !user.rulesAcceptedAt &&
      isAllowedSchoolEmail(user.email, process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    )
      redirect("/onboarding");
    redirect("/auth-error");
  }
});
export const requireAdmin = cache(async function requireAdmin() {
  const user = await requireStudent();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
});
export const requireAdminPage = cache(async function requireAdminPage() {
  const user = await requireStudentPage();
  if (user.role !== "ADMIN") redirect("/marketplace");
  return user;
});
