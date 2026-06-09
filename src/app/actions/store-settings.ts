"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  defaultStoreSettingsState,
  parseFeaturedStripConfig,
  parseStoreProductCardConfig,
  parseStoreRecommendationCardConfig,
  type StoreFeaturedStripConfig,
  type StoreSettingsState,
} from "@/lib/store-settings-shared";

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
  const productCards = parseStoreProductCardConfig(
    state.storeProductCardConfig ?? base.storeProductCardConfig,
  );
  const recommendationCards = parseStoreRecommendationCardConfig(
    state.storeRecommendationCardConfig ?? base.storeRecommendationCardConfig,
  );
  const mode = state.cardHoverMode === "glow" ? "glow" : "zoom";

  const data = {
    storeBannerEnabled: !!state.storeBannerEnabled,
    storeBannerHtml: typeof state.storeBannerHtml === "string" ? state.storeBannerHtml : "",
    storeFeaturedStripEnabled: !!state.storeFeaturedStripEnabled,
    storeFeaturedStripConfig: strip as object,
    storeProductCardConfig: productCards as object,
    storeRecommendationCardConfig: recommendationCards as object,
    storeFooterEnabled: !!state.storeFooterEnabled,
    storeFooterHtml: typeof state.storeFooterHtml === "string" ? state.storeFooterHtml : "",
    cardHoverMode: mode,
  };

  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      companyName: "7th Leg",
      ...data,
    },
    update: data,
  });

  revalidatePath("/store");
  revalidatePath("/settings/store");

  const products = await prisma.product.findMany({ select: { slug: true } });
  for (const { slug } of products) {
    revalidatePath(`/product/${slug}`);
  }
}
