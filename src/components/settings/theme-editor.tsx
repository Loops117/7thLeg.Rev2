"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  removeThemeDecorUrl,
  saveFullThemeSettings,
  uploadThemeDecorImage,
  type ThemeSavePayload,
} from "@/app/actions/theme-admin";
import { normalizePaneColorHex } from "@/lib/pane-config";
import {
  ThemeFooterChromeFields,
  ThemeHeaderChromeFields,
} from "@/components/settings/theme-chrome-fields";
import type {
  ResolvedPublicTheme,
  SiteThemeConfigBlob,
  ThemeChrome,
  ThemeColors,
  ThemeDecorImageEntry,
  ThemeLayout,
  ThemePaneDefaults,
  ThemeProductCard,
  ThemeText,
} from "@/lib/theme-config";
import {
  btnChip,
  btnChipActive,
  btnImportantSm,
  btnMainSm,
  btnSecondaryMd,
  btnSecondarySm,
} from "@/lib/btn-theme-classes";
import {
  BUILTIN_CHROME,
  BUILTIN_COLORS,
  BUILTIN_LAYOUT,
  BUILTIN_PANE_DEFAULTS,
  BUILTIN_PRODUCT_CARD,
  BUILTIN_PRODUCT_FOOTER,
  BUILTIN_TEXT,
  type BgSandOverlayMode,
  productFooterCssVariables,
  type ThemeProductFooter,
} from "@/lib/theme-config";

function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded border-2 border-palm bg-white shadow-sm [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex flex-wrap items-center justify-between gap-2 border-b border-palm/15 px-4 py-3 font-bold text-palm hover:bg-surf/40">
        <span>{title}</span>
        <span className="text-xs font-normal text-ink/60">{summary}</span>
      </summary>
      <div className="space-y-4 p-4">{children}</div>
    </details>
  );
}

const layoutColorKeys: { key: keyof ThemeColors; label: string; hint: string }[] = [
  {
    key: "siteBg",
    label: "Site background",
    hint: "Area outside the main column (left & right gutters on wide screens).",
  },
  {
    key: "sand",
    label: "Page background",
    hint: "Main column interior (Home, Store, Featured, etc.).",
  },
];

type ColorKeyDef = { key: keyof ThemeColors; label: string; hint?: string };

const brandColorKeys: ColorKeyDef[] = [
  {
    key: "palm",
    label: "Primary brand",
    hint: "Page headings, store title, many borders — not the same as header bar colors above.",
  },
  { key: "palmMid", label: "Secondary brand", hint: "Softer green accents and secondary borders." },
  {
    key: "parchment",
    label: "Panel / modal surface",
    hint: "Checkout panels, modals, and light inset surfaces (not shop product cards).",
  },
  { key: "surf", label: "Soft highlight fill", hint: "Subtle tinted backgrounds in forms and info boxes." },
];

const textAndAccentColorKeys: ColorKeyDef[] = [
  { key: "ink", label: "Body text", hint: "Default paragraph and label color site-wide." },
  { key: "lagoonDark", label: "Links", hint: "Underlined text links in content and footer." },
  { key: "lagoon", label: "Focus & accent teal", hint: "Focus rings and interactive highlights." },
  { key: "coral", label: "Alerts & sale tags", hint: "Errors, warnings, and “Sale” labels (unless overridden on product cards)." },
  {
    key: "mango",
    label: "Header cart & chips",
    hint: "Cart, Admin, and Join buttons in the top header — not nav link text.",
  },
];

const productCardKeys: { key: keyof ThemeProductCard; label: string; hint: string }[] = [
  { key: "background", label: "Card background", hint: "Store grid, featured strips, and carousels." },
  { key: "border", label: "Card border", hint: "Shown at ~30% opacity around each card." },
  { key: "title", label: "Product name", hint: "Bold title on each card." },
  { key: "description", label: "Short description", hint: "Subtitle text under the name (~70% opacity)." },
  { key: "price", label: "Price", hint: "Main price line." },
  { key: "saleTag", label: "Sale & out of stock", hint: "“Sale” badge and out-of-stock message." },
  { key: "imageArea", label: "Image area background", hint: "Behind the product photo (~50% opacity)." },
  { key: "hoverGlow", label: "Hover glow ring", hint: "Only when hover style is Glow (below)." },
];

const buttonColorKeys: { key: keyof ThemeColors; label: string }[] = [
  { key: "btnMainFg", label: "Main button — text & border" },
  { key: "btnMainBg", label: "Main button — background" },
  { key: "btnSecondaryFg", label: "Secondary button — text & border" },
  { key: "btnSecondaryBg", label: "Secondary button — background" },
  { key: "btnImportantFg", label: "Important button — text & border" },
  { key: "btnImportantBg", label: "Important button — background" },
];

type GalleryThemeField =
  | {
      source: "colors";
      key: keyof ThemeColors;
      label: string;
      hint: string;
      sharedWith?: string;
      galleryOnly?: boolean;
      fallback: string;
    }
  | {
      source: "productCard";
      key: keyof ThemeProductCard;
      label: string;
      hint: string;
      sharedWith: string;
      galleryOnly?: boolean;
      fallback: string;
    };

const galleryThemeFields: GalleryThemeField[] = [
  {
    source: "colors",
    key: "galleryPinBadgeBg",
    label: "Pin count badge — background",
    hint: "Small label on photo thumbnails (e.g. “4 pins”).",
    galleryOnly: true,
    fallback: BUILTIN_COLORS.galleryPinBadgeBg,
  },
  {
    source: "colors",
    key: "galleryPinBadgeFg",
    label: "Pin count badge — text",
    hint: "Text on the pin count badge.",
    galleryOnly: true,
    fallback: BUILTIN_COLORS.galleryPinBadgeFg,
  },
  {
    source: "productCard",
    key: "imageArea",
    label: "Thumbnail & lightbox image background",
    hint: "Gray/teal area behind photos in the grid and popup.",
    sharedWith: "Shop & product cards → Image area background",
    fallback: BUILTIN_PRODUCT_CARD.imageArea,
  },
  {
    source: "productCard",
    key: "background",
    label: "Thumbnail card background",
    hint: "Surface around each gallery tile.",
    sharedWith: "Shop & product cards → Card background",
    fallback: BUILTIN_PRODUCT_CARD.background,
  },
  {
    source: "colors",
    key: "parchment",
    label: "Lightbox panel background",
    hint: "Popup header, footer, and pin tooltip.",
    sharedWith: "Brand & surfaces → Panel / modal surface",
    fallback: BUILTIN_COLORS.parchment,
  },
  {
    source: "colors",
    key: "sand",
    label: "Gallery page background",
    hint: "Main column behind the grid.",
    sharedWith: "Page layout → Page background",
    fallback: BUILTIN_COLORS.sand,
  },
  {
    source: "colors",
    key: "palm",
    label: "Headings & strong accents",
    hint: "Page title, lightbox title, tagged variation names.",
    sharedWith: "Brand & surfaces → Primary brand",
    fallback: BUILTIN_COLORS.palm,
  },
  {
    source: "colors",
    key: "palmMid",
    label: "Borders & dividers",
    hint: "Card edges, lightbox dividers, image frame.",
    sharedWith: "Brand & surfaces → Secondary brand",
    fallback: BUILTIN_COLORS.palmMid,
  },
  {
    source: "colors",
    key: "ink",
    label: "Body text & lightbox scrim",
    hint: "Search field, checkbox label, lightbox copy; dimmed scrim behind popup.",
    sharedWith: "Brand & surfaces → Body text",
    fallback: BUILTIN_COLORS.ink,
  },
  {
    source: "colors",
    key: "lagoonDark",
    label: "Links",
    hint: "Home link, tooltip call-to-action.",
    sharedWith: "Brand & surfaces → Links",
    fallback: BUILTIN_COLORS.lagoonDark,
  },
  {
    source: "productCard",
    key: "price",
    label: "Price text",
    hint: "Tagged product prices in the lightbox.",
    sharedWith: "Shop & product cards → Price",
    fallback: BUILTIN_PRODUCT_CARD.price,
  },
  {
    source: "colors",
    key: "surf",
    label: "Tagged product row fill",
    hint: "Background on shoppable items under the image.",
    sharedWith: "Brand & surfaces → Soft highlight fill",
    fallback: BUILTIN_COLORS.surf,
  },
  {
    source: "colors",
    key: "btnSecondaryFg",
    label: "Close button — text & border",
    hint: "Lightbox Close control.",
    sharedWith: "Buttons → Secondary button — text & border",
    fallback: BUILTIN_COLORS.btnSecondaryFg,
  },
  {
    source: "colors",
    key: "btnSecondaryBg",
    label: "Close button — background",
    hint: "Lightbox Close control.",
    sharedWith: "Buttons → Secondary button — background",
    fallback: BUILTIN_COLORS.btnSecondaryBg,
  },
];

function GalleryThemeColorGrid({
  colors,
  setColors,
  productCard,
  setProductCard,
}: {
  colors: ThemeColors;
  setColors: Dispatch<React.SetStateAction<ThemeColors>>;
  productCard: ThemeProductCard;
  setProductCard: Dispatch<React.SetStateAction<ThemeProductCard>>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {galleryThemeFields.map((field) => {
        const value = field.source === "colors" ? colors[field.key] : productCard[field.key];
        const onChange = (hex: string) => {
          if (field.source === "colors") {
            setColors((c) => ({ ...c, [field.key]: hex }));
          } else {
            setProductCard((c) => ({ ...c, [field.key]: hex }));
          }
        };
        return (
          <ThemeColorField
            key={`${field.source}-${field.key}`}
            label={field.label}
            hint={
              "galleryOnly" in field && field.galleryOnly
                ? field.hint
                : "sharedWith" in field && field.sharedWith
                  ? `${field.hint} Same value as ${field.sharedWith}.`
                  : field.hint
            }
            value={value}
            fallback={field.fallback}
            onChange={onChange}
          />
        );
      })}
    </div>
  );
}

function ColorPickerGrid({
  keys,
  colors,
  setColors,
}: {
  keys: ColorKeyDef[];
  colors: ThemeColors;
  setColors: Dispatch<React.SetStateAction<ThemeColors>>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {keys.map(({ key, label, hint }) => (
        <label key={key} className="block text-sm font-bold text-ink">
          {label}
          {hint ? <p className="mb-1 text-xs font-normal text-ink/60">{hint}</p> : null}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              type="color"
              aria-label={label}
              value={normalizePaneColorHex(colors[key]) ?? BUILTIN_COLORS[key]}
              onChange={(e) => setColors((c) => ({ ...c, [key]: e.target.value }))}
              className="h-10 w-14 cursor-pointer rounded border-2 border-palm-mid bg-white p-1"
            />
            <input
              type="text"
              value={colors[key]}
              onChange={(e) => setColors((c) => ({ ...c, [key]: e.target.value }))}
              spellCheck={false}
              className="min-w-0 flex-1 border-2 border-palm-mid px-2 py-2 font-mono text-xs"
            />
          </div>
        </label>
      ))}
    </div>
  );
}

function ThemeColorField({
  label,
  hint,
  value,
  fallback,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  fallback: string;
  onChange: (hex: string) => void;
}) {
  return (
    <label className="block text-sm font-bold text-ink">
      {label}
      {hint ? <p className="mb-1 text-xs font-normal text-ink/60">{hint}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={normalizePaneColorHex(value) ?? fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border-2 border-palm-mid bg-white p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="min-w-0 flex-1 border-2 border-palm-mid px-2 py-2 font-mono text-xs"
        />
      </div>
    </label>
  );
}

function ProductCardColorGrid({
  productCard,
  setProductCard,
}: {
  productCard: ThemeProductCard;
  setProductCard: Dispatch<React.SetStateAction<ThemeProductCard>>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {productCardKeys.map(({ key, label, hint }) => (
        <ThemeColorField
          key={key}
          label={label}
          hint={hint}
          value={productCard[key]}
          fallback={BUILTIN_PRODUCT_CARD[key]}
          onChange={(hex) => setProductCard((c) => ({ ...c, [key]: hex }))}
        />
      ))}
    </div>
  );
}

const productFooterColorKeys: {
  key: keyof Pick<
    ThemeProductFooter,
    "background" | "borderColor" | "titleColor" | "bodyColor" | "linkColor" | "sectionBorderColor"
  >;
  label: string;
  hint: string;
}[] = [
  { key: "background", label: "Block background", hint: "Fill behind each footer block." },
  { key: "borderColor", label: "Block border color", hint: "Outline around each footer block." },
  { key: "titleColor", label: "Title color", hint: "Bold heading above the HTML body." },
  { key: "bodyColor", label: "Body text color", hint: "Paragraph and list text in the footer HTML." },
  { key: "linkColor", label: "Link color", hint: "Links inside the footer HTML." },
  {
    key: "sectionBorderColor",
    label: "Section divider color",
    hint: "Line above the whole footer area on the product page.",
  },
];

function ProductFooterThemeFields({
  productFooter,
  setProductFooter,
}: {
  productFooter: ThemeProductFooter;
  setProductFooter: Dispatch<React.SetStateAction<ThemeProductFooter>>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {productFooterColorKeys.map(({ key, label, hint }) => (
          <ThemeColorField
            key={key}
            label={label}
            hint={hint}
            value={productFooter[key]}
            fallback={BUILTIN_PRODUCT_FOOTER[key]}
            onChange={(hex) => setProductFooter((f) => ({ ...f, [key]: hex }))}
          />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm font-bold text-ink">
          Background opacity ({productFooter.backgroundOpacityPercent}%)
          <p className="mb-1 text-xs font-normal text-ink/60">0 = transparent, 100 = solid.</p>
          <input
            type="range"
            min={0}
            max={100}
            value={productFooter.backgroundOpacityPercent}
            onChange={(e) =>
              setProductFooter((f) => ({
                ...f,
                backgroundOpacityPercent: Number(e.target.value),
              }))
            }
            className="mt-1 w-full accent-palm"
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          Block border width ({productFooter.borderWidthPx}px)
          <input
            type="range"
            min={0}
            max={24}
            value={productFooter.borderWidthPx}
            onChange={(e) =>
              setProductFooter((f) => ({ ...f, borderWidthPx: Number(e.target.value) }))
            }
            className="mt-1 w-full accent-palm"
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          Section divider width ({productFooter.sectionBorderWidthPx}px)
          <input
            type="range"
            min={0}
            max={24}
            value={productFooter.sectionBorderWidthPx}
            onChange={(e) =>
              setProductFooter((f) => ({ ...f, sectionBorderWidthPx: Number(e.target.value) }))
            }
            className="mt-1 w-full accent-palm"
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          Title font size (px)
          <input
            type="number"
            min={12}
            max={32}
            value={productFooter.titleFontSizePx}
            onChange={(e) =>
              setProductFooter((f) => ({ ...f, titleFontSizePx: Number(e.target.value) }))
            }
            className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          Body font size (px)
          <input
            type="number"
            min={12}
            max={24}
            value={productFooter.bodyFontSizePx}
            onChange={(e) =>
              setProductFooter((f) => ({ ...f, bodyFontSizePx: Number(e.target.value) }))
            }
            className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
          />
        </label>
      </div>
      <div
        className="product-footer-section rounded border border-dashed border-palm/30 p-4"
        style={productFooterCssVariables(productFooter)}
        aria-hidden
      >
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink/55">Preview</p>
        <article className="product-footer-block">
          <h3 className="product-footer-block__title">Sample footer title</h3>
          <div className="product-footer-block__body store-rich">
            <p>
              Care instructions and policies appear here.{" "}
              <a href="#preview">Example link</a>.
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}

export function ThemeEditor({
  initialTheme,
  initialCardHoverMode,
  bgEnabled,
  bgMaxImages,
  bgSpawnIntervalMs,
  bgOpacityPercent,
  bgSandOverlayMode,
  bgImageOpacityPercent,
  bgTileScaleMin,
  bgTileScaleMax,
  bgStickerRotMinDeg,
  bgStickerRotMaxDeg,
  bgProductIds,
  storeWatermarkFontPx,
  storeWatermarkNameGapPx,
  productsForPool,
}: {
  initialTheme: ResolvedPublicTheme;
  initialCardHoverMode: "zoom" | "glow";
  bgEnabled: boolean;
  bgMaxImages: number;
  bgSpawnIntervalMs: number;
  bgOpacityPercent: number;
  bgSandOverlayMode: BgSandOverlayMode;
  bgImageOpacityPercent: number;
  bgTileScaleMin: number;
  bgTileScaleMax: number;
  bgStickerRotMinDeg: number;
  bgStickerRotMaxDeg: number;
  bgProductIds: string[];
  storeWatermarkFontPx: number;
  storeWatermarkNameGapPx: number;
  productsForPool: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [colors, setColors] = useState<ThemeColors>(initialTheme.colors);
  const [chrome, setChrome] = useState<ThemeChrome>(initialTheme.chrome);
  const [layout, setLayout] = useState<ThemeLayout>(initialTheme.layout);
  const [text, setText] = useState<ThemeText>(initialTheme.text);
  const [paneDefaults, setPaneDefaults] = useState<ThemePaneDefaults>(initialTheme.paneDefaults);
  const [productCard, setProductCard] = useState<ThemeProductCard>(initialTheme.productCard);
  const [productFooter, setProductFooter] = useState<ThemeProductFooter>(initialTheme.productFooter);
  const [cardHoverMode, setCardHoverMode] = useState<"zoom" | "glow">(initialCardHoverMode);
  const [decorRows, setDecorRows] = useState<ThemeDecorImageEntry[]>(() =>
    initialTheme.decorImageEntries.length > 0
      ? initialTheme.decorImageEntries.map((e) => ({ ...e }))
      : initialTheme.decorImageUrls.map((url) => ({ url, weight: 50, alwaysOnTop: false })),
  );
  const [bgOn, setBgOn] = useState(bgEnabled);
  const [bgMax, setBgMax] = useState(bgMaxImages);
  const [bgMs, setBgMs] = useState(bgSpawnIntervalMs);
  const [bgOp, setBgOp] = useState(bgOpacityPercent);
  const [bgSandMode, setBgSandMode] = useState<BgSandOverlayMode>(bgSandOverlayMode);
  const [bgImageOp, setBgImageOp] = useState(bgImageOpacityPercent);
  const [bgScaleMin, setBgScaleMin] = useState(bgTileScaleMin);
  const [bgScaleMax, setBgScaleMax] = useState(bgTileScaleMax);
  const [bgRotMin, setBgRotMin] = useState(bgStickerRotMinDeg);
  const [bgRotMax, setBgRotMax] = useState(bgStickerRotMaxDeg);
  const [poolIds, setPoolIds] = useState<string[]>(bgProductIds);
  const [storeFont, setStoreFont] = useState(storeWatermarkFontPx);
  const [storeNameGap, setStoreNameGap] = useState(storeWatermarkNameGapPx);
  const [poolQuery, setPoolQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredPoolProducts = useMemo(() => {
    const q = poolQuery.trim().toLowerCase();
    if (!q) return productsForPool;
    return productsForPool.filter((p) => p.name.toLowerCase().includes(q));
  }, [productsForPool, poolQuery]);

  const decorServerSig = `${initialTheme.decorImageUrls.join("\0")}::${JSON.stringify(initialTheme.decorImageEntries)}`;
  useEffect(() => {
    setDecorRows(
      initialTheme.decorImageEntries.length > 0
        ? initialTheme.decorImageEntries.map((e) => ({ ...e }))
        : initialTheme.decorImageUrls.map((url) => ({ url, weight: 50, alwaysOnTop: false })),
    );
  }, [decorServerSig]);

  useEffect(() => {
    setBgSandMode(bgSandOverlayMode);
  }, [bgSandOverlayMode]);

  useEffect(() => {
    setStoreFont(storeWatermarkFontPx);
    setStoreNameGap(storeWatermarkNameGapPx);
  }, [storeWatermarkFontPx, storeWatermarkNameGapPx]);

  useEffect(() => {
    setBgRotMin(bgStickerRotMinDeg);
    setBgRotMax(bgStickerRotMaxDeg);
  }, [bgStickerRotMinDeg, bgStickerRotMaxDeg]);

  function buildPayload(): ThemeSavePayload {
    const entries: ThemeDecorImageEntry[] = decorRows.map((r) => ({
      url: r.url,
      weight: Math.min(100, Math.max(1, Math.round(r.weight))),
      alwaysOnTop: r.alwaysOnTop,
    }));
    const blob: SiteThemeConfigBlob = {
      colors: { ...colors, headerFg: chrome.headerBrandFg },
      text,
      layout,
      chrome,
      paneDefaults,
      storefront: { productCard, productFooter },
      background: { decorImageUrls: entries.map((e) => e.url), decorImageEntries: entries },
    };
    return {
      themeBlob: blob,
      cardHoverMode,
      bgEnabled: bgOn,
      bgMaxImages: bgMax,
      bgSpawnIntervalMs: bgMs,
      bgOpacityPercent: bgOp,
      bgSandOverlayMode: bgSandMode,
      bgImageOpacityPercent: bgImageOp,
      bgTileScaleMin: bgScaleMin,
      bgTileScaleMax: Math.max(bgScaleMin, bgScaleMax),
      bgStickerRotMinDeg: Math.min(bgRotMin, bgRotMax),
      bgStickerRotMaxDeg: Math.max(bgRotMin, bgRotMax),
      bgProductIds: poolIds,
      storeWatermarkFontPx: storeFont,
      storeWatermarkNameGapPx: storeNameGap,
    };
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      try {
        await saveFullThemeSettings(buildPayload());
        setMsg("Saved. Storefront theme updated.");
        router.refresh();
      } catch {
        setMsg("Could not save.");
      }
    });
  }

  function uploadDecor() {
    const input = fileRef.current;
    if (!input?.files?.[0]) return;
    const fd = new FormData();
    fd.set("file", input.files[0]);
    setMsg(null);
    startTransition(async () => {
      const r = await uploadThemeDecorImage(fd);
      input.value = "";
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setDecorRows((u) => [...u, { url: r.url, weight: 50, alwaysOnTop: false }].slice(0, 300));
      setMsg("Image added. Click Save theme to persist the list.");
    });
  }

  function removeDecor(url: string) {
    setMsg(null);
    startTransition(async () => {
      await removeThemeDecorUrl(url);
      setDecorRows((u) => u.filter((x) => x.url !== url));
      router.refresh();
    });
  }

  function resetColors() {
    setColors({ ...BUILTIN_COLORS });
  }

  function resetLayout() {
    setLayout({ ...BUILTIN_LAYOUT });
  }

  function resetChrome() {
    setChrome({ ...BUILTIN_CHROME });
  }

  function resetPaneDefaults() {
    setPaneDefaults({ ...BUILTIN_PANE_DEFAULTS });
  }

  function resetProductCard() {
    setProductCard({ ...BUILTIN_PRODUCT_CARD });
  }

  function resetProductFooter() {
    setProductFooter({ ...BUILTIN_PRODUCT_FOOTER });
  }

  function resetText() {
    setText({ ...BUILTIN_TEXT });
  }

  function togglePool(id: string) {
    setPoolIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function checkAllFilteredPool() {
    const add = new Set(filteredPoolProducts.map((p) => p.id));
    setPoolIds((prev) => [...new Set([...prev, ...add])]);
  }

  function uncheckAllFilteredPool() {
    const drop = new Set(filteredPoolProducts.map((p) => p.id));
    setPoolIds((prev) => prev.filter((id) => !drop.has(id)));
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-palm/25 bg-surf/25 p-4 text-sm text-ink/85">
        <p className="font-bold text-palm">What lives here</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs sm:text-sm">
          <li>
            <strong>Page layout</strong> — site vs page background, column gutters &amp; border
          </li>
          <li>
            <strong>Header / Footer</strong> — bar colors only (footer copy →{" "}
            <Link href="/settings/footer" className="text-lagoon-dark underline">
              Site Footer
            </Link>
            )
          </li>
          <li>
            <strong>Shop &amp; product cards</strong> — store grid card colors &amp; hover
          </li>
          <li>
            <strong>Brand, text, buttons</strong> — site-wide palette &amp; CTAs
          </li>
          <li>
            <strong>Home panes</strong> — defaults for new blocks on Home / Featured / About
          </li>
          <li>
            <strong>Animated background</strong> — floating stickers &amp; overlay
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className={btnSecondaryMd}
        >
          {pending ? "Saving…" : "Save theme"}
        </button>
        {msg ? <span className="text-sm text-lagoon-dark">{msg}</span> : null}
        <Link href="/store" className="text-sm font-medium text-lagoon-dark underline">
          Preview store
        </Link>
      </div>

      <CollapsibleSection title="Page layout" summary="Backgrounds, gutters, main column border" defaultOpen>
        <div className="rounded border border-palm/25 bg-surf/30 p-4">
          <p className="text-sm font-bold text-palm">Column &amp; surfaces</p>
          <p className="mb-3 text-xs text-ink/60">
            The storefront uses a centered column with optional side gutters (space outside the column borders).
          </p>
          <button type="button" onClick={resetLayout} className="mb-3 text-xs font-bold text-lagoon-dark underline">
            Reset page layout
          </button>
          <div className="grid gap-4 sm:grid-cols-2">
            {layoutColorKeys.map(({ key, label, hint }) => (
              <label key={key} className="block text-sm font-bold text-ink">
                {label}
                <p className="mb-1 text-xs font-normal text-ink/60">{hint}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    aria-label={label}
                    value={normalizePaneColorHex(colors[key]) ?? BUILTIN_COLORS[key]}
                    onChange={(e) => setColors((c) => ({ ...c, [key]: e.target.value }))}
                    className="h-10 w-14 cursor-pointer rounded border-2 border-palm-mid bg-white p-1"
                  />
                  <input
                    type="text"
                    value={colors[key]}
                    onChange={(e) => setColors((c) => ({ ...c, [key]: e.target.value }))}
                    spellCheck={false}
                    className="min-w-0 flex-1 border-2 border-palm-mid px-2 py-2 font-mono text-xs"
                  />
                </div>
              </label>
            ))}
          </div>
          <label className="mt-4 block text-sm font-bold text-ink" htmlFor="main-column-side-gap">
            Side gutter ({layout.mainColumnSideGapPx}px each side)
            <p className="mb-1 text-xs font-normal text-ink/60">
              Set to <strong>0</strong> for a full-width column. Increase to show more site background on the sides.
            </p>
            <input
              id="main-column-side-gap"
              type="range"
              min={0}
              max={320}
              value={layout.mainColumnSideGapPx}
              onChange={(e) => setLayout((l) => ({ ...l, mainColumnSideGapPx: Number(e.target.value) }))}
              className="mt-1 w-full accent-palm"
            />
          </label>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold text-ink">
              Column border color
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  aria-label="Column border color"
                  value={
                    normalizePaneColorHex(layout.mainColumnBorderColorHex) ??
                    BUILTIN_LAYOUT.mainColumnBorderColorHex
                  }
                  onChange={(e) =>
                    setLayout((l) => ({ ...l, mainColumnBorderColorHex: e.target.value }))
                  }
                  className="h-10 w-14 cursor-pointer rounded border-2 border-palm-mid bg-white p-1"
                />
                <input
                  type="text"
                  value={layout.mainColumnBorderColorHex}
                  onChange={(e) =>
                    setLayout((l) => ({ ...l, mainColumnBorderColorHex: e.target.value }))
                  }
                  spellCheck={false}
                  className="min-w-0 flex-1 border-2 border-palm-mid px-2 py-2 font-mono text-xs"
                />
              </div>
            </label>
            <label className="block text-sm font-bold text-ink" htmlFor="main-column-border-width">
              Column border thickness ({layout.mainColumnBorderWidthPx}px)
              <p className="mb-1 text-xs font-normal text-ink/60">Left and right edges of the main column. Use 0 for none.</p>
              <input
                id="main-column-border-width"
                type="range"
                min={0}
                max={24}
                value={layout.mainColumnBorderWidthPx}
                onChange={(e) =>
                  setLayout((l) => ({ ...l, mainColumnBorderWidthPx: Number(e.target.value) }))
                }
                className="mt-1 w-full accent-palm"
              />
            </label>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Header bar" summary="Top navigation — background, text, border">
        <p className="text-xs text-ink/65">
          Cart, Admin, and Join chips use <strong>Header cart &amp; chips (mango)</strong> under Brand &amp; surfaces.
        </p>
        <button type="button" onClick={resetChrome} className="text-xs font-bold text-lagoon-dark underline">
          Reset header &amp; footer defaults
        </button>
        <ThemeHeaderChromeFields
          chrome={chrome}
          fallbacks={BUILTIN_CHROME}
          onChange={(patch) => setChrome((c) => ({ ...c, ...patch }))}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Footer bar" summary="Bottom bar — background, text, border">
        <p className="text-xs text-ink/65">
          <strong>Colors only.</strong> Footer wording, links, and layout are under{" "}
          <Link href="/settings/footer" className="font-medium text-lagoon-dark underline">
            Settings → Site Footer
          </Link>
          . The Admin button in the footer keeps its own bordered style (not controlled here).
        </p>
        <ThemeFooterChromeFields
          chrome={chrome}
          fallbacks={BUILTIN_CHROME}
          onChange={(patch) => setChrome((c) => ({ ...c, ...patch }))}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Shop & product cards" summary="Store grid cards — colors & hover" defaultOpen>
        <p className="text-xs text-ink/65">
          Applies to the <Link href="/store" className="text-lagoon-dark underline">store catalog</Link>, featured
          strips, and product carousels. Parent page must wrap the grid with hover mode (saved below).
        </p>
        <button type="button" onClick={resetProductCard} className="text-xs font-bold text-lagoon-dark underline">
          Reset product card colors
        </button>
        <label className="mt-3 block text-sm font-bold text-ink">
          Card hover effect
          <select
            value={cardHoverMode}
            onChange={(e) => setCardHoverMode(e.target.value === "glow" ? "glow" : "zoom")}
            className="mt-1 block w-full max-w-xs border-2 border-palm-mid bg-white px-2 py-2 text-sm"
          >
            <option value="zoom">Zoom — card scales up slightly</option>
            <option value="glow">Glow — teal ring (uses hover glow color below)</option>
          </select>
        </label>
        <ProductCardColorGrid productCard={productCard} setProductCard={setProductCard} />
      </CollapsibleSection>

      <CollapsibleSection title="Gallery" summary="Public gallery grid, lightbox, tagged products">
        <p className="text-xs text-ink/65">
          Controls the customer{" "}
          <Link href="/gallery" className="font-medium text-lagoon-dark underline">
            Gallery
          </Link>{" "}
          and the community preview strip on Art Sub panes. Pin count badge colors are gallery-only; other fields may
          share values with Page layout, Shop &amp; product cards, Brand &amp; surfaces, or Buttons.
        </p>
        <GalleryThemeColorGrid
          colors={colors}
          setColors={setColors}
          productCard={productCard}
          setProductCard={setProductCard}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Product footers"
        summary="Blocks at bottom of product pages — colors, type, borders"
        defaultOpen
      >
        <p className="text-xs text-ink/65">
          Styles the automatic footer blocks from{" "}
          <Link href="/settings/products/footers" className="font-medium text-lagoon-dark underline">
            Settings → Product footers
          </Link>
          . Content (title and HTML) is still edited there; this section controls appearance only.
        </p>
        <button type="button" onClick={resetProductFooter} className="text-xs font-bold text-lagoon-dark underline">
          Reset product footer styles
        </button>
        <ProductFooterThemeFields productFooter={productFooter} setProductFooter={setProductFooter} />
      </CollapsibleSection>

      <CollapsibleSection title="Brand & surfaces" summary="Shared greens, panels, soft fills">
        <p className="text-xs text-ink/65">
          Site-wide tokens. Product cards and product footers have their own sections above.
        </p>
        <button type="button" onClick={resetColors} className="text-xs font-bold text-lagoon-dark underline">
          Reset brand &amp; text colors to defaults
        </button>
        <p className="mt-3 text-sm font-bold text-palm">Brand &amp; panels</p>
        <ColorPickerGrid keys={brandColorKeys} colors={colors} setColors={setColors} />
        <p className="mt-4 text-sm font-bold text-palm">Text &amp; accents</p>
        <ColorPickerGrid keys={textAndAccentColorKeys} colors={colors} setColors={setColors} />
      </CollapsibleSection>

      <CollapsibleSection title="Buttons" summary="Main, secondary, important — site-wide CTAs">
        <p className="text-xs text-ink/60">
          Main = shop CTAs and sign-up. Secondary = Save, Undo, filters. Important = Clear, Delete, Remove. Does not
          change the top header cart/admin chips (see Header cart &amp; chips under Brand).
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" className={`${btnMainSm} shrink-0`}>
            Main
          </button>
          <button type="button" className={`${btnSecondarySm} shrink-0`}>
            Secondary
          </button>
          <button type="button" className={`${btnChip} shrink-0`}>
            Chip
          </button>
          <button type="button" className={`${btnChipActive} shrink-0`} aria-current="true">
            Chip on
          </button>
          <button type="button" className={`${btnImportantSm} shrink-0`}>
            Important
          </button>
        </div>
        <ColorPickerGrid keys={buttonColorKeys} colors={colors} setColors={setColors} />
      </CollapsibleSection>

      <CollapsibleSection title="Home page panes" summary="Defaults for new blocks on Home / Featured / About">
        <div className="rounded border border-palm/25 bg-surf/30 p-3">
          <p className="text-sm font-bold text-palm">Default new pane surfaces</p>
          <p className="mb-2 text-xs text-ink/60">Applied when you add a pane under Home / Featured / About.</p>
          <button type="button" onClick={resetPaneDefaults} className="mb-3 text-xs font-bold text-lagoon-dark underline">
            Reset pane defaults
          </button>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold text-ink">
              Default pane fill
              <input
                type="color"
                value={paneDefaults.paneColorHex}
                onChange={(e) => setPaneDefaults((p) => ({ ...p, paneColorHex: e.target.value }))}
                className="mt-1 h-10 w-full max-w-[14rem] cursor-pointer rounded border-2 border-palm-mid"
              />
            </label>
            <label className="block text-sm font-bold text-ink">
              Default pane border
              <input
                type="color"
                value={paneDefaults.paneBorderColorHex}
                onChange={(e) => setPaneDefaults((p) => ({ ...p, paneBorderColorHex: e.target.value }))}
                className="mt-1 h-10 w-full max-w-[14rem] cursor-pointer rounded border-2 border-palm-mid"
              />
            </label>
            <label className="block text-sm font-bold text-ink" htmlFor="pd-op">
              Default pane opacity ({paneDefaults.backgroundOpacity}%)
              <input
                id="pd-op"
                type="range"
                min={0}
                max={100}
                value={paneDefaults.backgroundOpacity}
                onChange={(e) =>
                  setPaneDefaults((p) => ({ ...p, backgroundOpacity: Number(e.target.value) }))
                }
                className="mt-1 w-full accent-palm"
              />
            </label>
            <label className="block text-sm font-bold text-ink" htmlFor="pd-bw">
              Default border width ({paneDefaults.paneBorderWidthPx}px)
              <input
                id="pd-bw"
                type="range"
                min={0}
                max={24}
                value={paneDefaults.paneBorderWidthPx}
                onChange={(e) =>
                  setPaneDefaults((p) => ({ ...p, paneBorderWidthPx: Number(e.target.value) }))
                }
                className="mt-1 w-full accent-palm"
              />
            </label>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Typography" summary="Base size & fonts">
        <button type="button" onClick={resetText} className="text-xs font-bold text-lagoon-dark underline">
          Reset text defaults
        </button>
        <label className="block text-sm font-bold text-ink">
          Base font size (px)
          <input
            type="number"
            min={14}
            max={22}
            value={text.baseFontSizePx}
            onChange={(e) => setText((t) => ({ ...t, baseFontSizePx: Number(e.target.value) }))}
            className="mt-1 w-24 border-2 border-palm-mid px-2 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          Body font
          <select
            value={text.bodyFont}
            onChange={(e) => setText((t) => ({ ...t, bodyFont: e.target.value === "system" ? "system" : "geist" }))}
            className="mt-1 block w-full max-w-xs border-2 border-palm-mid bg-white px-2 py-2 text-sm"
          >
            <option value="geist">Geist Sans (site default)</option>
            <option value="system">System UI</option>
          </select>
        </label>
        <label className="block text-sm font-bold text-ink">
          Heading font
          <select
            value={text.headingFont}
            onChange={(e) =>
              setText((t) => ({ ...t, headingFont: e.target.value === "system" ? "system" : "geist" }))
            }
            className="mt-1 block w-full max-w-xs border-2 border-palm-mid bg-white px-2 py-2 text-sm"
          >
            <option value="geist">Geist Sans</option>
            <option value="system">System UI</option>
          </select>
        </label>
      </CollapsibleSection>

      <CollapsibleSection title="Animated background" summary="Motion, stickers, anti-theft overlay, pool">
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <input type="checkbox" checked={bgOn} onChange={(e) => setBgOn(e.target.checked)} />
          Animated backdrop on
        </label>
        <label className="block text-sm font-bold text-ink">
          Max decorative tiles on screen
          <input
            type="number"
            min={1}
            max={300}
            value={bgMax}
            onChange={(e) => setBgMax(Math.min(300, Math.max(1, Math.floor(Number(e.target.value) || 1))))}
            className="mt-1 w-24 border-2 border-palm-mid px-2 py-2 text-sm"
          />
        </label>
        <p className="text-xs text-ink/60">Up to 300 on-screen; decor pool can reuse the same files.</p>
        <label className="block text-sm font-bold text-ink">
          Motion interval (ms)
          <input
            type="number"
            min={250}
            max={20000}
            step={100}
            value={bgMs}
            onChange={(e) => setBgMs(Number(e.target.value))}
            className="mt-1 w-32 border-2 border-palm-mid px-2 py-2 text-sm"
          />
        </label>
        <p className="text-xs text-ink/60">Time between <strong>new floating stickers</strong> only.</p>
        <div>
          <label className="block text-sm font-bold text-ink" htmlFor="bg-img-op-r">
            Sticker image opacity ({bgImageOp}%)
          </label>
          <p className="text-xs text-ink/60">
            How visible the <strong>floating stickers</strong> are in their own layer. This is only the art opacity — it
            does <strong>not</strong> include the anti-theft layer. The anti-theft overlay (below) sits <strong>on top</strong> of
            the gradient and these stickers.
          </p>
          <input
            id="bg-img-op-r"
            type="range"
            min={0}
            max={100}
            value={bgImageOp}
            onChange={(e) => setBgImageOp(Number(e.target.value))}
            className="mt-1 w-full max-w-md accent-palm"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-ink" htmlFor="bg-sand-style">
            Anti-theft overlay (top layer, above stickers)
          </label>
          <p className="text-xs text-ink/60">
            The base wallpaper is only the <strong>smooth color gradient</strong>. The diagonal line look is{" "}
            <strong>not</strong> part of the background anymore — you choose a <strong>flat sand color</strong>, the{" "}
            <strong>diagonal line texture</strong>, or a <strong>repeating store-name watermark</strong> (all controlled
            with anti-theft overlay opacity). Store-name watermarks are <strong>text only</strong> (gaps between letters
            stay clear so sticker art is not dimmed in those areas). It is separate from sticker image opacity above.
          </p>
          <p className="mt-1 text-xs text-ink/55">
            Store-name options use the <strong>company name</strong> from{" "}
            <Link href="/settings/global" className="text-lagoon-dark underline">
              Global settings
            </Link>
            .
          </p>
          <select
            id="bg-sand-style"
            value={bgSandMode}
            onChange={(e) => {
              const v = e.target.value;
              setBgSandMode(
                v === "solid"
                  ? "solid"
                  : v === "store_name"
                    ? "store_name"
                    : v === "store_name_continuous"
                      ? "store_name_continuous"
                      : "diagonal",
              );
            }}
            className="mt-2 block w-full max-w-md border-2 border-palm-mid bg-white px-2 py-2 text-sm"
          >
            <option value="diagonal">Diagonal line texture (static)</option>
            <option value="solid">Flat sand color</option>
            <option value="store_name">Store name (scattered, diagonal)</option>
            <option value="store_name_continuous">Store name (continuous diagonal bands)</option>
          </select>
          <div className="mt-4 space-y-3 border-t border-ink/10 pt-3">
            <p className="text-xs text-ink/65">
              <strong>Store name</strong> watermark: one font for both <strong>scattered</strong> and{" "}
              <strong>continuous</strong>. <strong>Spacing</strong> adds room between name instances in continuous text,
              pulls scattered labels apart, and sets distance between the two continuous diagonal lines.
            </p>
            <div>
              <label className="block text-sm font-bold text-ink" htmlFor="store-font">
                Store name font size ({storeFont}px)
              </label>
              <input
                id="store-font"
                type="range"
                min={10}
                max={36}
                value={storeFont}
                onChange={(e) => setStoreFont(Number(e.target.value))}
                className="mt-1 w-full max-w-md accent-palm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink" htmlFor="store-name-gap">
                Name/line spacing ({storeNameGap}px)
              </label>
              <input
                id="store-name-gap"
                type="range"
                min={0}
                max={64}
                value={storeNameGap}
                onChange={(e) => setStoreNameGap(Number(e.target.value))}
                className="mt-1 w-full max-w-md accent-palm"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-ink" htmlFor="bg-op-r">
            Anti-theft overlay opacity ({bgOp}%)
          </label>
          <p className="text-xs text-ink/60">
            Strength of the <strong>top</strong> layer (flat sand or line texture) above the gradient and floating
            stickers. Independent of sticker image opacity.
          </p>
          <input
            id="bg-op-r"
            type="range"
            min={0}
            max={100}
            value={bgOp}
            onChange={(e) => setBgOp(Number(e.target.value))}
            className="mt-1 w-full max-w-md accent-palm"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold text-ink">
            Tile size min (% of 4rem base)
            <input
              type="number"
              min={5}
              max={1000}
              value={bgScaleMin}
              onChange={(e) => {
                const n = Math.min(1000, Math.max(5, Math.floor(Number(e.target.value) || 50)));
                setBgScaleMin(n);
                setBgScaleMax((m) => (m < n ? n : m));
              }}
              className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-bold text-ink">
            Tile size max (% of 4rem base)
            <input
              type="number"
              min={5}
              max={1000}
              value={bgScaleMax}
              onChange={(e) => {
                const n = Math.min(1000, Math.max(5, Math.floor(Number(e.target.value) || 100)));
                setBgScaleMax(Math.max(n, bgScaleMin));
              }}
              className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
            />
          </label>
        </div>
        <p className="text-xs text-ink/65">
          Each image tile is scaled randomly between min and max. No border; images keep transparency (e.g. PNGs).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold text-ink">
            Sticker rotation min (°)
            <input
              type="number"
              min={-360}
              max={360}
              value={bgRotMin}
              onChange={(e) => {
                const n = Math.min(360, Math.max(-360, Math.round(Number(e.target.value) || 0)));
                setBgRotMin(n);
              }}
              className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-bold text-ink">
            Sticker rotation max (°)
            <input
              type="number"
              min={-360}
              max={360}
              value={bgRotMax}
              onChange={(e) => {
                const n = Math.min(360, Math.max(-360, Math.round(Number(e.target.value) || 0)));
                setBgRotMax(n);
              }}
              className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
            />
          </label>
        </div>
        <p className="text-xs text-ink/65">
          Each new tile picks a <strong>random angle</strong> between these bounds (e.g. −15° to 15° for nearly upright).
          You can use the full −360° to 360° range for sharper tilts or occasional upside-down placements.
        </p>
        <p className="text-xs text-ink/60">
          <strong>Spawn weight</strong> (per upload) changes how often that image is picked relative to others (1 = rare,
          100 = very common). <strong>Always on top</strong> makes that sticker float above the other tiles until it fades.
        </p>

        <div className="rounded border border-palm/20 bg-white/80 p-3 dark:border-zinc-600 dark:bg-zinc-900/50">
          <p className="text-sm font-bold text-palm">Upload decorative images</p>
          <p className="mt-1 text-xs text-ink/65">
            Files are stored on the server or Vercel Blob (set{" "}
            <code className="rounded bg-surf/80 px-1">BLOB_READ_WRITE_TOKEN</code> in production). Save the theme after
            uploading. Product-pool images (below) are additional tile sources.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="text-sm" />
            <button
              type="button"
              disabled={pending}
              onClick={uploadDecor}
              className={btnSecondarySm}
            >
              Upload
            </button>
          </div>
        </div>

        <div className="rounded border border-palm/20 bg-white/80 p-3 dark:border-zinc-600 dark:bg-zinc-900/50">
          <p className="text-sm font-bold text-palm">Uploaded images in pool</p>
          <p className="text-xs text-ink/65">Remove deletes the file from storage. View opens the full image in a new tab.</p>
          {decorRows.length === 0 ? (
            <p className="mt-2 text-sm text-ink/60">No uploaded images yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-palm/20 text-left text-xs font-bold uppercase tracking-wide text-ink/70">
                    <th className="py-2 pr-3">Preview</th>
                    <th className="py-2 pr-3">Url</th>
                    <th className="whitespace-nowrap py-2 pr-3">Weight (1–100)</th>
                    <th className="whitespace-nowrap py-2 pr-3">On top</th>
                    <th className="w-0 whitespace-nowrap py-2 pl-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {decorRows.map((row) => (
                    <tr key={row.url} className="border-b border-palm/10">
                      <td className="align-middle py-2 pr-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.url}
                          alt=""
                          className="h-14 w-14 rounded border border-palm/25 object-contain bg-sand/50"
                        />
                      </td>
                      <td className="break-all align-middle py-2 pr-3 font-mono text-xs text-ink/80">
                        {row.url}
                      </td>
                      <td className="align-middle py-2 pr-3">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={row.weight}
                          onChange={(e) => {
                            const w = Math.min(100, Math.max(1, Math.floor(Number(e.target.value) || 1)));
                            setDecorRows((list) =>
                              list.map((r) => (r.url === row.url ? { ...r, weight: w } : r)),
                            );
                          }}
                          className="w-16 border-2 border-palm-mid px-1 py-1 text-xs"
                        />
                      </td>
                      <td className="align-middle py-2 pr-3">
                        <input
                          type="checkbox"
                          checked={row.alwaysOnTop}
                          onChange={(e) => {
                            const c = e.target.checked;
                            setDecorRows((list) =>
                              list.map((r) => (r.url === row.url ? { ...r, alwaysOnTop: c } : r)),
                            );
                          }}
                          aria-label="Float above other stickers"
                        />
                      </td>
                      <td className="align-middle py-2 pl-2">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="whitespace-nowrap text-xs font-bold text-lagoon-dark underline"
                          >
                            View
                          </a>
                          <button
                            type="button"
                            onClick={() => removeDecor(row.url)}
                            className="whitespace-nowrap text-xs font-bold text-coral underline"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded border border-palm/20 bg-white/80 p-3 dark:border-zinc-600 dark:bg-zinc-900/50">
          <p className="text-sm font-bold text-palm">Also use product photos (pool)</p>
          <p className="mt-1 text-xs text-ink/65">
            Pick catalog items whose primary image becomes a tile after your uploaded images. Search narrows the list;
            check / uncheck all applies to <strong>all products in the list below</strong> (the current search
            results). Leave none selected to skip.
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <label className="block min-w-[12rem] flex-1 text-sm font-bold text-ink">
              Search products
              <input
                type="search"
                value={poolQuery}
                onChange={(e) => setPoolQuery(e.target.value)}
                placeholder="Name contains…"
                className="mt-1 w-full max-w-sm border-2 border-palm-mid px-2 py-2 text-sm"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={checkAllFilteredPool}
                disabled={filteredPoolProducts.length === 0}
                className="border-2 border-palm-mid bg-surf/60 px-2 py-1.5 text-xs font-bold text-ink hover:bg-surf disabled:cursor-not-allowed disabled:opacity-50"
              >
                Check all in list
              </button>
              <button
                type="button"
                onClick={uncheckAllFilteredPool}
                disabled={filteredPoolProducts.length === 0}
                className="border-2 border-palm-mid bg-surf/60 px-2 py-1.5 text-xs font-bold text-ink hover:bg-surf disabled:cursor-not-allowed disabled:opacity-50"
              >
                Uncheck all in list
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-ink/50">
            Showing {filteredPoolProducts.length} of {productsForPool.length} products
          </p>
          <div className="mt-2 max-h-48 overflow-y-auto rounded border border-palm/15 p-2">
            {productsForPool.length === 0 ? (
              <p className="text-sm text-ink/60">No products yet.</p>
            ) : filteredPoolProducts.length === 0 ? (
              <p className="text-sm text-ink/60">No products match this search.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {filteredPoolProducts.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={poolIds.includes(p.id)}
                        onChange={() => togglePool(p.id)}
                      />
                      {p.name}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
