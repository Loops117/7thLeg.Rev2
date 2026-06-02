"use client";

import Link from "next/link";
import { btnMainMd } from "@/lib/btn-theme-classes";
import type { HomePaneConfig } from "@/lib/pane-config";

function isExternal(href: string) {
  return /^https?:\/\//i.test(href) || href.startsWith("//");
}

const animClass: Record<NonNullable<HomePaneConfig["storeBannerAnimation"]>, string> = {
  none: "",
  float: "motion-safe:animate-[storeBannerFloat_5s_ease-in-out_infinite]",
  subtle: "motion-safe:animate-[storeBannerNudge_4s_ease-in-out_infinite]",
};

export function StoreBannerPaneClient({
  logoSrc,
  alt,
  subheading,
  buttons,
  maxWidthPct,
  animation,
}: {
  logoSrc: string;
  alt: string;
  subheading: string;
  buttons: { href: string; label: string; imageUrl?: string }[];
  maxWidthPct: number;
  animation: NonNullable<HomePaneConfig["storeBannerAnimation"]>;
}) {
  const wrap = animClass[animation] ?? animClass.subtle;
  return (
    <div className="flex w-full max-w-4xl flex-col items-center text-center">
      <div className={wrap} style={{ maxWidth: `${maxWidthPct}%` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt={alt} className="mx-auto w-full object-contain" />
      </div>
      {subheading.trim() ? (
        <p className="mt-4 max-w-2xl text-base font-medium text-ink/80 sm:text-lg">{subheading}</p>
      ) : null}
      {buttons.length > 0 ? (
        <ul className="mt-6 flex w-full max-w-2xl flex-wrap items-center justify-center gap-4 sm:gap-5">
          {buttons.map((b, i) => {
            const key = `${b.href}-${i}`;
            const label = b.label?.trim() || "Shop";
            const inner = b.imageUrl?.trim() ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.imageUrl!} alt="" className="max-h-14 w-auto max-w-full object-contain sm:max-h-16" />
                <span className="mt-1 block text-xs font-bold text-ink/90">{label}</span>
              </>
            ) : (
              <span className={`${btnMainMd} sm:text-base`}>
                {label}
              </span>
            );
            if (isExternal(b.href)) {
              return (
                <li key={key}>
                  <a
                    href={b.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-w-[5rem] flex-col items-center gap-0.5 text-ink"
                  >
                    {inner}
                  </a>
                </li>
              );
            }
            return (
              <li key={key}>
                <Link
                  href={b.href || "/store"}
                  className="inline-flex min-w-[5rem] flex-col items-center gap-0.5 text-ink"
                >
                  {inner}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
