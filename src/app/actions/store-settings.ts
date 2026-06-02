"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  defaultStoreSettingsState,
  parseFeaturedStripConfig,
  type StoreFeaturedStripConfig,
  type StoreSettingsState,
} from "@/lib/store-settings";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
}

function normalizeStrip(c: StoreFeaturedStripConfig): StoreFeaturedStripConfig {
  const parsed = parseFeaturedStripConfig(c);
  return parsed;
}

export async function updateStoreSettings(state: StoreSettingsState) {
  await requireAdmin();
  const base = defaultStoreSettingsState();
  const strip = normalizeStrip(state.storeFeaturedStripConfig ?? base.storeFeaturedStripConfig);
  const mode = state.cardHoverMode === "glow" ? "glow" : "zoom";

  const data = {
    storeBannerEnabled: !!state.storeBannerEnabled,
    storeBannerHtml: typeof state.storeBannerHtml === "string" ? state.storeBannerHtml : "",
    storeFeaturedStripEnabled: !!state.storeFeaturedStripEnabled,
    storeFeaturedStripConfig: strip as object,
    storeFooterEnabled: !!state.storeFooterEnabled,
    storeFooterHtml: typeof state.storeFooterHtml === "string" ? state.storeFooterHtml : "",
    cardHoverMode: mode,
  };

  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      companyName: "Inverts Oasis",
      ...data,
    },
    update: data,
  });

  revalidatePath("/store");
  revalidatePath("/settings/store");
}
