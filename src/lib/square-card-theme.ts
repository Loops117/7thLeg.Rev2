/** Build Square Web Payments card form styles from storefront CSS variables. */

type SquareCardStyle = Record<string, Record<string, string>>;

function readCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw || fallback;
}

/** Returns a style object for `payments.card({ style })` matching Settings → Theme product-card tokens. */
export function buildSquareCardStyle(): SquareCardStyle {
  const bg = readCssVar("--product-card-bg", "#ffffff");
  const text = readCssVar("--product-card-description", "#2c2416");
  const border = readCssVar("--product-card-border", "#2d6a4f");
  const focus = readCssVar("--lagoon", "#2a9d8f");
  const error = readCssVar("--coral", "#e76f51");
  const muted = readCssVar("--palm-mid", "#2d6a4f");

  // Square rejects comma-separated font stacks (e.g. "system-ui, sans-serif") — one family only.
  return {
    input: {
      backgroundColor: bg,
      color: text,
      fontSize: "16px",
    },
    "input::placeholder": {
      color: muted,
    },
    "input.is-focus": {
      backgroundColor: bg,
      color: text,
    },
    "input.is-error": {
      color: error,
    },
    ".input-container": {
      borderColor: border,
      borderRadius: "4px",
      borderWidth: "2px",
    },
    ".input-container.is-focus": {
      borderColor: focus,
    },
    ".input-container.is-error": {
      borderColor: error,
    },
    ".message-text": {
      color: muted,
    },
    ".message-icon": {
      color: muted,
    },
    ".message-text.is-error": {
      color: error,
    },
    ".message-icon.is-error": {
      color: error,
    },
  };
}
