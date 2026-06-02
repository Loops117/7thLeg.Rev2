"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STOREFRONT_NAV_LINK_DEFAULTS } from "@/lib/storefront-nav-settings-shared";
import {
  getStorefrontNavSettings,
  storefrontNavPrismaData,
  type StorefrontNavLinkId,
  type StorefrontNavLinkState,
} from "@/lib/storefront-nav-settings";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
}

function revalidateStorefrontNav() {
  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath("/featured");
  revalidatePath("/about");
  revalidatePath("/settings/store");
  revalidatePath("/settings/featured");
  revalidatePath("/settings/about");
}

export async function updateStorefrontNavLink(
  linkId: StorefrontNavLinkId,
  patch: Partial<StorefrontNavLinkState>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const current = await getStorefrontNavSettings();
    const next: StorefrontNavLinkState = {
      enabled: patch.enabled ?? current[linkId].enabled,
      label: patch.label ?? current[linkId].label,
    };
    const merged = { ...current, [linkId]: next };
    await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        companyName: "Inverts Oasis",
        ...storefrontNavPrismaData(merged),
      },
      update: storefrontNavPrismaData(merged),
    });
    revalidateStorefrontNav();
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save.";
    return { ok: false, error: message };
  }
}

export async function updateStorefrontNavLinkEnabled(
  linkId: StorefrontNavLinkId,
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return updateStorefrontNavLink(linkId, { enabled });
}

export async function updateStorefrontNavLinkLabel(
  linkId: StorefrontNavLinkId,
  label: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fallback = STOREFRONT_NAV_LINK_DEFAULTS[linkId].label;
  if (!label.trim()) {
    return { ok: false, error: `Enter a label (e.g. ${fallback}).` };
  }
  return updateStorefrontNavLink(linkId, { label });
}
