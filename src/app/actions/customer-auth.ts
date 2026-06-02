"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type RegisterCustomerResult =
  | { ok: true }
  | { ok: false; error: string; emailExists?: true };

export async function registerCustomer(formData: FormData): Promise<RegisterCustomerResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { ok: false, error: "Passwords do not match." };
  }

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      error: "An account with this email already exists.",
      emailExists: true as const,
    };
  }

  const firstName = emptyToNull(String(formData.get("firstName") ?? ""));
  const lastName = emptyToNull(String(formData.get("lastName") ?? ""));
  const displayName =
    [firstName, lastName].filter((x): x is string => x != null && x.length > 0).join(" ").trim() || null;

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.customer.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      displayName,
    },
  });
  return { ok: true };
}

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t.length ? t.slice(0, 80) : null;
}
