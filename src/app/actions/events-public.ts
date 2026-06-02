"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isEventActive } from "@/lib/event-pricing";
import { revalidatePath } from "next/cache";

export type EnterGiveawayResult =
  | { ok: true }
  | { ok: false; error: string };

function isValidEmail(raw: string): boolean {
  const s = raw.trim();
  if (s.length < 3 || s.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function enterEventGiveaway(eventId: string, emailRaw: string): Promise<EnterGiveawayResult> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, kind: true, startAt: true, endAt: true },
  });
  if (!event || event.kind !== "SIGNUP") {
    return { ok: false, error: "This event is not open for sign-up." };
  }
  if (!isEventActive(event.startAt, event.endAt)) {
    return { ok: false, error: "Sign-up is not active for this event right now." };
  }

  const session = await auth();
  const email =
    session?.user?.role === "customer" && session.user.email
      ? session.user.email.trim().toLowerCase()
      : emailRaw.trim().toLowerCase();

  if (!isValidEmail(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const customerId =
    session?.user?.role === "customer" && session.user.id ? session.user.id : null;

  try {
    await prisma.eventEntry.create({
      data: {
        eventId,
        email,
        customerId,
      },
    });
  } catch {
    return { ok: false, error: "You’re already signed up with this email." };
  }

  revalidatePath(`/event/${eventId}`, "page");
  revalidatePath("/");
  revalidatePath("/featured");
  revalidatePath("/about");
  return { ok: true };
}
