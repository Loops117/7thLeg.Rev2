/** Exploration avatar catalogue — shared by admin + future player creation. */

export const EXPLORATION_AVATAR_HAIR_VARIANTS = [
  { key: "short", label: "Short" },
  { key: "pixie", label: "Pixie" },
  { key: "bob", label: "Bob" },
  { key: "medium", label: "Medium" },
  { key: "long", label: "Long" },
  { key: "long_wavy", label: "Long wavy" },
  { key: "ponytail", label: "Ponytail" },
  { key: "twin_tails", label: "Twin tails" },
  { key: "braid", label: "Braid" },
  { key: "bun", label: "Bun" },
  { key: "spiky", label: "Spiky" },
  { key: "bald", label: "Bald" },
] as const;

export type ExplorationAvatarHairVariantKey =
  (typeof EXPLORATION_AVATAR_HAIR_VARIANTS)[number]["key"];

export type ExplorationAvatarColorSlot = "HAIR" | "SKIN" | "SHIRT" | "PANTS";

export const EXPLORATION_AVATAR_ITEM_SLOTS = [
  { slot: "EYES", label: "Eyes" },
  { slot: "MOUTH", label: "Mouth" },
  { slot: "HAT", label: "Hats" },
  { slot: "HELMET", label: "Helmets" },
  { slot: "CAPE", label: "Capes" },
  { slot: "ARMOR", label: "Armor / robes" },
  { slot: "SHOULDERS", label: "Shoulder pads" },
  { slot: "HAND", label: "Hand items" },
  { slot: "BOTTOM", label: "Pants / shorts / skirts" },
] as const;

export type ExplorationAvatarItemSlot = (typeof EXPLORATION_AVATAR_ITEM_SLOTS)[number]["slot"];

export const EXPLORATION_AVATAR_EYE_VARIANTS = [
  { key: "round", label: "Round" },
  { key: "almond", label: "Almond" },
  { key: "wide", label: "Wide" },
  { key: "sleepy", label: "Sleepy" },
  { key: "dot", label: "Dot" },
  { key: "sparkle", label: "Sparkle" },
] as const;

export const EXPLORATION_AVATAR_MOUTH_VARIANTS = [
  { key: "smile", label: "Smile" },
  { key: "grin", label: "Grin" },
  { key: "neutral", label: "Neutral" },
  { key: "smirk", label: "Smirk" },
  { key: "open", label: "Open" },
  { key: "frown", label: "Frown" },
] as const;

export const EXPLORATION_AVATAR_COSMETIC_VARIANTS: Record<
  Exclude<ExplorationAvatarItemSlot, "EYES" | "MOUTH">,
  { key: string; label: string }[]
> = {
  HAT: [
    { key: "wizard", label: "Wizard hat" },
    { key: "pointed", label: "Pointed" },
    { key: "beanie", label: "Beanie" },
    { key: "top_hat", label: "Top hat" },
    { key: "bandana", label: "Bandana" },
    { key: "none", label: "None" },
  ],
  HELMET: [
    { key: "knight", label: "Knight" },
    { key: "viking", label: "Viking" },
    { key: "bucket", label: "Bucket" },
    { key: "none", label: "None" },
  ],
  CAPE: [
    { key: "flowing", label: "Flowing" },
    { key: "short", label: "Short" },
    { key: "hooded", label: "Hooded" },
    { key: "none", label: "None" },
  ],
  ARMOR: [
    { key: "robe", label: "Wizard robe" },
    { key: "leather", label: "Leather" },
    { key: "plate", label: "Plate" },
    { key: "none", label: "None" },
  ],
  SHOULDERS: [
    { key: "spiked", label: "Spiked" },
    { key: "padded", label: "Padded" },
    { key: "crystal", label: "Crystal" },
    { key: "none", label: "None" },
  ],
  HAND: [
    { key: "staff", label: "Staff" },
    { key: "wand", label: "Wand" },
    { key: "sword", label: "Sword" },
    { key: "torch", label: "Torch" },
    { key: "none", label: "None" },
  ],
  BOTTOM: [
    { key: "pants", label: "Pants" },
    { key: "shorts", label: "Shorts" },
    { key: "skirt", label: "Skirt" },
    { key: "underwear", label: "Underwear" },
    { key: "thong", label: "Thong" },
  ],
};

export type ExplorationAvatarHairStyleView = {
  id: string;
  name: string;
  variantKey: ExplorationAvatarHairVariantKey;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
  availableAtCreation: boolean;
};

export type ExplorationAvatarColorView = {
  id: string;
  slot: ExplorationAvatarColorSlot;
  name: string;
  hex: string;
  sortOrder: number;
  active: boolean;
  availableAtCreation: boolean;
};

export type ExplorationAvatarItemView = {
  id: string;
  slot: ExplorationAvatarItemSlot;
  name: string;
  variantKey: string;
  imageUrl: string;
  tintHex: string;
  sortOrder: number;
  active: boolean;
  availableAtCreation: boolean;
};

export type ExplorationAvatarCatalogView = {
  hairStyles: ExplorationAvatarHairStyleView[];
  colors: ExplorationAvatarColorView[];
  items: ExplorationAvatarItemView[];
};

/** Live appearance (player or preview). */
export type ExplorationAvatarAppearance = {
  hairStyleId: string;
  hairColorHex: string;
  skinColorHex: string;
  shirtColorHex: string;
  pantsColorHex: string;
  eyesItemId: string;
  mouthItemId: string;
  /** Biological body for anatomy / undergarment defaults. */
  bodySex?: import("@/lib/game-exploration-body-shared").ExplorationBodySex;
  /** Equipped cosmetics by slot (empty string = none). */
  equipped: Partial<Record<ExplorationAvatarItemSlot, string>>;
  facingDeg?: number;
  /** @deprecated Prefer facingDeg. */
  facing?: 1 | -1;
};

/** Resolved draw payload for the ¾ figure. */
export type ExplorationAvatarLoadout = {
  eyesVariant: string;
  mouthVariant: string;
  eyesImageUrl: string;
  mouthImageUrl: string;
  cosmetics: {
    slot: ExplorationAvatarItemSlot | "FEET";
    variantKey: string;
    imageUrl: string;
    tintHex: string;
  }[];
};

/**
 * @deprecated Prefer resolving items into ExplorationAvatarLoadout.
 * Kept for transitional figure props.
 */
export type ExplorationAvatarCosmetics = {
  hatImageUrl?: string;
  frontHandImageUrl?: string;
  backHandImageUrl?: string;
};

export function isHairVariantKey(raw: string): raw is ExplorationAvatarHairVariantKey {
  return EXPLORATION_AVATAR_HAIR_VARIANTS.some((v) => v.key === raw);
}

export function isAvatarItemSlot(raw: string): raw is ExplorationAvatarItemSlot {
  return EXPLORATION_AVATAR_ITEM_SLOTS.some((s) => s.slot === raw);
}

export function normalizeHexColor(raw: string, fallback = "#888888"): string {
  const t = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(t)) return `#${t.toLowerCase()}`;
  return fallback;
}

export const DEFAULT_AVATAR_COLORS: Record<ExplorationAvatarColorSlot, string> = {
  HAIR: "#3b2314",
  SKIN: "#e0ac69",
  SHIRT: "#2f6f4e",
  PANTS: "#2c3e50",
};

function firstColorHex(
  catalog: ExplorationAvatarCatalogView,
  slot: ExplorationAvatarColorSlot,
): string {
  return catalog.colors.find((c) => c.slot === slot)?.hex ?? DEFAULT_AVATAR_COLORS[slot];
}

function firstItem(
  catalog: ExplorationAvatarCatalogView,
  slot: ExplorationAvatarItemSlot,
): ExplorationAvatarItemView | null {
  return catalog.items.find((i) => i.slot === slot && i.variantKey !== "none") ?? null;
}

/** Defaults from a catalog slice (creation-eligible or full active). */
export function defaultAppearanceFromCatalog(catalog: ExplorationAvatarCatalogView): {
  appearance: ExplorationAvatarAppearance;
  hairStyle: ExplorationAvatarHairStyleView | null;
} {
  const hairStyle = catalog.hairStyles[0] ?? null;
  const eyes = firstItem(catalog, "EYES");
  const mouth = firstItem(catalog, "MOUTH");
  const equipped: ExplorationAvatarAppearance["equipped"] = {};
  for (const slot of ["HAT", "HELMET", "CAPE", "SHOULDERS", "HAND"] as const) {
    const creation = catalog.items.find(
      (i) => i.slot === slot && i.availableAtCreation && i.variantKey !== "none",
    );
    if (creation) equipped[slot] = creation.id;
  }
  return {
    appearance: {
      hairStyleId: hairStyle?.id ?? "",
      hairColorHex: firstColorHex(catalog, "HAIR"),
      skinColorHex: firstColorHex(catalog, "SKIN"),
      shirtColorHex: firstColorHex(catalog, "SHIRT"),
      pantsColorHex: firstColorHex(catalog, "PANTS"),
      eyesItemId: eyes?.id ?? "",
      mouthItemId: mouth?.id ?? "",
      bodySex: "male",
      equipped,
      /** South — face the camera in creation previews. */
      facingDeg: 180,
    },
    hairStyle,
  };
}

function pickNth<T>(list: T[], index: number): T | null {
  if (list.length === 0) return null;
  return list[((index % list.length) + list.length) % list.length] ?? null;
}

function colorsForSlot(
  catalog: ExplorationAvatarCatalogView,
  slot: ExplorationAvatarColorSlot,
): ExplorationAvatarColorView[] {
  return catalog.colors.filter((c) => c.slot === slot);
}

function itemsForSlot(
  catalog: ExplorationAvatarCatalogView,
  slot: ExplorationAvatarItemSlot,
): ExplorationAvatarItemView[] {
  return catalog.items.filter((i) => i.slot === slot && i.variantKey !== "none");
}

/**
 * Visibly different look for the playtest simulated peer (offset picks vs defaults).
 */
export function simPlayerAppearanceFromCatalog(catalog: ExplorationAvatarCatalogView): {
  appearance: ExplorationAvatarAppearance;
  hairStyle: ExplorationAvatarHairStyleView | null;
} {
  const hairStyle =
    pickNth(catalog.hairStyles, 1) ?? catalog.hairStyles[0] ?? null;
  const eyes = pickNth(itemsForSlot(catalog, "EYES"), 2) ?? firstItem(catalog, "EYES");
  const mouth = pickNth(itemsForSlot(catalog, "MOUTH"), 1) ?? firstItem(catalog, "MOUTH");
  const hairColors = colorsForSlot(catalog, "HAIR");
  const skinColors = colorsForSlot(catalog, "SKIN");
  const shirtColors = colorsForSlot(catalog, "SHIRT");
  const pantsColors = colorsForSlot(catalog, "PANTS");

  const equipped: ExplorationAvatarAppearance["equipped"] = {};
  // Prefer later creation options so the peer doesn't twin the local defaults.
  for (const slot of ["HAT", "HELMET", "CAPE", "ARMOR", "SHOULDERS", "HAND", "BOTTOM"] as const) {
    const list = itemsForSlot(catalog, slot);
    const pick = pickNth(list, list.length > 1 ? 1 : 0);
    if (pick) equipped[slot] = pick.id;
  }

  return {
    appearance: {
      hairStyleId: hairStyle?.id ?? "",
      hairColorHex: pickNth(hairColors, 3)?.hex ?? firstColorHex(catalog, "HAIR"),
      skinColorHex: pickNth(skinColors, 2)?.hex ?? firstColorHex(catalog, "SKIN"),
      shirtColorHex: pickNth(shirtColors, 2)?.hex ?? firstColorHex(catalog, "SHIRT"),
      pantsColorHex: pickNth(pantsColors, 1)?.hex ?? firstColorHex(catalog, "PANTS"),
      eyesItemId: eyes?.id ?? "",
      mouthItemId: mouth?.id ?? "",
      bodySex: "male",
      equipped,
      facingDeg: 180,
    },
    hairStyle,
  };
}

/** Distinct look for the playtest simulated NPC (different offset than sim player). */
export function simNpcAppearanceFromCatalog(catalog: ExplorationAvatarCatalogView): {
  appearance: ExplorationAvatarAppearance;
  hairStyle: ExplorationAvatarHairStyleView | null;
} {
  const hairStyle =
    pickNth(catalog.hairStyles, 2) ?? catalog.hairStyles[0] ?? null;
  const eyes = pickNth(itemsForSlot(catalog, "EYES"), 1) ?? firstItem(catalog, "EYES");
  const mouth = pickNth(itemsForSlot(catalog, "MOUTH"), 2) ?? firstItem(catalog, "MOUTH");
  const hairColors = colorsForSlot(catalog, "HAIR");
  const skinColors = colorsForSlot(catalog, "SKIN");
  const shirtColors = colorsForSlot(catalog, "SHIRT");
  const pantsColors = colorsForSlot(catalog, "PANTS");

  const equipped: ExplorationAvatarAppearance["equipped"] = {};
  for (const slot of ["HAT", "HELMET", "CAPE", "ARMOR", "SHOULDERS", "HAND", "BOTTOM"] as const) {
    const list = itemsForSlot(catalog, slot);
    const pick = pickNth(list, list.length > 2 ? 2 : list.length > 1 ? 1 : 0);
    if (pick) equipped[slot] = pick.id;
  }

  return {
    appearance: {
      hairStyleId: hairStyle?.id ?? "",
      hairColorHex: pickNth(hairColors, 1)?.hex ?? firstColorHex(catalog, "HAIR"),
      skinColorHex: pickNth(skinColors, 3)?.hex ?? firstColorHex(catalog, "SKIN"),
      shirtColorHex: pickNth(shirtColors, 4)?.hex ?? firstColorHex(catalog, "SHIRT"),
      pantsColorHex: pickNth(pantsColors, 2)?.hex ?? firstColorHex(catalog, "PANTS"),
      eyesItemId: eyes?.id ?? "",
      mouthItemId: mouth?.id ?? "",
      bodySex: "female",
      equipped,
      facingDeg: 90,
    },
    hairStyle,
  };
}

export function resolveAvatarLoadout(
  appearance: ExplorationAvatarAppearance,
  catalog: ExplorationAvatarCatalogView,
): ExplorationAvatarLoadout {
  const eyes =
    catalog.items.find((i) => i.id === appearance.eyesItemId) ??
    catalog.items.find((i) => i.slot === "EYES");
  const mouth =
    catalog.items.find((i) => i.id === appearance.mouthItemId) ??
    catalog.items.find((i) => i.slot === "MOUTH");
  const cosmetics: ExplorationAvatarLoadout["cosmetics"] = [];
  for (const slot of ["CAPE", "ARMOR", "SHOULDERS", "HAT", "HELMET", "HAND", "BOTTOM"] as const) {
    const id = appearance.equipped?.[slot];
    if (!id) continue;
    const item = catalog.items.find((i) => i.id === id);
    if (!item || item.variantKey === "none") continue;
    cosmetics.push({
      slot,
      variantKey: item.variantKey,
      imageUrl: item.imageUrl,
      tintHex: item.tintHex || "#888888",
    });
  }
  return {
    eyesVariant: eyes?.variantKey || "round",
    mouthVariant: mouth?.variantKey || "smile",
    eyesImageUrl: eyes?.imageUrl ?? "",
    mouthImageUrl: mouth?.imageUrl ?? "",
    cosmetics,
  };
}

/** Facing for oblique map: 0 = north (screen up). World Y increases downward. */
export function facingDegFromDirection(dx: number, dy: number): number {
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return 0;
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

/** Filter catalog to options players may pick at character creation. */
export function dedupeHairStylesByVariant(
  hairStyles: ExplorationAvatarHairStyleView[],
): ExplorationAvatarHairStyleView[] {
  const byVariant = new Map<string, ExplorationAvatarHairStyleView>();
  for (const h of hairStyles) {
    const prev = byVariant.get(h.variantKey);
    if (!prev || h.sortOrder < prev.sortOrder || (h.sortOrder === prev.sortOrder && h.name < prev.name)) {
      byVariant.set(h.variantKey, h);
    }
  }
  return [...byVariant.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

export function filterCatalogForCreation(
  catalog: ExplorationAvatarCatalogView,
): ExplorationAvatarCatalogView {
  return {
    hairStyles: dedupeHairStylesByVariant(
      catalog.hairStyles.filter((h) => h.active && h.availableAtCreation),
    ),
    colors: catalog.colors.filter((c) => c.active && c.availableAtCreation),
    items: catalog.items.filter((i) => i.active && i.availableAtCreation),
  };
}

export const AVATAR_SEED_HAIR_STYLES: {
  name: string;
  variantKey: ExplorationAvatarHairVariantKey;
  sortOrder: number;
  availableAtCreation: boolean;
}[] = [
  { name: "Short crop", variantKey: "short", sortOrder: 0, availableAtCreation: true },
  { name: "Pixie cut", variantKey: "pixie", sortOrder: 1, availableAtCreation: true },
  { name: "Bob", variantKey: "bob", sortOrder: 2, availableAtCreation: true },
  { name: "Shoulder length", variantKey: "medium", sortOrder: 3, availableAtCreation: true },
  { name: "Long", variantKey: "long", sortOrder: 4, availableAtCreation: true },
  { name: "Long wavy", variantKey: "long_wavy", sortOrder: 5, availableAtCreation: true },
  { name: "Ponytail", variantKey: "ponytail", sortOrder: 6, availableAtCreation: true },
  { name: "Twin tails", variantKey: "twin_tails", sortOrder: 7, availableAtCreation: true },
  { name: "Braid", variantKey: "braid", sortOrder: 8, availableAtCreation: true },
  { name: "Bun", variantKey: "bun", sortOrder: 9, availableAtCreation: true },
  { name: "Spiky", variantKey: "spiky", sortOrder: 10, availableAtCreation: true },
  { name: "Bald", variantKey: "bald", sortOrder: 11, availableAtCreation: true },
];

export const AVATAR_SEED_COLORS: {
  slot: ExplorationAvatarColorSlot;
  name: string;
  hex: string;
  sortOrder: number;
  availableAtCreation: boolean;
}[] = [
  { slot: "SKIN", name: "Porcelain", hex: "#f3d1b0", sortOrder: 0, availableAtCreation: true },
  { slot: "SKIN", name: "Light", hex: "#e0ac69", sortOrder: 1, availableAtCreation: true },
  { slot: "SKIN", name: "Tan", hex: "#c68642", sortOrder: 2, availableAtCreation: true },
  { slot: "SKIN", name: "Brown", hex: "#8d5524", sortOrder: 3, availableAtCreation: true },
  { slot: "SKIN", name: "Deep", hex: "#5c3317", sortOrder: 4, availableAtCreation: true },
  { slot: "HAIR", name: "Black", hex: "#1a1a1a", sortOrder: 0, availableAtCreation: true },
  { slot: "HAIR", name: "Brown", hex: "#3b2314", sortOrder: 1, availableAtCreation: true },
  { slot: "HAIR", name: "Auburn", hex: "#6b2d1a", sortOrder: 2, availableAtCreation: true },
  { slot: "HAIR", name: "Blonde", hex: "#d4a84b", sortOrder: 3, availableAtCreation: true },
  { slot: "HAIR", name: "Red", hex: "#b33a1a", sortOrder: 4, availableAtCreation: true },
  { slot: "HAIR", name: "Gray", hex: "#9ca3af", sortOrder: 5, availableAtCreation: true },
  { slot: "SHIRT", name: "Palm green", hex: "#2f6f4e", sortOrder: 0, availableAtCreation: true },
  { slot: "SHIRT", name: "Lagoon", hex: "#0d9488", sortOrder: 1, availableAtCreation: true },
  { slot: "SHIRT", name: "Coral", hex: "#e85d4c", sortOrder: 2, availableAtCreation: true },
  { slot: "SHIRT", name: "Mango", hex: "#f59e0b", sortOrder: 3, availableAtCreation: true },
  { slot: "SHIRT", name: "White", hex: "#f5f5f4", sortOrder: 4, availableAtCreation: true },
  { slot: "SHIRT", name: "Navy", hex: "#1e3a5f", sortOrder: 5, availableAtCreation: true },
  { slot: "PANTS", name: "Slate", hex: "#2c3e50", sortOrder: 0, availableAtCreation: true },
  { slot: "PANTS", name: "Denim", hex: "#3b5998", sortOrder: 1, availableAtCreation: true },
  { slot: "PANTS", name: "Khaki", hex: "#a8956b", sortOrder: 2, availableAtCreation: true },
  { slot: "PANTS", name: "Black", hex: "#1f2937", sortOrder: 3, availableAtCreation: true },
  { slot: "PANTS", name: "Forest", hex: "#1f4d3a", sortOrder: 4, availableAtCreation: true },
];

export const AVATAR_SEED_ITEMS: {
  slot: ExplorationAvatarItemSlot;
  name: string;
  variantKey: string;
  tintHex: string;
  sortOrder: number;
  availableAtCreation: boolean;
}[] = [
  // Eyes — all at creation
  { slot: "EYES", name: "Round", variantKey: "round", tintHex: "", sortOrder: 0, availableAtCreation: true },
  { slot: "EYES", name: "Almond", variantKey: "almond", tintHex: "", sortOrder: 1, availableAtCreation: true },
  { slot: "EYES", name: "Wide", variantKey: "wide", tintHex: "", sortOrder: 2, availableAtCreation: true },
  { slot: "EYES", name: "Sleepy", variantKey: "sleepy", tintHex: "", sortOrder: 3, availableAtCreation: true },
  { slot: "EYES", name: "Dot", variantKey: "dot", tintHex: "", sortOrder: 4, availableAtCreation: true },
  { slot: "EYES", name: "Sparkle", variantKey: "sparkle", tintHex: "", sortOrder: 5, availableAtCreation: true },
  // Mouth — all at creation
  { slot: "MOUTH", name: "Smile", variantKey: "smile", tintHex: "", sortOrder: 0, availableAtCreation: true },
  { slot: "MOUTH", name: "Grin", variantKey: "grin", tintHex: "", sortOrder: 1, availableAtCreation: true },
  { slot: "MOUTH", name: "Neutral", variantKey: "neutral", tintHex: "", sortOrder: 2, availableAtCreation: true },
  { slot: "MOUTH", name: "Smirk", variantKey: "smirk", tintHex: "", sortOrder: 3, availableAtCreation: true },
  { slot: "MOUTH", name: "Open", variantKey: "open", tintHex: "", sortOrder: 4, availableAtCreation: true },
  { slot: "MOUTH", name: "Frown", variantKey: "frown", tintHex: "", sortOrder: 5, availableAtCreation: false },
  // Hats — 2 at creation, rest unlock later
  { slot: "HAT", name: "Beanie", variantKey: "beanie", tintHex: "#3b5998", sortOrder: 0, availableAtCreation: true },
  { slot: "HAT", name: "Bandana", variantKey: "bandana", tintHex: "#e85d4c", sortOrder: 1, availableAtCreation: true },
  { slot: "HAT", name: "Wizard hat", variantKey: "wizard", tintHex: "#5b21b6", sortOrder: 2, availableAtCreation: false },
  { slot: "HAT", name: "Pointed hat", variantKey: "pointed", tintHex: "#0d9488", sortOrder: 3, availableAtCreation: false },
  { slot: "HAT", name: "Top hat", variantKey: "top_hat", tintHex: "#1f2937", sortOrder: 4, availableAtCreation: false },
  // Helmets — locked
  { slot: "HELMET", name: "Knight helm", variantKey: "knight", tintHex: "#9ca3af", sortOrder: 0, availableAtCreation: false },
  { slot: "HELMET", name: "Viking helm", variantKey: "viking", tintHex: "#a8956b", sortOrder: 1, availableAtCreation: false },
  { slot: "HELMET", name: "Bucket helm", variantKey: "bucket", tintHex: "#6b7280", sortOrder: 2, availableAtCreation: false },
  // Capes
  { slot: "CAPE", name: "Traveler cape", variantKey: "short", tintHex: "#2f6f4e", sortOrder: 0, availableAtCreation: true },
  { slot: "CAPE", name: "Hero cape", variantKey: "flowing", tintHex: "#b91c1c", sortOrder: 1, availableAtCreation: false },
  { slot: "CAPE", name: "Hooded cloak", variantKey: "hooded", tintHex: "#312e81", sortOrder: 2, availableAtCreation: false },
  // Armor / robes
  { slot: "ARMOR", name: "Leather vest", variantKey: "leather", tintHex: "#8d5524", sortOrder: 0, availableAtCreation: true },
  { slot: "ARMOR", name: "Wizard robe", variantKey: "robe", tintHex: "#5b21b6", sortOrder: 1, availableAtCreation: false },
  { slot: "ARMOR", name: "Plate armor", variantKey: "plate", tintHex: "#9ca3af", sortOrder: 2, availableAtCreation: false },
  // Shoulders
  { slot: "SHOULDERS", name: "Padded pads", variantKey: "padded", tintHex: "#a8956b", sortOrder: 0, availableAtCreation: true },
  { slot: "SHOULDERS", name: "Spiked pads", variantKey: "spiked", tintHex: "#6b7280", sortOrder: 1, availableAtCreation: false },
  { slot: "SHOULDERS", name: "Crystal pads", variantKey: "crystal", tintHex: "#67e8f9", sortOrder: 2, availableAtCreation: false },
  // Hand
  { slot: "HAND", name: "Torch", variantKey: "torch", tintHex: "#f59e0b", sortOrder: 0, availableAtCreation: true },
  { slot: "HAND", name: "Wooden staff", variantKey: "staff", tintHex: "#8d5524", sortOrder: 1, availableAtCreation: false },
  { slot: "HAND", name: "Spark wand", variantKey: "wand", tintHex: "#c084fc", sortOrder: 2, availableAtCreation: false },
  { slot: "HAND", name: "Sword", variantKey: "sword", tintHex: "#cbd5e1", sortOrder: 3, availableAtCreation: false },
  // Bottoms — all at creation
  { slot: "BOTTOM", name: "Pants", variantKey: "pants", tintHex: "", sortOrder: 0, availableAtCreation: true },
  { slot: "BOTTOM", name: "Shorts", variantKey: "shorts", tintHex: "", sortOrder: 1, availableAtCreation: true },
  { slot: "BOTTOM", name: "Skirt", variantKey: "skirt", tintHex: "", sortOrder: 2, availableAtCreation: true },
];
