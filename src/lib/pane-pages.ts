import type { PageKey } from "@/generated/prisma/enums";

export function storefrontPathForPageKey(page: PageKey): string {
  switch (page) {
    case "HOME":
      return "/";
    case "FEATURED":
      return "/featured";
    case "ABOUT":
      return "/about";
    default: {
      const _exhaustive: never = page;
      return _exhaustive;
    }
  }
}

export function settingsPathForPageKey(page: PageKey): string {
  switch (page) {
    case "HOME":
      return "/settings/home";
    case "FEATURED":
      return "/settings/featured";
    case "ABOUT":
      return "/settings/about";
    default: {
      const _exhaustive: never = page;
      return _exhaustive;
    }
  }
}
