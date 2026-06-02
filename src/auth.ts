import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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

        const admin = await prisma.adminUser.findUnique({ where: { email } });
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
