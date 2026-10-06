import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
for (const file of [".env.local", ".env"])
  if (existsSync(file)) process.loadEnvFile(file);
const db = new PrismaClient();
try {
  const domains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase());
  const emails = [
    ...new Set(
      (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (
    !emails.length ||
    emails.some(
      (email) =>
        !/^[^\s@]+@[^\s@]+$/.test(email) ||
        !domains.includes(email.split("@")[1]),
    )
  )
    throw new Error(
      "Configure ADMIN_EMAILS with verified school-domain addresses first.",
    );
  for (const email of emails) {
    await db.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      if (existing?.deletedAt || existing?.suspendedAt)
        throw new Error(
          "The configured administrator account is unavailable; review its account status first.",
        );
      if (existing?.role === "ADMIN") return;
      const admin = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { role: "ADMIN" },
          })
        : await tx.user.create({ data: { email, role: "ADMIN" } });
      await tx.adminAuditLog.create({
        data: {
          actorId: admin.id,
          action: "ADMIN_ASSIGNED",
          targetType: "user",
          targetId: admin.id,
          targetLabel: email,
          reason: "Initial administrator configured by the project owner.",
          before: { role: existing?.role ?? null },
          after: { role: "ADMIN" },
        },
      });
    });
  }
  console.log(
    `Administrator access configured for ${emails.length} account(s). School sign-in and onboarding are still required.`,
  );
} finally {
  await db.$disconnect();
}
