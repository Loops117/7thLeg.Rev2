import Link from "next/link";
import type { SocialPaneLink } from "@/lib/pane-config";

function isSafeExternalUrl(href: string): boolean {
  const t = href.trim().toLowerCase();
  return t.startsWith("https://") || t.startsWith("http://");
}

function platformLabel(platform: string, fallback: string): string {
  const p = platform.toUpperCase();
  switch (p) {
    case "FACEBOOK":
      return "Facebook";
    case "INSTAGRAM":
      return "Instagram";
    case "X":
    case "TWITTER":
      return "X";
    case "TIKTOK":
      return "TikTok";
    case "YOUTUBE":
      return "YouTube";
    case "LINKEDIN":
      return "LinkedIn";
    case "WEBSITE":
      return "Website";
    default:
      return fallback || platform || "Link";
  }
}

function SocialGlyph({ platform }: { platform: string }) {
  const p = platform.toUpperCase();
  const common = "h-8 w-8 shrink-0";
  if (p === "FACEBOOK") {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M22 12a10 10 0 1 0-11.5 9.9v-7H7.9V12h2.6V9.8c0-2.6 1.6-4 3.9-4 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"
        />
      </svg>
    );
  }
  if (p === "INSTAGRAM") {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zm5.25-3.25a1 1 0 1 1-1 1 1 1 0 0 1 1-1z"
        />
      </svg>
    );
  }
  if (p === "X" || p === "TWITTER") {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M18.244 3H21l-7.5 8.57L21.5 21h-5.32l-4.18-4.9L6.55 21H3.8l8-9.15L3 3h5.32l3.78 4.45L18.244 3z"
        />
      </svg>
    );
  }
  if (p === "TIKTOK") {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M16.6 5.82s.17-.98.64-1.7c.45-.68 1.2-1.2 1.2-1.2s-.05 1.05-.45 1.8c-.38.7-1.05 1.35-1.39 1.1zm2.95 2.95c-.82-.02-1.6-.24-2.3-.6v8.38c0 2.5-2.03 4.54-4.54 4.54a4.53 4.53 0 0 1-3.18-7.72 4.5 4.5 0 0 1 2.64-.86v2.52a2 2 0 1 0 2.83 1.83V2h2.55c.1 1.1.5 2.1 1.1 2.9.6.8 1.4 1.4 2.4 1.87z"
        />
      </svg>
    );
  }
  if (p === "YOUTUBE") {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M23.5 7.2s-.2-1.6-.9-2.3c-.9-.9-1.9-.9-2.4-1C17 3.5 12 3.5 12 3.5h-.1s-5 0-8.2.4c-.5.1-1.5.1-2.4 1-.7.7-.9 2.3-.9 2.3S0 9.1 0 11v1.8c0 1.9.2 3.8.2 3.8s.2 1.6.9 2.3c.9.9 2.1.9 2.6 1 1.9.2 8.1.4 8.1.4s5 0 8.2-.4c.5-.1 1.5-.1 2.4-1 .7-.7.9-2.3.9-2.3s.2-1.9.2-3.8V11c0-1.9-.2-3.8-.2-3.8zM9.5 14.6V8.9l6.2 2.9-6.2 2.8z"
        />
      </svg>
    );
  }
  if (p === "LINKEDIN") {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.5 8h4V23h-4V8zm7.5 0h3.8v2.05h.05c.53-1 1.84-2.05 3.8-2.05 4.06 0 4.8 2.67 4.8 6.13V23h-4v-6.4c0-1.53-.03-3.5-2.13-3.5-2.13 0-2.46 1.66-2.46 3.37V23h-4V8z"
        />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.45 2.1 1.17 2.83l-.17.1zm6.9-1.85c-.31-.94-.98-1.74-1.83-2.26.55-.36 1.05-.8 1.48-1.3 1.13 1.23 1.81 2.87 1.81 4.63 0 .34-.03.67-.07 1h-.39z"
      />
    </svg>
  );
}

export function SocialLinksPane({ links }: { links: SocialPaneLink[] }) {
  const valid = links.filter((l) => l.url?.trim() && isSafeExternalUrl(l.url));
  if (valid.length === 0) {
    return (
      <p className="text-center text-sm text-ink/65">
        Add social links in{" "}
        <Link href="/settings/home" className="font-medium text-lagoon-dark underline">
          Settings
        </Link>{" "}
        (or About) for this pane.
      </p>
    );
  }
  return (
    <ul className="flex flex-wrap items-stretch justify-center gap-4 sm:gap-6">
      {valid.map((link, i) => {
        const href = link.url.trim();
        const text = (link.label?.trim() || platformLabel(link.platform, link.label ?? "")).trim();
        return (
          <li key={`${href}-${i}`}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-[7rem] flex-col items-center gap-2 rounded border-2 border-palm/25 bg-white/50 px-4 py-3 text-ink transition hover:border-palm hover:bg-white/90"
            >
              <span className="text-palm">
                <SocialGlyph platform={link.platform} />
              </span>
              <span className="text-center text-xs font-bold uppercase tracking-wide text-palm-mid">{text}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
