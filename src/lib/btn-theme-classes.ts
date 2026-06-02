/** Shared theme button classes — colors from CSS vars in globals.css / buildThemeCss. */

const base =
  "inline-flex items-center justify-center rounded border-2 font-bold transition-[filter,background-color,border-color,color] hover:enabled:brightness-95 disabled:pointer-events-none disabled:opacity-50";

export const btnMain = `${base} btn-main`;
export const btnMainSm = `${base} btn-main px-2 py-1 text-[11px] sm:px-2.5 sm:text-xs`;
export const btnMainMd = `${base} btn-main px-4 py-2 text-sm`;
export const btnMainLg = `${base} btn-main px-6 py-3 text-sm`;

export const btnSecondary = `${base} btn-secondary`;
export const btnSecondarySm = `${base} btn-secondary px-2 py-1 text-[11px] sm:px-2.5 sm:text-xs`;
export const btnSecondaryMd = `${base} btn-secondary px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm`;

/** Filter chips: secondary when off, inverted (fill ↔ border/text) when on. */
export const btnChip = `${base} btn-secondary btn-chip rounded-full px-3 py-1.5 text-sm`;
export const btnChipActive = `${base} btn-secondary btn-chip btn-chip--active rounded-full px-3 py-1.5 text-sm`;

export const btnImportant = `${base} btn-important`;
export const btnImportantSm = `${base} btn-important px-2 py-1 text-[11px] sm:px-2.5 sm:text-xs`;
export const btnImportantMd = `${base} btn-important px-4 py-2 text-xs sm:text-sm`;

/** Text-only destructive control (cart remove, etc.) */
export const btnImportantLink = "font-bold text-[var(--btn-important-bg)] underline hover:opacity-80 disabled:opacity-50";
