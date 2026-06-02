"use client";

import { normalizePaneColorHex } from "@/lib/pane-config";
import type { ThemeChrome } from "@/lib/theme-config";

export function ThemeChromeColorField({
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

export function ThemeChromeBorderFields({
  colorLabel,
  colorValue,
  colorFallback,
  widthValue,
  widthId,
  widthHint,
  onColorChange,
  onWidthChange,
}: {
  colorLabel: string;
  colorValue: string;
  colorFallback: string;
  widthValue: number;
  widthId: string;
  widthHint?: string;
  onColorChange: (hex: string) => void;
  onWidthChange: (px: number) => void;
}) {
  return (
    <>
      <ThemeChromeColorField
        label={colorLabel}
        value={colorValue}
        fallback={colorFallback}
        onChange={onColorChange}
      />
      <label className="block text-sm font-bold text-ink" htmlFor={widthId}>
        Border thickness ({widthValue}px)
        {widthHint ? <p className="mb-1 text-xs font-normal text-ink/60">{widthHint}</p> : null}
        <input
          id={widthId}
          type="range"
          min={0}
          max={24}
          value={widthValue}
          onChange={(e) => onWidthChange(Number(e.target.value))}
          className="mt-1 w-full accent-palm"
        />
      </label>
    </>
  );
}

export function ThemeHeaderChromeFields({
  chrome,
  fallbacks,
  onChange,
}: {
  chrome: ThemeChrome;
  fallbacks: ThemeChrome;
  onChange: (patch: Partial<ThemeChrome>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ThemeChromeColorField
        label="Background"
        value={chrome.headerBg}
        fallback={fallbacks.headerBg}
        onChange={(headerBg) => onChange({ headerBg })}
      />
      <ThemeChromeColorField
        label="Brand name & logo"
        hint="Company name and logo on the header bar."
        value={chrome.headerBrandFg}
        fallback={fallbacks.headerBrandFg}
        onChange={(headerBrandFg) => onChange({ headerBrandFg })}
      />
      <ThemeChromeColorField
        label="Nav & text links"
        hint="Menu items, Log in, Sign out, account menu. Cart and Admin chips use accent colors below."
        value={chrome.headerNavFg}
        fallback={fallbacks.headerNavFg}
        onChange={(headerNavFg) => onChange({ headerNavFg })}
      />
      <ThemeChromeBorderFields
        colorLabel="Bottom border color"
        colorValue={chrome.headerBorderColorHex}
        colorFallback={fallbacks.headerBorderColorHex}
        widthValue={chrome.headerBorderWidthPx}
        widthId="header-border-width"
        widthHint="Edge under the header. Use 0 for none."
        onColorChange={(headerBorderColorHex) => onChange({ headerBorderColorHex })}
        onWidthChange={(headerBorderWidthPx) => onChange({ headerBorderWidthPx })}
      />
    </div>
  );
}

export function ThemeFooterChromeFields({
  chrome,
  fallbacks,
  onChange,
}: {
  chrome: ThemeChrome;
  fallbacks: ThemeChrome;
  onChange: (patch: Partial<ThemeChrome>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ThemeChromeColorField
        label="Background"
        value={chrome.footerBg}
        fallback={fallbacks.footerBg}
        onChange={(footerBg) => onChange({ footerBg })}
      />
      <ThemeChromeColorField
        label="Brand / tagline"
        hint="Bold site line at the top of the footer."
        value={chrome.footerBrandFg}
        fallback={fallbacks.footerBrandFg}
        onChange={(footerBrandFg) => onChange({ footerBrandFg })}
      />
      <ThemeChromeColorField
        label="Body text"
        hint="Copyright and plain footer copy."
        value={chrome.footerFg}
        fallback={fallbacks.footerFg}
        onChange={(footerFg) => onChange({ footerFg })}
      />
      <ThemeChromeColorField
        label="Text links"
        hint="About, Store, etc. Admin button keeps its own button styling."
        value={chrome.footerLinkFg}
        fallback={fallbacks.footerLinkFg}
        onChange={(footerLinkFg) => onChange({ footerLinkFg })}
      />
      <ThemeChromeBorderFields
        colorLabel="Top border color"
        colorValue={chrome.footerBorderColorHex}
        colorFallback={fallbacks.footerBorderColorHex}
        widthValue={chrome.footerBorderWidthPx}
        widthId="footer-border-width"
        widthHint="Edge above the footer. Use 0 for none."
        onColorChange={(footerBorderColorHex) => onChange({ footerBorderColorHex })}
        onWidthChange={(footerBorderWidthPx) => onChange({ footerBorderWidthPx })}
      />
    </div>
  );
}
