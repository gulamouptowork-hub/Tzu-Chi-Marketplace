import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { isAdminEmail, isVerifiedSchoolIdentity } from "@/lib/auth-policy";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Google({
      authorization: { params: { prompt: "select_account" } },
      // Seeded school users may link only through Google. The callback below
      // requires the provider's verified email and exact allowed school domain.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: { signIn: "/sign-in", error: "/auth-error" },
  callbacks: {
    async signIn({ user, profile, account }) {
      if (
        !isVerifiedSchoolIdentity(
          account?.provider,
          user.email,
          profile,
          process.env.ALLOWED_EMAIL_DOMAINS ?? "",
        )
      )
        return false;
      const existing = await db.user.findUnique({
        where: { email: user.email! },
      });
      return !existing?.suspendedAt && !existing?.deletedAt;
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (
        user.id &&
        user.email &&
        isAdminEmail(user.email, process.env.ADMIN_EMAILS ?? "")
      ) {
        await db.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        });
      }
    },
    async createUser({ user }) {
      if (
        user.email &&
        isAdminEmail(user.email, process.env.ADMIN_EMAILS ?? "")
      ) {
        await db.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        });
      }
    },
  },
});
