"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import catalogue from "../../messages/departments.json";
export async function login() {
  await signIn("google", { redirectTo: "/marketplace" });
}
export async function logout() {
  await signOut({ redirectTo: "/sign-in" });
}
export async function toggleLocale() {
  const jar = await cookies();
  jar.set("locale", jar.get("locale")?.value === "en" ? "zh-TW" : "en", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 31536000,
  });
}
const schema = z.object({
  displayName: z.string().trim().min(2).max(40),
  department: z.string().trim().min(2).max(80),
  year: z.union([z.literal(""), z.coerce.number().int().min(1).max(8)]),
  preferredMeetup: z.enum(["", "JIEREN", "JIANGUO", "CENTRAL"]),
  accept: z.literal("on"),
});
export async function onboard(form: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.deletedAt || user.suspendedAt) redirect("/auth-error");
  const result = schema.safeParse(Object.fromEntries(form));
  if (!result.success) redirect("/onboarding?error=validation");
  const { displayName, year, preferredMeetup } = result.data;
  const chosenDepartment = catalogue.departments.find(
    (d) => d.id === result.data.department,
  );
  if (!chosenDepartment) redirect("/onboarding?error=validation");
  const department = chosenDepartment.name;
  await db.user.update({
    where: { id: user.id },
    data: {
      displayName,
      department,
      year: year === "" ? null : year,
      preferredMeetup: preferredMeetup || null,
      rulesAcceptedAt: new Date(),
    },
  });
  redirect("/marketplace");
}
