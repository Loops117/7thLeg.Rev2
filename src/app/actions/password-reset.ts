"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { escapeHtml, sendHtmlEmail } from "@/lib/send-email";

const RESET_TTL_MS = 60 * 60 * 1000;

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) {
    return `${proto}://${host}`;
  }
  const authUrl = process.env.AUTH_URL?.replace(/\/$/, "");
  if (authUrl) return authUrl;
  return "http://localhost:3000";
}

export type PasswordResetRequestResult =
  | { ok: true; devResetUrl?: string }
  | { ok: false; error: string };

/** Always returns ok: true to callers when email format is valid (do not leak accounts). */
export async function requestCustomerPasswordReset(formData: FormData): Promise<PasswordResetRequestResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email." };
  }

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer) {
    return { ok: true };
  }

  await prisma.customerPasswordResetToken.deleteMany({
    where: { customerId: customer.id },
  });

  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.customerPasswordResetToken.create({
    data: {
      customerId: customer.id,
      token: rawToken,
      expiresAt,
    },
  });

  const origin = await requestOrigin();
  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(rawToken)}`;

  const safeUrl = escapeHtml(resetUrl);
  const result = await sendHtmlEmail({
    to: email,
    subject: "Reset your 7th Leg password",
    html: `<p>Hi,</p><p><a href="${safeUrl}">Click here to choose a new password</a>.</p><p>This link expires in one hour. If you didn’t ask for this, you can ignore this email.</p>`,
    text: `Reset your password: ${resetUrl}\n\nThis link expires in one hour.`,
  });
  if (!result.ok) {
    console.error("[password reset]", result.error);
    if (process.env.NODE_ENV === "development") {
      console.warn("[password reset] Reset URL (dev):", resetUrl);
    }
  }

  const devResetUrl =
    process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "development" ? resetUrl : undefined;

  return { ok: true, devResetUrl };
}

export type PasswordResetConfirmResult = { ok: true } | { ok: false; error: string };

export async function confirmCustomerPasswordReset(formData: FormData): Promise<PasswordResetConfirmResult> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) {
    return { ok: false, error: "Invalid or missing reset link." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { ok: false, error: "Passwords do not match." };
  }

  const row = await prisma.customerPasswordResetToken.findUnique({
    where: { token },
    include: { customer: true },
  });

  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return { ok: false, error: "This link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: row.customerId },
      data: { passwordHash },
    }),
    prisma.customerPasswordResetToken.deleteMany({
      where: { customerId: row.customerId },
    }),
  ]);

  return { ok: true };
}
