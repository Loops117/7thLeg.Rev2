import { prisma } from "@/lib/prisma";
import {
  defaultInBreedingPageSettingsState,
  parseInBreedingPageSettings,
  type InBreedingPageSettingsState,
} from "@/lib/in-breeding-settings-shared";

export type { InBreedingPageSettingsState } from "@/lib/in-breeding-settings-shared";
export {
  defaultInBreedingPageSettingsState,
  IN_BREEDING_PAGE_TITLE_DEFAULT,
} from "@/lib/in-breeding-settings-shared";

const select = {
  inBreedingPageTitle: true,
  inBreedingPageEnabled: true,
  inBreedingBannerEnabled: true,
  inBreedingBannerHtml: true,
  inBreedingFeaturedStripEnabled: true,
  inBreedingFeaturedStripConfig: true,
  inBreedingProductCardConfig: true,
  inBreedingFooterEnabled: true,
  inBreedingFooterHtml: true,
} as const;

export async function getInBreedingPageSettings(): Promise<InBreedingPageSettingsState> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 }, select });
    return parseInBreedingPageSettings(row);
  } catch {
    return defaultInBreedingPageSettingsState();
  }
}
