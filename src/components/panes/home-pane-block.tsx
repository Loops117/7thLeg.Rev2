import type { ReactNode } from "react";
import Link from "next/link";
import { EventKind, type Pane } from "@/generated/prisma/client";
import { auth as readAuthSession } from "@/auth";
import type { EventBlockPayload } from "@/lib/event-block";
import { isEventActive } from "@/lib/event-pricing";
import { getSiteConfig } from "@/lib/site-config";
import { ProductCarouselStrip } from "@/components/panes/product-carousel-strip";
import { EventGiveawayEntryForm } from "@/components/event-giveaway-entry-form";
import { StoreBannerPaneClient } from "@/components/panes/store-banner-pane-client";
import { SocialLinksPane } from "@/components/panes/social-links-pane";
import { ArtSubPane } from "@/components/panes/art-sub-pane";
import { SuggestionBoxPane } from "@/components/panes/suggestion-box-pane";
import { OrderShippingMapPaneSection } from "@/components/panes/order-shipping-map-pane";
import type { ApprovedArtGalleryItem } from "@/lib/customer-art-gallery";
import {
  IMAGE_SUBMISSION_PIN_APPEARANCE_DEFAULTS,
  type ImageSubmissionPinAppearance,
} from "@/lib/image-submission-pin-appearance-shared";
import type { StorefrontImagePin } from "@/lib/image-submission-pins-storefront";
import type { SpeciesSuggestionApprovedRow } from "@/lib/species-suggestions";
import { normalizeArtGroupKey, parseHomePaneConfig, paneSectionSurfaceStyle } from "@/lib/pane-config";
import type { StorefrontProductCard } from "@/lib/products-storefront";
import type { SiteConfigPublic } from "@/lib/site-config-types";
import { btnMainMd } from "@/lib/btn-theme-classes";

type PaneRow = Pick<Pane, "id" | "type" | "sortOrder" | "config">;

function formatEventRange(start: Date, end: Date) {
  try {
    const o = { dateStyle: "medium" as const, timeStyle: "short" as const };
    return `${start.toLocaleString(undefined, o)} – ${end.toLocaleString(undefined, o)}`;
  } catch {
    return "";
  }
}

export async function HomePaneBlock({
  pane,
  carouselProducts,
  eventBlock,
  artGalleryItems,
  artGalleryPinsBySubmissionId,
  artGalleryPinAppearance,
  approvedSuggestions,
}: {
  pane: PaneRow;
  carouselProducts?: StorefrontProductCard[] | null;
  /** When pane references an event: loaded payload, or null if event id invalid. */
  eventBlock?: EventBlockPayload | null;
  artGalleryItems?: ApprovedArtGalleryItem[];
  artGalleryPinsBySubmissionId?: Record<string, StorefrontImagePin[]>;
  artGalleryPinAppearance?: ImageSubmissionPinAppearance;
  approvedSuggestions?: SpeciesSuggestionApprovedRow[];
}) {
  const cfg = parseHomePaneConfig(pane.config, pane.type);
  const surface = paneSectionSurfaceStyle(cfg);
  const eventIdStr = cfg.eventId?.trim() ?? "";

  const defaultEventHref = eventIdStr ? `/event/${encodeURIComponent(eventIdStr)}` : "/featured";
  const ctaHref = cfg.giveawayLinkHref?.trim() || defaultEventHref;

  const storeBannerFallback: SiteConfigPublic = {
    companyName: "Shop",
    linkPreviewTitle: "",
    linkPreviewDescription: "",
    companyLogoUrl: "",
    companyLogoPlacement: "beside",
    headerShowCompanyName: true,
    headerShowCompanyLogo: true,
    productDiagonalBrandOverlay: false,
    watermarkOpacityPercent: 38,
    productDiagonalNameGapPx: 8,
    qrDefaultCenterImageUrl: "",
    labelBuilderEnabled: false,
    labelBuilderNavEnabled: true,
    navShopEnabled: true,
    navShopLabel: "Shop",
    navFeaturedEnabled: true,
    navFeaturedLabel: "Featured",
    navGalleryEnabled: true,
    navGalleryLabel: "Gallery",
    navAboutEnabled: true,
    navAboutLabel: "About",
  };
  const branding = await getSiteConfig().catch(() => storeBannerFallback);
  const storeBannerSite = pane.type === "STORE_BANNER" ? branding : null;
  const productDiagonalBrandName = branding.productDiagonalBrandOverlay ? branding.companyName : null;

  const session = await readAuthSession().catch((err: unknown) => {
    console.error("[HomePaneBlock] auth()", err);
    return null;
  });
  const customerEmail =
    session?.user?.role === "customer" && session.user.email ? session.user.email : null;

  let storeBannerEl: ReactNode = null;
  if (pane.type === "STORE_BANNER" && storeBannerSite) {
    const useSite = cfg.storeBannerUseSiteLogo !== false;
    const override = cfg.storeBannerLogoUrl?.trim() ?? "";
    const logoUrl = useSite ? override || storeBannerSite.companyLogoUrl : override;
    const maxPct = cfg.storeBannerLogoMaxWidthPct ?? 72;
    const anim =
      cfg.storeBannerAnimation === "float" || cfg.storeBannerAnimation === "none"
        ? cfg.storeBannerAnimation
        : "subtle";
    const btn = (cfg.storeBannerButtons ?? []).filter(
      (b) => b && typeof b.href === "string" && b.href.trim(),
    );
    const inner = !logoUrl ? (
      <p className="text-center text-ink/70">
        Add a <strong>company logo</strong> in{" "}
        <Link href="/settings/global" className="font-medium text-lagoon-dark underline">
          Global settings
        </Link>{" "}
        or set an override URL in this pane.
      </p>
    ) : (
      <StoreBannerPaneClient
        logoSrc={logoUrl}
        alt={storeBannerSite.companyName}
        subheading={cfg.storeBannerSubheading ?? ""}
        buttons={btn}
        maxWidthPct={maxPct}
        animation={anim}
      />
    );
    storeBannerEl = <div className="flex w-full flex-col items-center">{inner}</div>;
  }

  return (
    <section className="shadow-sm" style={surface}>
      {cfg.title ? (
        <h2 className="border-b-2 border-palm/25 px-4 py-3 text-xl font-black text-palm sm:px-6 sm:text-2xl">
          {cfg.title}
        </h2>
      ) : null}

      <div className={cfg.title ? "p-4 sm:p-6" : "p-4 pt-5 sm:p-6"}>
        {pane.type === "PRODUCT_CAROUSEL" ? (
          <div>
            {cfg.bannerTitle ? (
              <p className="text-sm font-bold uppercase tracking-wide text-palm-mid">{cfg.bannerTitle}</p>
            ) : null}
            {carouselProducts && carouselProducts.length > 0 ? (
              <div className="mt-4">
                <ProductCarouselStrip
                  products={carouselProducts}
                  autoScroll={!!cfg.autoScroll}
                  direction={cfg.carouselScrollDirection === "right" ? "right" : "left"}
                  speed1to10={cfg.carouselScrollSpeed ?? 5}
                  productDiagonalBrandName={productDiagonalBrandName}
                  productDiagonalNameGapPx={branding.productDiagonalNameGapPx}
                  watermarkOpacityPercent={branding.watermarkOpacityPercent}
                />
              </div>
            ) : (
              <div className="mt-4 rounded border-2 border-dashed border-palm/35 bg-white/40 p-8 text-center text-ink/70">
                <p>No products to show yet.</p>
                <p className="mt-2 text-sm">
                  Add catalog items in{" "}
                  <Link href="/settings/products" className="font-medium text-lagoon-dark underline">
                    Settings → Products
                  </Link>
                  . This carousel lists up to <strong>{cfg.maxItems ?? 12}</strong> items (featured first).
                </p>
              </div>
            )}
          </div>
        ) : null}

        {pane.type === "CONTENT_DUAL" ? (
          <div
            className={`grid gap-4 ${cfg.leftEnabled !== false && cfg.rightEnabled !== false ? "md:grid-cols-2" : "grid-cols-1"}`}
          >
            {cfg.leftEnabled !== false ? (
              <div
                className="pane-content-html min-h-[4rem] overflow-x-auto rounded border-2 border-palm/20 bg-white/30 p-4 text-ink [&_a]:text-lagoon-dark [&_a]:underline [&_img]:max-w-full [&_table]:max-w-full"
                dangerouslySetInnerHTML={{ __html: cfg.leftHtml ?? "" }}
              />
            ) : null}
            {cfg.rightEnabled !== false ? (
              <div
                className="pane-content-html min-h-[4rem] overflow-x-auto rounded border-2 border-palm/20 bg-white/30 p-4 text-ink [&_a]:text-lagoon-dark [&_a]:underline [&_img]:max-w-full [&_table]:max-w-full"
                dangerouslySetInnerHTML={{ __html: cfg.rightHtml ?? "" }}
              />
            ) : null}
          </div>
        ) : null}

        {pane.type === "GIVEAWAY" ? (
          <>
            {cfg.eventId?.trim() ? (
              eventBlock ? (
                <div className="rounded border-2 border-coral/50 bg-coral/10 p-6">
                  {cfg.giveawayBanner?.trim() ? (
                    <p className="text-center text-sm font-bold uppercase tracking-wide text-palm-mid">
                      {cfg.giveawayBanner}
                    </p>
                  ) : null}
                  <h3 className="mt-2 text-center text-xl font-black text-palm sm:text-2xl">{eventBlock.event.name}</h3>
                  <p className="mt-2 text-center text-sm text-ink/80">
                    {formatEventRange(eventBlock.event.startAt, eventBlock.event.endAt)}
                  </p>
                  {eventBlock.event.details?.trim() ? (
                    <div
                      className="store-rich mt-4 max-w-2xl border-t border-palm/20 pt-4 text-ink [&_a]:text-lagoon-dark [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: eventBlock.event.details }}
                    />
                  ) : null}
                  {eventBlock.products.length > 0 ? (
                    <div className="mt-6">
                      <ProductCarouselStrip
                        products={eventBlock.products}
                        autoScroll={false}
                        direction="left"
                        speed1to10={5}
                        eventId={eventBlock.event.kind === EventKind.TIMED ? eventBlock.event.id : undefined}
                        productDiagonalBrandName={productDiagonalBrandName}
                      />
                    </div>
                  ) : null}

                  {eventBlock.event.kind === EventKind.SIGNUP ? (
                    isEventActive(eventBlock.event.startAt, eventBlock.event.endAt) ? (
                      <EventGiveawayEntryForm
                        eventId={eventBlock.event.id}
                        buttonLabel={eventBlock.event.signupButtonLabel}
                        loggedInEmail={customerEmail}
                      />
                    ) : (
                      <p className="mt-4 text-center text-sm text-ink/70">Sign-up is closed for this event.</p>
                    )
                  ) : eventBlock.event.kind === EventKind.COUPON ? (
                    <div className="mt-6 space-y-3 text-center">
                      <p className="text-sm text-ink/75">
                        {isEventActive(eventBlock.event.startAt, eventBlock.event.endAt) ? (
                          <>
                            Enter code{" "}
                            <strong className="font-black text-palm">
                              {eventBlock.event.couponCode.trim() || "—"}
                            </strong>{" "}
                            at checkout.
                          </>
                        ) : (
                          "This promo window has ended."
                        )}
                      </p>
                      <Link
                        href={ctaHref}
                        className={btnMainMd}
                      >
                        {cfg.giveawayLinkLabel ?? "View eligible items"}
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-3 text-center">
                      <p className="text-sm text-ink/75">
                        {isEventActive(eventBlock.event.startAt, eventBlock.event.endAt)
                          ? "Shop items in this timed event on its page."
                          : "This sale window has ended; you can still browse linked products on the event page."}
                      </p>
                      <Link
                        href={ctaHref}
                        className={btnMainMd}
                      >
                        {cfg.giveawayLinkLabel ?? "View event & items"}
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded border-2 border-dashed border-coral/40 bg-coral/5 p-6 text-center text-ink/80">
                  <p>This block references an event that was removed or is invalid.</p>
                  <p className="mt-2 text-sm">
                    <Link href="/settings/events" className="font-medium text-lagoon-dark underline">
                      Edit events
                    </Link>{" "}
                    or update this pane in settings.
                  </p>
                </div>
              )
            ) : (
              <div className="rounded border-2 border-coral/50 bg-coral/10 p-6 text-center">
                <p className="text-lg font-black text-palm">{cfg.giveawayBanner}</p>
                {cfg.giveawayEndIso ? (
                  <p className="mt-2 text-sm text-ink/80">Ends: {cfg.giveawayEndIso}</p>
                ) : null}
                <Link
                  href={ctaHref}
                  className={`mt-4 ${btnMainMd}`}
                >
                  {cfg.giveawayLinkLabel ?? "Featured"}
                </Link>
              </div>
            )}
          </>
        ) : null}

        {storeBannerEl}

        {pane.type === "SOCIAL_LINKS" ? <SocialLinksPane links={cfg.socialLinks ?? []} /> : null}

        {pane.type === "ORDER_SHIPPING_MAP" ? <OrderShippingMapPaneSection /> : null}

        {pane.type === "ART_SUB" ? (
          <ArtSubPane
            artGroup={normalizeArtGroupKey(cfg.artGroup ?? "") ?? ""}
            subHeading={cfg.artSubHeading ?? ""}
            chooseButtonLabel={cfg.artSubChooseButtonLabel ?? "Choose artwork"}
            submitButtonLabel={cfg.artSubSubmitButtonLabel ?? "Submit artwork"}
            submitPendingLabel={cfg.artSubSubmitPendingLabel ?? "Uploading…"}
            cancelButtonLabel={cfg.artSubCancelButtonLabel ?? "Cancel"}
            isLoggedIn={!!customerEmail}
            galleryEnabled={cfg.artGalleryEnabled !== false}
            galleryItems={artGalleryItems ?? []}
            galleryAutoScroll={cfg.artGalleryAutoScroll !== false}
            galleryDirection={cfg.artGalleryScrollDirection === "right" ? "right" : "left"}
            gallerySpeed={cfg.artGalleryScrollSpeed ?? 5}
            pinsBySubmissionId={artGalleryPinsBySubmissionId ?? {}}
            pinAppearance={artGalleryPinAppearance ?? IMAGE_SUBMISSION_PIN_APPEARANCE_DEFAULTS}
          />
        ) : null}

        {pane.type === "SUGGESTION_BOX" ? (
          <SuggestionBoxPane
            subHeading={cfg.suggestionBoxHeading ?? ""}
            isLoggedIn={!!customerEmail}
            approvedSuggestions={approvedSuggestions ?? []}
          />
        ) : null}
      </div>
    </section>
  );
}
