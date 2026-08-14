"use client";

import { useEffect, useState } from "react";
import { ArcadeExplorationAvatarFigure } from "@/components/arcade/arcade-exploration-avatar-figure";
import type {
  ExplorationAvatarAppearance,
  ExplorationAvatarHairStyleView,
  ExplorationAvatarLoadout,
} from "@/lib/game-exploration-avatar-shared";
import { isHairVariantKey } from "@/lib/game-exploration-avatar-shared";
import type { ExplorationPawnEmote } from "@/lib/game-exploration-shared";
import type {
  ExplorationToolHeldFx,
  ExplorationToolHeldHand,
  ExplorationToolHeldPose,
} from "@/lib/game-exploration-tools-shared";

const CHOP_MS = 280;

/** Chop angle curve: wind-up → strike → recover (degrees). */
export function explorationToolChopDeg(t: number): number {
  const p = Math.max(0, Math.min(1, t));
  if (p <= 0 || p >= 1) return 0;
  if (p < 0.22) return -50 * (p / 0.22);
  if (p < 0.55) return -50 + 120 * ((p - 0.22) / 0.33);
  return 70 * (1 - (p - 0.55) / 0.45);
}

type Props = {
  appearance: ExplorationAvatarAppearance;
  hairStyle: ExplorationAvatarHairStyleView | null;
  facingDeg: number;
  walking: boolean;
  size?: number;
  className?: string;
  /** Catalog + equipped clothing loadout (eyes/mouth/gear). */
  avatarLoadout?: ExplorationAvatarLoadout | null;
  /** Equipped gather tool image shown in hand. */
  heldToolImageUrl?: string;
  /** Held gather-tool sprite width in avatar SVG units. */
  heldToolImageSizePx?: number;
  /** Held-tool pivot + per-facing rotate/offset. */
  heldToolPose?: ExplorationToolHeldPose | null;
  /** Glow / shimmer rarity FX. */
  heldToolFx?: ExplorationToolHeldFx | null;
  /** Left- or right-handed grip. */
  heldHand?: ExplorationToolHeldHand;
  /** Dual-wield light tool (opposite hand). */
  heldLightImageUrl?: string;
  heldLightImageSizePx?: number;
  heldLightPose?: ExplorationToolHeldPose | null;
  heldLightFx?: ExplorationToolHeldFx | null;
  heldLightHand?: ExplorationToolHeldHand;
  /** Active emote. */
  emote?: ExplorationPawnEmote | null;
  /** Increment to trigger a chop swing. */
  toolChopNonce?: number;
  /** Body / undergarment admin settings. */
  bodySettings?: import("@/lib/game-exploration-body-shared").ExplorationBodySettings;
  waterVisual?: {
    wade: number;
    tintHex: string;
    bodyOpacity: number;
    depthPct: number;
  } | null;
};

/** In-world pawn: runs walk cycle when moving; parent supplies facing. */
export function ArcadeExplorationAvatarPawn({
  appearance,
  hairStyle,
  facingDeg,
  walking,
  size = 44,
  className = "",
  avatarLoadout = null,
  heldToolImageUrl = "",
  heldToolImageSizePx = 20,
  heldToolPose = null,
  heldToolFx = null,
  heldHand = "right",
  heldLightImageUrl = "",
  heldLightImageSizePx = 20,
  heldLightPose = null,
  heldLightFx = null,
  heldLightHand = "left",
  emote = null,
  toolChopNonce = 0,
  bodySettings,
  waterVisual = null,
}: Props) {
  const [phase, setPhase] = useState(0);
  const [emotePhase, setEmotePhase] = useState(0);
  const [chopDeg, setChopDeg] = useState(0);

  useEffect(() => {
    if (!walking && emote !== "dance" && emote !== "celebrate" && emote !== "laugh") return;
    let raf = 0;
    let last = 0;
    const tick = (ts: number) => {
      if (!last) last = ts;
      const dt = (ts - last) / 1000;
      last = ts;
      const rate =
        emote === "celebrate" ? 3.6 : emote === "dance" ? 3.2 : emote === "laugh" ? 2.8 : 2.2;
      setPhase((p) => (p + dt * rate) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [walking, emote]);

  useEffect(() => {
    if (
      emote !== "wave" &&
      emote !== "dance" &&
      emote !== "laugh" &&
      emote !== "celebrate"
    ) {
      setEmotePhase(0);
      return;
    }
    let raf = 0;
    let last = 0;
    const tick = (ts: number) => {
      if (!last) last = ts;
      const dt = (ts - last) / 1000;
      last = ts;
      const rate =
        emote === "celebrate" ? 2.8 : emote === "laugh" ? 3.4 : emote === "wave" ? 2.4 : 3;
      setEmotePhase((p) => (p + dt * rate) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [emote]);

  useEffect(() => {
    if (!toolChopNonce || !heldToolImageUrl.trim()) {
      setChopDeg(0);
      return;
    }
    const started = performance.now();
    let raf = 0;
    const tick = (ts: number) => {
      const t = (ts - started) / CHOP_MS;
      if (t >= 1) {
        setChopDeg(0);
        return;
      }
      setChopDeg(explorationToolChopDeg(t));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [toolChopNonce, heldToolImageUrl]);

  const variant =
    hairStyle && isHairVariantKey(hairStyle.variantKey) ? hairStyle.variantKey : "short";

  const baseLoadout = avatarLoadout;
  const loadout = heldToolImageUrl.trim()
    ? {
        eyesVariant: baseLoadout?.eyesVariant ?? "round",
        mouthVariant: baseLoadout?.mouthVariant ?? "smile",
        eyesImageUrl: baseLoadout?.eyesImageUrl ?? "",
        mouthImageUrl: baseLoadout?.mouthImageUrl ?? "",
        cosmetics: [
          ...(baseLoadout?.cosmetics ?? []).filter((c) => c.slot !== "HAND"),
          {
            slot: "HAND" as const,
            variantKey: "custom",
            imageUrl: heldToolImageUrl.trim(),
            tintHex: "",
          },
        ],
      }
    : baseLoadout;

  return (
    <ArcadeExplorationAvatarFigure
      appearance={{ ...appearance, facingDeg }}
      hairVariant={variant}
      hairImageUrl={hairStyle?.imageUrl ?? ""}
      loadout={loadout}
      walking={walking}
      walkPhase={phase}
      toolChopDeg={chopDeg}
      heldToolImageSizePx={heldToolImageSizePx}
      heldToolPose={heldToolPose}
      heldToolFx={heldToolFx}
      heldHand={heldHand}
      heldLightImageUrl={heldLightImageUrl}
      heldLightImageSizePx={heldLightImageSizePx}
      heldLightPose={heldLightPose}
      heldLightFx={heldLightFx}
      heldLightHand={heldLightHand}
      emote={emote}
      emotePhase={emotePhase}
      bodySettings={bodySettings}
      waterVisual={waterVisual}
      size={size}
      className={className}
    />
  );
}
