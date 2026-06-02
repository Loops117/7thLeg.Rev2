"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { PageKey, PaneType } from "@/generated/prisma/enums";
import { PaneType as PaneTypeEnum } from "@/generated/prisma/enums";
import { uploadThemeDecorImage } from "@/app/actions/theme-admin";
import {
  createHomePane,
  deleteHomePane,
  moveHomePane,
  updateHomePane,
} from "@/app/actions/home-panes";
import { btnImportantSm, btnSecondaryMd } from "@/lib/btn-theme-classes";
import {
  DEFAULT_PANE_BORDER_HEX,
  DEFAULT_PANE_COLOR_HEX,
  normalizeArtGroupKey,
  normalizePaneColorHex,
  paneSectionSurfaceStyle,
  parseHomePaneConfig,
  type HomePaneConfig,
} from "@/lib/pane-config";
import { storefrontPathForPageKey } from "@/lib/pane-pages";
import { RichTextEditor } from "@/components/rich-text-editor";

export type HomePaneRow = {
  id: string;
  type: PaneType;
  sortOrder: number;
  config: unknown;
};

export type ProductTypeOptionForPanes = { id: string; name: string };

function paneIdsSignature(panes: HomePaneRow[]) {
  return panes.map((p) => p.id).join("|");
}

function PaneCard({
  pageKey,
  pane,
  index,
  total,
  productTypeOptions,
  eventOptions,
  knownArtGroups,
  expandFreshId,
  onConsumeFresh,
}: {
  pageKey: PageKey;
  pane: HomePaneRow;
  index: number;
  total: number;
  productTypeOptions: ProductTypeOptionForPanes[];
  eventOptions: { id: string; name: string }[];
  knownArtGroups: string[];
  expandFreshId: string | null;
  onConsumeFresh: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const cfg = parseHomePaneConfig(pane.config, pane.type);
  const [form, setForm] = useState<HomePaneConfig>(cfg);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const configSerialized = JSON.stringify(pane.config);
  useEffect(() => {
    setForm(parseHomePaneConfig(pane.config, pane.type));
  }, [pane.id, pane.type, configSerialized]);

  useEffect(() => {
    if (expandFreshId === pane.id) {
      setDetailsOpen(true);
    }
  }, [expandFreshId, pane.id]);

  function save() {
    setMsg(null);
    const payload: HomePaneConfig =
      pane.type === "ART_SUB"
        ? {
            ...form,
            artGroup: normalizeArtGroupKey(form.artGroup ?? "") ?? "",
            artGalleryGroupKeys: (form.artGalleryGroupKeys ?? [])
              .map((g) => normalizeArtGroupKey(g))
              .filter((g): g is string => !!g),
          }
        : form;
    startTransition(async () => {
      try {
        await updateHomePane(pageKey, pane.id, payload);
        setMsg("Saved.");
        setDetailsOpen(false);
        if (expandFreshId === pane.id) onConsumeFresh();
        router.refresh();
      } catch {
        setMsg("Could not save.");
      }
    });
  }

  function remove() {
    if (!window.confirm("Delete this pane?")) return;
    startTransition(async () => {
      await deleteHomePane(pageKey, pane.id);
      if (expandFreshId === pane.id) onConsumeFresh();
      router.refresh();
    });
  }

  function move(dir: "up" | "down") {
    startTransition(async () => {
      await moveHomePane(pageKey, pane.id, dir);
      router.refresh();
    });
  }

  function toggleCarouselType(typeId: string) {
    setForm((f) => {
      const cur = f.carouselTypeIds ?? [];
      const next = cur.includes(typeId) ? cur.filter((x) => x !== typeId) : [...cur, typeId];
      return { ...f, carouselTypeIds: next };
    });
  }

  const typeLabel =
    pane.type === "PRODUCT_CAROUSEL"
      ? "Product carousel"
      : pane.type === "CONTENT_DUAL"
        ? "Content"
        : pane.type === "STORE_BANNER"
          ? "Store banner"
          : pane.type === "SOCIAL_LINKS"
            ? "Social links"
            : pane.type === "ORDER_SHIPPING_MAP"
              ? "Shipped orders map"
              : pane.type === "ART_SUB"
                ? "Art Sub"
                : pane.type === "SUGGESTION_BOX"
                  ? "Suggestion box"
                  : "Event block";

  const paneTitleInSummary = form.title?.trim() ? ` (${form.title.trim()})` : "";

  const safeHexForColorInput = (h: string | undefined, fb: string) => {
    const n = normalizePaneColorHex(h ?? "");
    return n ?? fb;
  };

  return (
    <details
      open={detailsOpen}
      onToggle={(e) => setDetailsOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="border-4 border-palm bg-white shadow-md [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex flex-wrap items-center justify-between gap-2 border-b border-palm/20 px-4 py-3 hover:bg-surf/30">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-palm-mid">
            {typeLabel}
            {paneTitleInSummary}
          </span>
          <p className="font-mono text-xs text-ink/65">
            #{pane.sortOrder + 1} · {pane.id.slice(0, 8)}…
          </p>
        </div>
        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={pending || index === 0}
            onClick={() => move("up")}
            className="rounded border-2 border-palm px-2 py-1 text-xs font-bold text-palm hover:bg-surf disabled:opacity-40"
          >
            Up
          </button>
          <button
            type="button"
            disabled={pending || index >= total - 1}
            onClick={() => move("down")}
            className="rounded border-2 border-palm px-2 py-1 text-xs font-bold text-palm hover:bg-surf disabled:opacity-40"
          >
            Down
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className={btnImportantSm}
          >
            Delete
          </button>
        </div>
      </summary>

      <div className="space-y-4 p-4">
        <label className="block text-sm font-bold text-ink">
          Pane title (optional)
          <input
            type="text"
            value={form.title ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
            placeholder="Shown above this pane on the storefront"
          />
        </label>

        <details className="rounded border-2 border-palm/25 bg-surf/20 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
          <summary className="px-3 py-2 text-sm font-bold text-palm hover:bg-surf/40">
            Pane background &amp; border
          </summary>
          <div className="space-y-4 border-t border-palm/15 p-3">
            <div>
              <label className="block text-sm font-bold text-ink" htmlFor={`bg-${pane.id}`}>
                Background transparency ({form.backgroundOpacity}% opaque)
              </label>
              <p className="mb-1 text-xs text-ink/60">
                0% = fully transparent (wallpaper shows through). 100% = solid sand panel.
              </p>
              <input
                id={`bg-${pane.id}`}
                type="range"
                min={0}
                max={100}
                value={form.backgroundOpacity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, backgroundOpacity: Number(e.target.value) }))
                }
                className="w-full accent-palm"
              />
            </div>

            <div>
              <span className="block text-sm font-bold text-ink">Pane background color</span>
              <p className="mb-2 text-xs text-ink/60">
                Combined with transparency above. Theme defaults apply when you create new panes.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  aria-label="Pane color"
                  value={safeHexForColorInput(form.paneColorHex, DEFAULT_PANE_COLOR_HEX)}
                  onChange={(e) => setForm((f) => ({ ...f, paneColorHex: e.target.value }))}
                  className="h-11 w-14 cursor-pointer rounded border-2 border-palm-mid bg-white p-1"
                />
                <input
                  type="text"
                  value={form.paneColorHex ?? DEFAULT_PANE_COLOR_HEX}
                  onChange={(e) => setForm((f) => ({ ...f, paneColorHex: e.target.value }))}
                  spellCheck={false}
                  className="min-w-[7rem] flex-1 border-2 border-palm-mid px-2 py-2 font-mono text-sm"
                  placeholder={DEFAULT_PANE_COLOR_HEX}
                />
                <span
                  className="h-11 w-11 shrink-0 rounded"
                  style={paneSectionSurfaceStyle({
                    backgroundOpacity: form.backgroundOpacity,
                    paneColorHex: form.paneColorHex ?? DEFAULT_PANE_COLOR_HEX,
                    paneBorderWidthPx: form.paneBorderWidthPx ?? 4,
                    paneBorderColorHex: form.paneBorderColorHex ?? DEFAULT_PANE_BORDER_HEX,
                  })}
                  title="Preview: fill + border"
                  aria-hidden
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-ink" htmlFor={`border-w-${pane.id}`}>
                Border weight ({form.paneBorderWidthPx ?? 4}px)
              </label>
              <p className="mb-1 text-xs text-ink/60">0 = no border.</p>
              <input
                id={`border-w-${pane.id}`}
                type="range"
                min={0}
                max={24}
                value={form.paneBorderWidthPx ?? 4}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paneBorderWidthPx: Number(e.target.value) }))
                }
                className="w-full accent-palm"
              />
            </div>

            <div>
              <span className="block text-sm font-bold text-ink">Border color</span>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  aria-label="Pane border color"
                  value={safeHexForColorInput(form.paneBorderColorHex, DEFAULT_PANE_BORDER_HEX)}
                  onChange={(e) => setForm((f) => ({ ...f, paneBorderColorHex: e.target.value }))}
                  className="h-11 w-14 cursor-pointer rounded border-2 border-palm-mid bg-white p-1"
                />
                <input
                  type="text"
                  value={form.paneBorderColorHex ?? DEFAULT_PANE_BORDER_HEX}
                  onChange={(e) => setForm((f) => ({ ...f, paneBorderColorHex: e.target.value }))}
                  spellCheck={false}
                  className="min-w-[7rem] flex-1 border-2 border-palm-mid px-2 py-2 font-mono text-sm"
                  placeholder={DEFAULT_PANE_BORDER_HEX}
                />
              </div>
            </div>
          </div>
        </details>

        {pane.type === "PRODUCT_CAROUSEL" ? (
          <>
            <label className="block text-sm font-bold text-ink">
              Banner title
              <input
                type="text"
                value={form.bannerTitle ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, bannerTitle: e.target.value }))}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
              />
            </label>
            <fieldset className="rounded border border-palm/25 p-3">
              <legend className="text-sm font-bold text-palm">Product types in this carousel</legend>
              <p className="mb-2 text-xs text-ink/60">
                Leave none checked to include <strong>all</strong> catalog products (featured still sorts first). Hidden
                types can still be selected here for targeted strips.
              </p>
              {productTypeOptions.length === 0 ? (
                <p className="text-sm text-ink/60">Add product types under Products → Product types.</p>
              ) : (
                <div className="flex max-h-40 flex-col space-y-2 overflow-y-auto text-sm">
                  {productTypeOptions.map((t) => (
                    <label key={t.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(form.carouselTypeIds ?? []).includes(t.id)}
                        onChange={() => toggleCarouselType(t.id)}
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            <label className="flex items-center gap-2 text-sm font-bold text-ink">
              <input
                type="checkbox"
                checked={!!form.autoScroll}
                onChange={(e) => setForm((f) => ({ ...f, autoScroll: e.target.checked }))}
              />
              Auto-scroll (when products load)
            </label>
            <label className="block text-sm font-bold text-ink">
              Scroll direction
              <select
                value={form.carouselScrollDirection ?? "left"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    carouselScrollDirection: e.target.value === "right" ? "right" : "left",
                  }))
                }
                className="mt-1 block w-full max-w-xs border-2 border-palm-mid bg-white px-2 py-2 text-sm"
              >
                <option value="left">Left (strip moves left)</option>
                <option value="right">Right (strip moves right)</option>
              </select>
            </label>
            <div>
              <label className="block text-sm font-bold text-ink" htmlFor={`carousel-speed-${pane.id}`}>
                Auto-scroll speed: {form.carouselScrollSpeed ?? 5} (1 = slowest, 10 = fastest)
              </label>
              <input
                id={`carousel-speed-${pane.id}`}
                type="range"
                min={1}
                max={10}
                step={1}
                value={form.carouselScrollSpeed ?? 5}
                onChange={(e) =>
                  setForm((f) => ({ ...f, carouselScrollSpeed: Number(e.target.value) }))
                }
                className="w-full max-w-xs accent-palm"
              />
            </div>
            <label className="block text-sm font-bold text-ink">
              Max items
              <input
                type="number"
                min={1}
                max={100}
                value={form.maxItems ?? 12}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxItems: Number(e.target.value) || 12 }))
                }
                className="mt-1 w-24 border-2 border-palm-mid px-2 py-2 text-sm"
              />
            </label>
          </>
        ) : null}

        {pane.type === "CONTENT_DUAL" ? (
          <>
            <label className="flex items-center gap-2 text-sm font-bold text-ink">
              <input
                type="checkbox"
                checked={form.leftEnabled !== false}
                onChange={(e) => setForm((f) => ({ ...f, leftEnabled: e.target.checked }))}
              />
              Left column on
            </label>
            <RichTextEditor
              label="Left column"
              value={form.leftHtml ?? ""}
              onChange={(html) => setForm((f) => ({ ...f, leftHtml: html }))}
              minHeightClassName="min-h-[8rem]"
            />
            <label className="flex items-center gap-2 text-sm font-bold text-ink">
              <input
                type="checkbox"
                checked={form.rightEnabled !== false}
                onChange={(e) => setForm((f) => ({ ...f, rightEnabled: e.target.checked }))}
              />
              Right column on
            </label>
            <RichTextEditor
              label="Right column"
              value={form.rightHtml ?? ""}
              onChange={(html) => setForm((f) => ({ ...f, rightHtml: html }))}
              minHeightClassName="min-h-[8rem]"
            />
          </>
        ) : null}

        {pane.type === "GIVEAWAY" ? (
          <>
            <label className="block text-sm font-bold text-ink">
              Event
              <select
                value={form.eventId ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    eventId: e.target.value.trim() || "",
                  }))
                }
                className="mt-1 block w-full max-w-xl border-2 border-palm-mid bg-white px-2 py-2 text-sm"
              >
                <option value="">— None — simple promo (no catalog link)</option>
                {eventOptions.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-ink/60">
              Manage events under{" "}
              <a href="/settings/events" className="font-medium text-lagoon-dark underline">
                Products → Events
              </a>
              . When an event is selected, the block shows its dates, details, and products.
            </p>
            <label className="block text-sm font-bold text-ink">
              Banner text
              <input
                type="text"
                value={form.giveawayBanner ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, giveawayBanner: e.target.value }))}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                placeholder={form.eventId ? "Line above the event name" : "Headline"}
              />
            </label>
            {!form.eventId ? (
              <label className="block text-sm font-bold text-ink">
                End date/time (simple promo)
                <input
                  type="datetime-local"
                  value={form.giveawayEndIso?.slice(0, 16) ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      giveawayEndIso: e.target.value,
                    }))
                  }
                  className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                />
              </label>
            ) : null}
            <label className="block text-sm font-bold text-ink">
              Button label
              <input
                type="text"
                value={form.giveawayLinkLabel ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, giveawayLinkLabel: e.target.value }))}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-bold text-ink">
              Button URL (optional)
              <input
                type="text"
                value={form.giveawayLinkHref ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, giveawayLinkHref: e.target.value }))}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-2 font-mono text-sm"
                placeholder={form.eventId ? `Default: /event/{id}` : "/featured"}
              />
            </label>
          </>
        ) : null}

        {pane.type === "STORE_BANNER" ? (
          <>
            <label className="flex items-center gap-2 text-sm font-bold text-ink">
              <input
                type="checkbox"
                checked={form.storeBannerUseSiteLogo !== false}
                onChange={(e) => setForm((f) => ({ ...f, storeBannerUseSiteLogo: e.target.checked }))}
              />
              Use company logo from Global settings
            </label>
            <p className="text-xs text-ink/60">
              When checked, the pane uses the logo from{" "}
              <a href="/settings/global" className="font-medium text-lagoon-dark underline">
                Global settings
              </a>
              . Uncheck to upload a logo for this pane only (or use Advanced to paste a URL).
            </p>
            <label className="block text-sm font-bold text-ink">
              Upload pane logo (optional override)
              <input
                type="file"
                accept="image/*"
                className="mt-1 block text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  (e.target as HTMLInputElement).value = "";
                  if (!file) return;
                  const fd = new FormData();
                  fd.set("file", file);
                  startTransition(async () => {
                    const r = await uploadThemeDecorImage(fd);
                    if (!r.ok) {
                      setMsg(r.error);
                      return;
                    }
                    setForm((f) => ({ ...f, storeBannerLogoUrl: r.url, storeBannerUseSiteLogo: false }));
                    setMsg("Logo uploaded. Save the pane to keep it.");
                  });
                }}
              />
            </label>
            {form.storeBannerLogoUrl ? (
              <p className="text-xs text-ink/60">
                Current: <code className="break-all font-mono">{form.storeBannerLogoUrl}</code>
              </p>
            ) : null}
            <details className="rounded border border-palm/20 bg-surf/30 p-2">
              <summary className="cursor-pointer text-xs font-bold text-ink/80">Advanced: paste image URL</summary>
              <label className="mt-2 block text-xs text-ink">
                Logo URL
                <input
                  type="text"
                  value={form.storeBannerLogoUrl ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, storeBannerLogoUrl: e.target.value }))}
                  className="mt-1 w-full border-2 border-palm-mid px-2 py-2 font-mono text-sm"
                  placeholder="https://… or /uploads/…"
                />
              </label>
            </details>
            <div>
              <label className="block text-sm font-bold text-ink" htmlFor={`sb-mw-${pane.id}`}>
                Logo max width ({form.storeBannerLogoMaxWidthPct ?? 72}% of pane)
              </label>
              <input
                id={`sb-mw-${pane.id}`}
                type="range"
                min={15}
                max={100}
                value={form.storeBannerLogoMaxWidthPct ?? 72}
                onChange={(e) =>
                  setForm((f) => ({ ...f, storeBannerLogoMaxWidthPct: Number(e.target.value) }))
                }
                className="mt-1 w-full max-w-md accent-palm"
              />
            </div>
            <label className="block text-sm font-bold text-ink">
              Subheading (optional)
              <input
                type="text"
                value={form.storeBannerSubheading ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, storeBannerSubheading: e.target.value }))}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-bold text-ink">
              Animation
              <select
                value={form.storeBannerAnimation ?? "subtle"}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    storeBannerAnimation: v === "none" || v === "float" || v === "subtle" ? v : "subtle",
                  }));
                }}
                className="mt-1 block w-full max-w-xs border-2 border-palm-mid bg-white px-2 py-2 text-sm"
              >
                <option value="none">None</option>
                <option value="subtle">Subtle nudge</option>
                <option value="float">Float</option>
              </select>
            </label>
            <div className="space-y-3 rounded border border-palm/25 p-3">
              <p className="text-sm font-bold text-palm">Call-to-action buttons</p>
              {(form.storeBannerButtons ?? []).map((b, i) => (
                <div
                  key={`${pane.id}-btn-${i}`}
                  className="grid gap-2 border-b border-palm/15 pb-3 last:border-0 sm:grid-cols-2"
                >
                  <label className="text-sm font-bold text-ink">
                    Link (path or https)
                    <input
                      type="text"
                      value={b.href}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((f) => {
                          const buttons = [...(f.storeBannerButtons ?? [])];
                          if (buttons[i]) buttons[i] = { ...buttons[i]!, href: v };
                          return { ...f, storeBannerButtons: buttons };
                        });
                      }}
                      className="mt-1 w-full border-2 border-palm-mid px-2 py-2 font-mono text-xs"
                    />
                  </label>
                  <label className="text-sm font-bold text-ink">
                    Label
                    <input
                      type="text"
                      value={b.label}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((f) => {
                          const buttons = [...(f.storeBannerButtons ?? [])];
                          if (buttons[i]) buttons[i] = { ...buttons[i]!, label: v };
                          return { ...f, storeBannerButtons: buttons };
                        });
                      }}
                      className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-bold text-ink">Button image (optional)</label>
                    <p className="text-xs text-ink/60">Use text label only, or upload a custom image for this button.</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="mt-1 block text-sm"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        (e.target as HTMLInputElement).value = "";
                        if (!file) return;
                        const fd = new FormData();
                        fd.set("file", file);
                        startTransition(async () => {
                          const r = await uploadThemeDecorImage(fd);
                          if (!r.ok) {
                            setMsg(r.error);
                            return;
                          }
                          setForm((f) => {
                            const buttons = [...(f.storeBannerButtons ?? [])];
                            if (buttons[i]) buttons[i] = { ...buttons[i]!, imageUrl: r.url };
                            return { ...f, storeBannerButtons: buttons };
                          });
                          setMsg("Button image uploaded. Save the pane.");
                        });
                      }}
                    />
                    {b.imageUrl ? (
                      <p className="mt-1 text-xs text-ink/60">
                        Current: <code className="break-all font-mono">{b.imageUrl}</code>
                      </p>
                    ) : null}
                    <details className="mt-2 rounded border border-palm/20 bg-surf/30 p-2">
                      <summary className="cursor-pointer text-xs font-bold text-ink/80">Advanced: image URL</summary>
                      <input
                        type="text"
                        value={b.imageUrl ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((f) => {
                            const buttons = [...(f.storeBannerButtons ?? [])];
                            if (buttons[i]) buttons[i] = { ...buttons[i]!, imageUrl: v || undefined };
                            return { ...f, storeBannerButtons: buttons };
                          });
                        }}
                        className="mt-2 w-full border-2 border-palm-mid px-2 py-2 font-mono text-xs"
                        placeholder="https://… or /uploads/…"
                      />
                    </details>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          storeBannerButtons: (f.storeBannerButtons ?? []).filter((_, j) => j !== i),
                        }));
                      }}
                      className="text-xs font-bold text-coral underline"
                    >
                      Remove button
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                disabled={(form.storeBannerButtons ?? []).length >= 6}
                onClick={() => {
                  setForm((f) => ({
                    ...f,
                    storeBannerButtons: [
                      ...(f.storeBannerButtons ?? []),
                      { href: "/store", label: "New", imageUrl: undefined },
                    ].slice(0, 6),
                  }));
                }}
                className="text-sm font-bold text-lagoon-dark underline disabled:opacity-40"
              >
                Add button
              </button>
            </div>
          </>
        ) : null}

        {pane.type === "ORDER_SHIPPING_MAP" ? (
          <p className="text-sm text-ink/75">
            Shows US states, Canadian provinces, and Mexican states colored by <strong>placed</strong> order count
            (paid / fulfilled customer shipping address). Hover a region for totals and top cities. Configure the
            optional pane title
            above.
          </p>
        ) : null}

        {pane.type === "ART_SUB" ? (
          <>
            <label className="block text-sm font-bold text-ink">
              Sub heading
              <input
                type="text"
                value={form.artSubHeading ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, artSubHeading: e.target.value }))}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                placeholder="Short line under the pane title on the storefront"
              />
            </label>
            <label className="block text-sm font-bold text-ink">
              Art group <span className="font-normal text-coral">*</span>
              <input
                type="text"
                value={form.artGroup ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, artGroup: e.target.value }))}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                placeholder="e.g. Cursor — must match for admin Customer Art"
              />
            </label>
            <p className="text-xs text-ink/60">
              Uploads from this pane are tagged with this group. Review them under{" "}
              <a href="/settings/customer-art" className="font-medium text-lagoon-dark underline">
                Customer Art
              </a>
              .
            </p>

            <div className="mt-4 space-y-3 rounded border-2 border-palm/25 bg-palm/5 p-4">
              <p className="text-sm font-black text-palm">Approved artwork gallery</p>
              <label className="flex items-center gap-2 text-sm font-bold text-ink">
                <input
                  type="checkbox"
                  checked={form.artGalleryEnabled !== false}
                  onChange={(e) => setForm((f) => ({ ...f, artGalleryEnabled: e.target.checked }))}
                />
                Show scrolling banner of approved artwork above the upload form
              </label>

              {form.artGalleryEnabled !== false ? (
                <>
                  <label className="block text-sm font-bold text-ink">
                    Gallery scope
                    <select
                      value={form.artGalleryScope ?? "same_group"}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          artGalleryScope: e.target.value as HomePaneConfig["artGalleryScope"],
                        }))
                      }
                      className="mt-1 block w-full border-2 border-palm-mid bg-white px-2 py-2 text-sm"
                    >
                      <option value="same_group">Same art group as uploads (this pane)</option>
                      <option value="all_approved">All approved artwork (every group)</option>
                      <option value="selected_groups">Selected art groups only</option>
                    </select>
                  </label>

                  {form.artGalleryScope === "selected_groups" ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-ink">Include these art groups</p>
                      {knownArtGroups.length === 0 ? (
                        <p className="text-xs text-ink/60">
                          No art groups yet. Add submissions in Customer Art or set an art group on another Art Sub pane.
                        </p>
                      ) : (
                        <ul className="max-h-40 space-y-1 overflow-y-auto rounded border border-palm/20 bg-white p-2">
                          {knownArtGroups.map((group) => {
                            const selected = (form.artGalleryGroupKeys ?? []).includes(group);
                            return (
                              <li key={group}>
                                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => {
                                      setForm((f) => {
                                        const cur = f.artGalleryGroupKeys ?? [];
                                        const next = selected
                                          ? cur.filter((g) => g !== group)
                                          : [...cur, group];
                                        return { ...f, artGalleryGroupKeys: next };
                                      });
                                    }}
                                  />
                                  {group}
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <p className="text-xs text-ink/55">
                        If none are checked, the gallery falls back to this pane&apos;s upload art group.
                      </p>
                    </div>
                  ) : null}

                  <label className="flex items-center gap-2 text-sm font-bold text-ink">
                    <input
                      type="checkbox"
                      checked={form.artGalleryAutoScroll !== false}
                      onChange={(e) => setForm((f) => ({ ...f, artGalleryAutoScroll: e.target.checked }))}
                    />
                    Auto-scroll gallery
                  </label>

                  <div className="space-y-2 border-t border-palm/15 pt-3">
                    <p className="text-xs font-bold text-ink">Gallery card labels</p>
                    <label className="flex items-center gap-2 text-sm font-bold text-ink">
                      <input
                        type="checkbox"
                        checked={form.artGalleryShowArtistName !== false}
                        onChange={(e) => setForm((f) => ({ ...f, artGalleryShowArtistName: e.target.checked }))}
                      />
                      Show artist name on gallery cards
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-ink">
                      <input
                        type="checkbox"
                        checked={form.artGalleryShowArtGroup !== false}
                        onChange={(e) => setForm((f) => ({ ...f, artGalleryShowArtGroup: e.target.checked }))}
                      />
                      Show art group name on gallery cards
                    </label>
                  </div>

                  {form.artGalleryAutoScroll !== false ? (
                    <>
                      <label className="block text-sm font-bold text-ink">
                        Scroll direction
                        <select
                          value={form.artGalleryScrollDirection ?? "left"}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              artGalleryScrollDirection: e.target.value === "right" ? "right" : "left",
                            }))
                          }
                          className="mt-1 block w-full border-2 border-palm-mid bg-white px-2 py-2 text-sm"
                        >
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      </label>
                      <label className="block text-sm font-bold text-ink">
                        Auto-scroll speed: {form.artGalleryScrollSpeed ?? 5} (1 = slowest, 10 = fastest)
                        <input
                          type="range"
                          min={1}
                          max={10}
                          step={1}
                          value={form.artGalleryScrollSpeed ?? 5}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, artGalleryScrollSpeed: Number(e.target.value) }))
                          }
                          className="mt-2 block w-full"
                        />
                      </label>
                    </>
                  ) : null}
                </>
              ) : null}
            </div>
          </>
        ) : null}

        {pane.type === "SUGGESTION_BOX" ? (
          <>
            <label className="block text-sm font-bold text-ink">
              Sub heading
              <input
                type="text"
                value={form.suggestionBoxHeading ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, suggestionBoxHeading: e.target.value }))}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                placeholder="Short line under the pane title on the storefront"
              />
            </label>
            <label className="block text-sm font-bold text-ink">
              Recently approved list size
              <input
                type="number"
                min={0}
                max={50}
                value={form.approvedSuggestionsLimit ?? 8}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    approvedSuggestionsLimit: Number(e.target.value),
                  }))
                }
                className="mt-1 w-full max-w-[8rem] border-2 border-palm-mid px-2 py-2 text-sm"
              />
            </label>
            <p className="text-xs text-ink/60">
              How many approved species/design ideas to show as tags in this pane. Manage suggestions under{" "}
              <a href="/settings/suggestions" className="font-medium text-lagoon-dark underline">
                Insights → Suggestions
              </a>
              .
            </p>
          </>
        ) : null}

        {pane.type === "SOCIAL_LINKS" ? (
          <div className="space-y-4">
            <p className="text-sm text-ink/75">
              Only links with a valid <code className="font-mono text-xs">http://</code> or{" "}
              <code className="font-mono text-xs">https://</code> URL appear on the storefront. Labels are optional (the
              platform name is used when blank).
            </p>
            {(form.socialLinks ?? []).map((row, i) => (
              <div
                key={`${pane.id}-soc-${i}`}
                className="grid gap-3 rounded border border-palm/25 p-3 sm:grid-cols-[10rem_1fr_1fr_auto]"
              >
                <label className="text-sm font-bold text-ink">
                  Platform
                  <select
                    value={row.platform}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => {
                        const links = [...(f.socialLinks ?? [])];
                        if (links[i]) links[i] = { ...links[i]!, platform: v };
                        return { ...f, socialLinks: links };
                      });
                    }}
                    className="mt-1 block w-full border-2 border-palm-mid bg-white px-2 py-2 text-sm"
                  >
                    <option value="FACEBOOK">Facebook</option>
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="X">X (Twitter)</option>
                    <option value="TIKTOK">TikTok</option>
                    <option value="YOUTUBE">YouTube</option>
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="WEBSITE">Website / other</option>
                  </select>
                </label>
                <label className="text-sm font-bold text-ink sm:col-span-1">
                  URL
                  <input
                    type="url"
                    value={row.url}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => {
                        const links = [...(f.socialLinks ?? [])];
                        if (links[i]) links[i] = { ...links[i]!, url: v };
                        return { ...f, socialLinks: links };
                      });
                    }}
                    className="mt-1 w-full border-2 border-palm-mid px-2 py-2 font-mono text-sm"
                    placeholder="https://…"
                  />
                </label>
                <label className="text-sm font-bold text-ink">
                  Label (optional)
                  <input
                    type="text"
                    value={row.label ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => {
                        const links = [...(f.socialLinks ?? [])];
                        if (links[i]) links[i] = { ...links[i]!, label: v };
                        return { ...f, socialLinks: links };
                      });
                    }}
                    className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        socialLinks: (f.socialLinks ?? []).filter((_, j) => j !== i),
                      }));
                    }}
                    className="text-xs font-bold text-coral underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              disabled={(form.socialLinks ?? []).length >= 12}
              onClick={() => {
                setForm((f) => ({
                  ...f,
                  socialLinks: [...(f.socialLinks ?? []), { platform: "WEBSITE", url: "", label: "" }].slice(0, 12),
                }));
              }}
              className="text-sm font-bold text-lagoon-dark underline disabled:opacity-40"
            >
              Add link
            </button>
          </div>
        ) : null}

        <div className="flex items-center gap-3 border-t border-palm/15 pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className={btnSecondaryMd}
          >
            {pending ? "Saving…" : "Save pane"}
          </button>
          {msg ? <span className="text-sm text-lagoon-dark">{msg}</span> : null}
        </div>
      </div>
    </details>
  );
}

export function HomePanesEditor({
  pageKey,
  initialPanes,
  productTypeOptions,
  eventOptions,
  knownArtGroups,
}: {
  pageKey: PageKey;
  initialPanes: HomePaneRow[];
  productTypeOptions: ProductTypeOptionForPanes[];
  eventOptions: { id: string; name: string }[];
  knownArtGroups: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addType, setAddType] = useState<PaneType>("CONTENT_DUAL");
  const publicHref = storefrontPathForPageKey(pageKey);
  const prevSig = useRef(paneIdsSignature(initialPanes));
  const [expandFreshId, setExpandFreshId] = useState<string | null>(null);

  useEffect(() => {
    const sig = paneIdsSignature(initialPanes);
    if (sig !== prevSig.current) {
      const old = new Set(prevSig.current.split("|").filter(Boolean));
      const newbie = initialPanes.find((p) => !old.has(p.id));
      if (newbie) setExpandFreshId(newbie.id);
      prevSig.current = sig;
    }
  }, [initialPanes]);

  function add() {
    startTransition(async () => {
      await createHomePane(pageKey, addType);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded border-2 border-palm bg-white p-4 shadow-sm">
        <label className="text-sm font-bold text-ink">
          New pane type
          <select
            value={addType}
            onChange={(e) => setAddType(e.target.value as PaneType)}
            className="mt-1 block w-full min-w-[12rem] border-2 border-palm-mid bg-white px-2 py-2 text-sm"
          >
            <option value={PaneTypeEnum.CONTENT_DUAL}>Content (two columns, rich text)</option>
            <option value={PaneTypeEnum.PRODUCT_CAROUSEL}>Product carousel</option>
            <option value={PaneTypeEnum.GIVEAWAY}>Event block</option>
            <option value={PaneTypeEnum.STORE_BANNER}>Store banner (logo + CTAs)</option>
            <option value={PaneTypeEnum.SOCIAL_LINKS}>Social links (Facebook, Instagram, …)</option>
            <option value={PaneTypeEnum.ORDER_SHIPPING_MAP}>Shipped orders map (North America)</option>
            <option value={PaneTypeEnum.ART_SUB}>Art Sub (customer artwork upload)</option>
            <option value={PaneTypeEnum.SUGGESTION_BOX}>Suggestion box (species / design ideas)</option>
          </select>
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={add}
          className="border-2 border-black bg-black px-4 py-2 text-sm font-bold text-white hover:bg-neutral-900 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add pane"}
        </button>
      </div>

      {initialPanes.length === 0 ? (
        <p className="text-ink/70">
          No panes yet. Choose a type and click <strong>Add pane</strong>, then open the{" "}
          <a href={publicHref} className="font-medium text-lagoon-dark underline">
            public page
          </a>{" "}
          to preview.
        </p>
      ) : (
        <ul className="space-y-6">
          {initialPanes.map((pane, i) => (
            <li key={pane.id}>
              <PaneCard
                pageKey={pageKey}
                pane={pane}
                index={i}
                total={initialPanes.length}
                productTypeOptions={productTypeOptions}
                eventOptions={eventOptions}
                knownArtGroups={knownArtGroups}
                expandFreshId={expandFreshId}
                onConsumeFresh={() => setExpandFreshId(null)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
