import type { Pane } from "@/generated/prisma/client";
import { HomePaneBlock } from "./home-pane-block";
import type { EventBlockPayload } from "@/lib/event-block";
import { listApprovedSpeciesSuggestionsForPane } from "@/app/actions/species-suggestions";
import {
  listApprovedArtForGallery,
  resolveArtGalleryFilter,
  type ApprovedArtGalleryItem,
} from "@/lib/customer-art-gallery";
import { getCarouselProducts, getStorefrontEventListing } from "@/lib/products-storefront";
import { normalizeArtGroupKey, parseHomePaneConfig } from "@/lib/pane-config";
import type { SpeciesSuggestionApprovedRow } from "@/lib/species-suggestions";

type PaneRow = Pick<Pane, "id" | "type" | "sortOrder" | "config">;

export type { EventBlockPayload };

export async function HomePaneStack({
  panes,
  emptyTitle,
  emptySettingsPath,
}: {
  panes: PaneRow[];
  emptyTitle: string;
  emptySettingsPath: string;
}) {
  const carouselByPaneId = new Map<string, Awaited<ReturnType<typeof getCarouselProducts>>>();
  await Promise.all(
    panes
      .filter((p) => p.type === "PRODUCT_CAROUSEL")
      .map(async (pane) => {
        const cfg = parseHomePaneConfig(pane.config, pane.type);
        const typeIds = cfg.carouselTypeIds?.length ? cfg.carouselTypeIds : null;
        const products = await getCarouselProducts(cfg.maxItems ?? 12, typeIds);
        carouselByPaneId.set(pane.id, products);
      }),
  );

  const eventBlockByPaneId = new Map<string, EventBlockPayload | null>();
  await Promise.all(
    panes
      .filter((p) => p.type === "GIVEAWAY")
      .map(async (pane) => {
        const cfg = parseHomePaneConfig(pane.config, pane.type);
        const eid = cfg.eventId?.trim();
        if (!eid) return;
        const listing = await getStorefrontEventListing(eid, 24);
        if (!listing) {
          eventBlockByPaneId.set(pane.id, null);
          return;
        }
        eventBlockByPaneId.set(pane.id, { event: listing.event, products: listing.products });
      }),
  );

  const artGalleryByPaneId = new Map<string, ApprovedArtGalleryItem[]>();
  await Promise.all(
    panes
      .filter((p) => p.type === "ART_SUB")
      .map(async (pane) => {
        const cfg = parseHomePaneConfig(pane.config, pane.type);
        const paneArtGroup = normalizeArtGroupKey(cfg.artGroup ?? "") ?? "";
        const filter = resolveArtGalleryFilter(cfg, paneArtGroup);
        const items = await listApprovedArtForGallery(filter);
        artGalleryByPaneId.set(pane.id, items);
      }),
  );

  const approvedSuggestionsByPaneId = new Map<string, SpeciesSuggestionApprovedRow[]>();
  await Promise.all(
    panes
      .filter((p) => p.type === "SUGGESTION_BOX")
      .map(async (pane) => {
        const cfg = parseHomePaneConfig(pane.config, pane.type);
        const items = await listApprovedSpeciesSuggestionsForPane(cfg.approvedSuggestionsLimit ?? 8);
        approvedSuggestionsByPaneId.set(pane.id, items);
      }),
  );

  if (panes.length === 0) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-3xl font-black tracking-tight text-palm sm:text-4xl">
          {emptyTitle}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ink/85">
          No panes yet. Sign in to{" "}
          <a href={emptySettingsPath} className="font-medium text-lagoon-dark underline">
            Settings
          </a>{" "}
          and add your first pane.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {panes.map((pane) => (
        <HomePaneBlock
          key={pane.id}
          pane={pane}
          carouselProducts={carouselByPaneId.get(pane.id) ?? null}
          eventBlock={pane.type === "GIVEAWAY" ? (eventBlockByPaneId.get(pane.id) ?? undefined) : undefined}
          artGalleryItems={pane.type === "ART_SUB" ? (artGalleryByPaneId.get(pane.id) ?? []) : undefined}
          approvedSuggestions={
            pane.type === "SUGGESTION_BOX" ? (approvedSuggestionsByPaneId.get(pane.id) ?? []) : undefined
          }
        />
      ))}
    </div>
  );
}
