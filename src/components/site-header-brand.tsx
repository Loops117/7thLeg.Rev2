import Link from "next/link";
import type { CompanyLogoPlacement } from "@/lib/site-config-types";

export function SiteHeaderBrand({
  name,
  logoUrl,
  placement,
  showName,
  showLogo,
  compact = false,
}: {
  name: string;
  logoUrl: string;
  placement: CompanyLogoPlacement;
  showName: boolean;
  showLogo: boolean;
  /** Tighter logo for mobile header row. */
  compact?: boolean;
}) {
  const hasLogo = showLogo && !!logoUrl?.trim();
  const hasName = showName && !!name?.trim();
  const imgClass = compact
    ? "max-h-7 w-auto max-w-[min(8rem,48vw)] object-contain"
    : "max-h-9 w-auto max-w-[min(10rem,55vw)] object-contain sm:max-h-11 sm:max-w-[min(11rem,70vw)]";
  const nameClass = compact
    ? "text-sm font-bold tracking-tight underline-offset-4 hover:underline"
    : "text-base font-bold tracking-tight underline-offset-4 hover:underline sm:text-xl";

  if (!hasLogo && !hasName) {
    return null;
  }

  if (!hasLogo && hasName) {
    return (
      <Link href="/" className={`text-header-brand-fg ${nameClass}`}>
        {name}
      </Link>
    );
  }

  if (hasLogo && !hasName) {
    return (
      <Link href="/" className="flex justify-center text-header-brand-fg no-underline hover:opacity-95 md:justify-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={name.trim() || "Inverts Oasis"} className={imgClass} />
      </Link>
    );
  }

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={name.trim() || "Inverts Oasis"} className={imgClass} />
  );

  if (placement === "above") {
    return (
      <Link
        href="/"
        className={`flex min-w-0 flex-col items-center text-header-brand-fg no-underline hover:opacity-95 md:items-start ${compact ? "max-w-[min(14rem,80vw)] gap-0" : "gap-0.5"}`}
      >
        {img}
        <span className={`text-center md:text-left ${nameClass}`}>{name}</span>
      </Link>
    );
  }

  if (placement === "center") {
    return (
      <Link
        href="/"
        className={`flex min-w-0 flex-col items-stretch text-header-brand-fg no-underline hover:opacity-95 ${compact ? "max-w-[min(14rem,80vw)] gap-0" : "gap-0.5"}`}
      >
        <span className="flex justify-center">{img}</span>
        <span className={`text-center ${nameClass}`}>{name}</span>
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className={`flex min-w-0 flex-nowrap items-center justify-center gap-1.5 text-header-brand-fg no-underline hover:opacity-95 md:justify-start ${compact ? "max-w-[min(14rem,80vw)]" : ""}`}
    >
      {img}
      <span className={`min-w-0 truncate ${nameClass}`}>{name}</span>
    </Link>
  );
}
