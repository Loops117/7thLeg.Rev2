"use server";

import { randomInt } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { EventGiveawayRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { escapeHtml, sendHtmlEmail } from "@/lib/send-email";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

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

function shuffleEntryIds(ids: string[]): string[] {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const DEFAULT_EMAIL_BODY = `You were selected in {{eventName}}.

Event page: {{eventUrl}}

This message was sent automatically.`;

function applyTemplate(
  tpl: string,
  vars: { email: string; eventName: string; eventUrl: string; role: string },
): string {
  return tpl
    .replaceAll("{{email}}", vars.email)
    .replaceAll("{{eventName}}", vars.eventName)
    .replaceAll("{{eventUrl}}", vars.eventUrl)
    .replaceAll("{{role}}", vars.role);
}

function buildEmailHtml(body: string, subject: string): { subject: string; html: string } {
  const withBreaks = escapeHtml(body).replace(/\n/g, "<br>\n");
  return {
    subject: subject.slice(0, 300),
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5">${withBreaks}</body></html>`,
  };
}

export type GiveawayWinnerRow = {
  id: string;
  email: string;
  role: EventGiveawayRole;
  position: number;
  emailSentAt: string | null;
  eventEntryId: string;
};

export async function listEventGiveawayWinners(eventId: string): Promise<GiveawayWinnerRow[]> {
  await requireAdmin();
  const rows = await prisma.eventGiveawayWinner.findMany({
    where: { eventId },
    orderBy: [{ role: "asc" }, { position: "asc" }],
    include: {
      entry: { select: { email: true } },
    },
  });
  return rows.map((w) => ({
    id: w.id,
    email: w.entry.email,
    role: w.role,
    position: w.position,
    emailSentAt: w.emailSentAt ? w.emailSentAt.toISOString() : null,
    eventEntryId: w.eventEntryId,
  }));
}

export type DrawGiveawayResult = { ok: true; primary: number; backup: number; emailed: number } | { ok: false; error: string };

/**
 * Picks new random primary + backup winners. Replaces any previous draw. Optionally emails (event setting or explicit send in draw path).
 */
export async function runEventGiveawayDraw(eventId: string): Promise<DrawGiveawayResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.kind !== "SIGNUP") {
    return { ok: false, error: "Not a sign-up / giveaway event." };
  }

  const primaryN = Math.min(500, Math.max(1, event.giveawayPrimaryCount));
  const backupN = Math.min(500, Math.max(0, event.giveawayBackupCount));
  const entries = await prisma.eventEntry.findMany({
    where: { eventId },
    select: { id: true, email: true },
  });
  if (entries.length < primaryN) {
    return {
      ok: false,
      error: `Not enough sign-ups. Need at least ${primaryN} for primary winners; have ${entries.length}.`,
    };
  }

  const ids = shuffleEntryIds(entries.map((e) => e.id));
  const emailById = new Map(entries.map((e) => [e.id, e.email] as const));
  const pickPrimary = ids.slice(0, primaryN);
  const used = new Set(pickPrimary);
  const rest = ids.filter((id) => !used.has(id));
  const needBackup = Math.min(backupN, rest.length);
  const pickBackup = rest.slice(0, needBackup);

  const origin = await requestOrigin();
  const eventUrl = `${origin}/event/${eventId}`;
  const eventName = event.name;
  const subj = event.giveawayEmailSubject.trim() || "Congratulations — you won!";
  const bodyTpl = event.giveawayEmailBody.trim() || DEFAULT_EMAIL_BODY;

  let emailed = 0;
  const sendNow = event.giveawaySendEmailOnDraw;

  const result = await prisma.$transaction(async (tx) => {
    await tx.eventGiveawayWinner.deleteMany({ where: { eventId } });
    let pos = 0;
    for (const entryId of pickPrimary) {
      await tx.eventGiveawayWinner.create({
        data: {
          eventId,
          eventEntryId: entryId,
          role: "PRIMARY",
          position: pos++,
        },
      });
    }
    pos = 0;
    for (const entryId of pickBackup) {
      await tx.eventGiveawayWinner.create({
        data: {
          eventId,
          eventEntryId: entryId,
          role: "BACKUP",
          position: pos++,
        },
      });
    }
    return { pickPrimary, pickBackup };
  });

  if (sendNow) {
    for (const entryId of result.pickPrimary) {
      const email = emailById.get(entryId);
      if (!email) continue;
      const { subject, html } = buildEmailHtml(
        applyTemplate(bodyTpl, {
          email,
          eventName,
          eventUrl,
          role: "Primary winner",
        }),
        applyTemplate(subj, {
          email,
          eventName,
          eventUrl,
          role: "Primary winner",
        }),
      );
      const r = await sendHtmlEmail({ to: email, subject, html });
      if (r.ok) {
        emailed++;
        await prisma.eventGiveawayWinner.updateMany({
          where: { eventId, eventEntryId: entryId, role: "PRIMARY" },
          data: { emailSentAt: new Date() },
        });
      }
    }
    for (const entryId of result.pickBackup) {
      const email = emailById.get(entryId);
      if (!email) continue;
      const { subject, html } = buildEmailHtml(
        applyTemplate(bodyTpl, {
          email,
          eventName,
          eventUrl,
          role: "Backup winner",
        }),
        applyTemplate(subj, {
          email,
          eventName,
          eventUrl,
          role: "Backup winner",
        }),
      );
      const r = await sendHtmlEmail({ to: email, subject, html });
      if (r.ok) {
        emailed++;
        await prisma.eventGiveawayWinner.updateMany({
          where: { eventId, eventEntryId: entryId, role: "BACKUP" },
          data: { emailSentAt: new Date() },
        });
      }
    }
  }

  revalidatePath("/settings/events", "page");
  revalidatePath(`/event/${eventId}`, "page");

  return { ok: true, primary: result.pickPrimary.length, backup: result.pickBackup.length, emailed };
}

export type EmailGiveawayResult = { ok: true; sent: number; failed: string | null } | { ok: false; error: string };

/** Email winners with no `emailSentAt` yet. */
export async function sendUnsentGiveawayEmails(eventId: string): Promise<EmailGiveawayResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.kind !== "SIGNUP") {
    return { ok: false, error: "Not a sign-up event." };
  }
  const rows = await prisma.eventGiveawayWinner.findMany({
    where: { eventId, emailSentAt: null },
    include: { entry: { select: { email: true } } },
  });
  if (rows.length === 0) {
    return { ok: true, sent: 0, failed: null };
  }

  const origin = await requestOrigin();
  const eventUrl = `${origin}/event/${eventId}`;
  const eventName = event.name;
  const subj = event.giveawayEmailSubject.trim() || "Congratulations — you won!";
  const bodyTpl = event.giveawayEmailBody.trim() || DEFAULT_EMAIL_BODY;

  let sent = 0;
  let failed: string | null = null;
  for (const w of rows) {
    const email = w.entry.email;
    const roleLabel = w.role === "PRIMARY" ? "Primary winner" : "Backup winner";
    const { subject, html } = buildEmailHtml(
      applyTemplate(bodyTpl, { email, eventName, eventUrl, role: roleLabel }),
      applyTemplate(subj, { email, eventName, eventUrl, role: roleLabel }),
    );
    const r = await sendHtmlEmail({ to: email, subject, html });
    if (r.ok) {
      sent++;
      await prisma.eventGiveawayWinner.update({
        where: { id: w.id },
        data: { emailSentAt: new Date() },
      });
    } else {
      failed = r.error ?? "Send failed";
    }
  }
  revalidatePath("/settings/events", "page");
  return { ok: true, sent, failed: sent < rows.length ? failed : null };
}
