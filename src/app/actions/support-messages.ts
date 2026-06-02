"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { auth } from "@/auth";
import { SupportMessageSender } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const MAX_BODY = 4000;

async function requireCustomerId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "customer") {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

async function ensureThread(customerId: string) {
  return prisma.supportThread.upsert({
    where: { customerId },
    create: { customerId },
    update: {},
    select: { id: true },
  });
}

function normalizeBody(raw: string): string {
  const t = raw.trim();
  if (!t) throw new Error("Message is empty");
  if (t.length > MAX_BODY) throw new Error("Message is too long");
  return t;
}

export type SupportMessageRow = {
  id: string;
  sender: "CUSTOMER" | "ADMIN";
  body: string;
  createdAt: string;
};

function revalidateSupportPaths() {
  revalidatePath("/account/messages");
  revalidatePath("/account/orders");
  revalidatePath("/account/profile");
  revalidatePath("/account");
  revalidatePath("/settings/messages");
}

/** `revalidatePath` must not run during RSC render; `after` runs it once the response is done. */
function scheduleRevalidateSupportPaths() {
  after(() => {
    revalidateSupportPaths();
  });
}

export async function listCustomerSupportMessages(): Promise<SupportMessageRow[]> {
  const customerId = await requireCustomerId();
  const thread = await ensureThread(customerId);
  const messages = await prisma.supportMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    take: 300,
    select: { id: true, sender: true, body: true, createdAt: true },
  });
  return messages.map((m) => ({
    id: m.id,
    sender: m.sender,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function sendCustomerSupportMessage(body: string) {
  const customerId = await requireCustomerId();
  const text = normalizeBody(body);
  const thread = await ensureThread(customerId);
  await prisma.supportMessage.create({
    data: {
      threadId: thread.id,
      sender: SupportMessageSender.CUSTOMER,
      body: text,
    },
  });
  revalidateSupportPaths();
}

/** Call when the customer opens the floating chat or the Messages page. */
export async function markAdminRepliesReadForCustomer() {
  const customerId = await requireCustomerId();
  const thread = await prisma.supportThread.findUnique({
    where: { customerId },
    select: { id: true },
  });
  if (!thread) return;
  const now = new Date();
  await prisma.supportMessage.updateMany({
    where: {
      threadId: thread.id,
      sender: SupportMessageSender.ADMIN,
      readByCustomerAt: null,
    },
    data: { readByCustomerAt: now },
  });
  scheduleRevalidateSupportPaths();
}

export type AdminSupportThreadSummary = {
  id: string;
  customerId: string;
  customerEmail: string;
  customerLabel: string;
  updatedAt: string;
  preview: string;
  unreadCount: number;
};

export async function listAdminSupportThreads(): Promise<AdminSupportThreadSummary[]> {
  await requireAdminSession();
  const threads = await prisma.supportThread.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { email: true, firstName: true, lastName: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, sender: true },
      },
    },
  });

  const unreadGroups = await prisma.supportMessage.groupBy({
    by: ["threadId"],
    where: {
      sender: SupportMessageSender.CUSTOMER,
      readByAdminAt: null,
    },
    _count: { _all: true },
  });
  const unreadMap = new Map(unreadGroups.map((g) => [g.threadId, g._count._all]));

  return threads.map((t) => {
    const last = t.messages[0];
    const name = [t.customer.firstName, t.customer.lastName].filter(Boolean).join(" ").trim();
    return {
      id: t.id,
      customerId: t.customerId,
      customerEmail: t.customer.email,
      customerLabel: name || t.customer.email,
      updatedAt: t.updatedAt.toISOString(),
      preview: last?.body?.slice(0, 140) ?? "",
      unreadCount: unreadMap.get(t.id) ?? 0,
    };
  });
}

export async function listMessagesForAdminThread(threadId: string): Promise<SupportMessageRow[]> {
  await requireAdminSession();
  const thread = await prisma.supportThread.findUnique({ where: { id: threadId }, select: { id: true } });
  if (!thread) return [];
  const messages = await prisma.supportMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: 400,
    select: { id: true, sender: true, body: true, createdAt: true },
  });
  return messages.map((m) => ({
    id: m.id,
    sender: m.sender,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function sendAdminSupportMessage(threadId: string, body: string) {
  await requireAdminSession();
  const text = normalizeBody(body);
  const thread = await prisma.supportThread.findUnique({ where: { id: threadId }, select: { id: true } });
  if (!thread) throw new Error("Thread not found");
  await prisma.supportMessage.create({
    data: {
      threadId,
      sender: SupportMessageSender.ADMIN,
      body: text,
    },
  });
  revalidateSupportPaths();
}

/** Call when staff opens a thread (marks all customer messages in that thread read). */
export async function markCustomerMessagesReadForAdmin(threadId: string) {
  await requireAdminSession();
  const now = new Date();
  await prisma.supportMessage.updateMany({
    where: {
      threadId,
      sender: SupportMessageSender.CUSTOMER,
      readByAdminAt: null,
    },
    data: { readByAdminAt: now },
  });
  scheduleRevalidateSupportPaths();
}
