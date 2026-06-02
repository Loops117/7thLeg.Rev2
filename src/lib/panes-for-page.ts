import { PageKey } from "@/generated/prisma/enums";

/** Loads panes for a storefront page; returns [] on failure so the UI still renders (e.g. DB unreachable in prod). */
export async function loadPanesForPage(page: PageKey) {
  try {
    const { prisma } = await import("@/lib/prisma");
    return await prisma.pane.findMany({
      where: { page },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, type: true, sortOrder: true, config: true },
    });
  } catch (err) {
    console.error("[loadPanesForPage]", page, err);
    return [];
  }
}
