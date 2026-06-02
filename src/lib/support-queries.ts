import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { SupportMessageSender } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

function isMissingSupportTablesError(e: unknown): boolean {
  if (e instanceof PrismaClientKnownRequestError && e.code === "P2021") {
    const t = `${e.meta?.modelName ?? ""} ${e.message}`;
    return /support_message|support_thread|SupportMessage|SupportThread/i.test(t);
  }
  if (typeof e === "object" && e !== null && "cause" in e) {
    return isMissingSupportTablesError((e as { cause: unknown }).cause);
  }
  if (e instanceof Error) {
    const m = e.message;
    return (
      (/support_messages|support_threads/i.test(m) && /does not exist/i.test(m)) ||
      (/TableDoesNotExist/i.test(m) && /support/i.test(m))
    );
  }
  return false;
}

export async function countUnreadAdminRepliesForCustomer(customerId: string): Promise<number> {
  try {
    const thread = await prisma.supportThread.findUnique({
      where: { customerId },
      select: { id: true },
    });
    if (!thread) return 0;
    return prisma.supportMessage.count({
      where: {
        threadId: thread.id,
        sender: SupportMessageSender.ADMIN,
        readByCustomerAt: null,
      },
    });
  } catch (e) {
    if (isMissingSupportTablesError(e)) return 0;
    throw e;
  }
}

/** Badge in admin nav: customer messages not yet marked read by staff. */
export async function countUnreadCustomerSupportMessages(): Promise<number> {
  try {
    return prisma.supportMessage.count({
      where: {
        sender: SupportMessageSender.CUSTOMER,
        readByAdminAt: null,
      },
    });
  } catch (e) {
    if (isMissingSupportTablesError(e)) return 0;
    throw e;
  }
}
