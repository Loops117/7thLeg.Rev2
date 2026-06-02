"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SiteFooterSettings } from "@/lib/site-footer-settings-shared";
import { parseSiteFooterConfigBlob } from "@/lib/site-footer-settings";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
}

function revalidateFooterPaths() {
  const paths = ["/", "/store", "/featured", "/about", "/cart", "/settings/footer"];
  for (const p of paths) revalidatePath(p);
}

export async function updateSiteFooterSettings(
  state: SiteFooterSettings,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const config = parseSiteFooterConfigBlob(state);
    await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        companyName: "Inverts Oasis",
        siteFooterConfig: config as object,
      },
      update: { siteFooterConfig: config as object },
    });
    revalidateFooterPaths();
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save.";
    return { ok: false, error: message };
  }
}
