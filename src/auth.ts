import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { hasAuthSecretConfigured } from "@/lib/auth-secret";
import { prisma } from "@/lib/prisma";

if (!hasAuthSecretConfigured() && process.env.NODE_ENV === "production") {
  console.error(
    "[auth] Missing AUTH_SECRET (or NEXTAUTH_SECRET). Admin/customer sign-in will fail with a configuration error.",
  );
}

/** Do not pass `secret` here — Auth.js reads AUTH_SECRET at runtime (Vercel only injects env then). */
export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      id: "admin-credentials",
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (!email || !password || typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const normalizedEmail = email.trim().toLowerCase();
        const admin = await prisma.adminUser.findFirst({
          where: { email: { equals: normalizedEmail, mode: "insensitive" } },
        });
        if (!admin) return null;

        const valid = await bcrypt.compare(password, admin.passwordHash);
        if (!valid) return null;

        return { id: admin.id, email: admin.email, role: "admin" };
      },
    }),
    Credentials({
      id: "customer-credentials",
      name: "Customer",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (!email || !password || typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const customer = await prisma.customer.findUnique({ where: { email: email.trim().toLowerCase() } });
        if (!customer) return null;

        const valid = await bcrypt.compare(password, customer.passwordHash);
        if (!valid) return null;

        return { id: customer.id, email: customer.email, role: "customer" };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        if (user.email) token.email = user.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as string | undefined;
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/settings/login",
  },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
});
