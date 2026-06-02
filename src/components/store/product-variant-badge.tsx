/** Shown on catalog cards when a product has more than one variant option. */
export function ProductVariantBadge({
  count,
  className = "",
}: {
  count: number;
  className?: string;
}) {
  if (count < 2) return null;

  return (
    <span
      className={`pointer-events-none absolute left-2 top-2 z-[6] inline-flex items-center gap-1 rounded-full border-2 border-palm bg-sand/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-palm shadow-sm ${className}`}
      title={`${count} options`}
      aria-hidden
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-3 w-3 shrink-0 opacity-90"
        aria-hidden
      >
        <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h9A1.5 1.5 0 0 1 14 4.5v1A1.5 1.5 0 0 1 12.5 7h-9A1.5 1.5 0 0 1 2 5.5v-1ZM3.5 9A1.5 1.5 0 0 0 2 10.5v1A1.5 1.5 0 0 0 3.5 13h9a1.5 1.5 0 0 0 1.5-1.5v-1A1.5 1.5 0 0 0 12.5 9h-9Z" />
      </svg>
      {count}
    </span>
  );
}

export function storefrontVariantCount(variants: { active?: boolean }[]): number {
  const active = variants.filter((v) => v.active !== false);
  return active.length > 0 ? active.length : variants.length;
}
