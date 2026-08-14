"use client";
import {
  AvatarAnatomy,
  AvatarArmor,
  AvatarBottoms,
  AvatarBra,
  AvatarCape,
  AvatarEyes,
  AvatarFeet,
  AvatarHandItem,
  AvatarHeadwear,
  AvatarMouth,
  AvatarShoulders,
  pickGear,
} from "@/components/arcade/arcade-exploration-avatar-gear";
import type {
  ExplorationAvatarAppearance,
  ExplorationAvatarHairVariantKey,
  ExplorationAvatarLoadout,
} from "@/lib/game-exploration-avatar-shared";
import {
  DEFAULT_BODY_SETTINGS,
  isExplorationBodySex,
  resolveBodyDrawState,
  type ExplorationBodySettings,
} from "@/lib/game-exploration-body-shared";
import type {
  ExplorationToolHeldFacingKey,
  ExplorationToolHeldFx,
  ExplorationToolHeldHand,
  ExplorationToolHeldPose,
} from "@/lib/game-exploration-tools-shared";
import { snapFacingHeldKey } from "@/lib/game-exploration-tools-shared";
import type { ExplorationPawnEmote } from "@/lib/game-exploration-shared";

export type AvatarCardinal = "n" | "e" | "s" | "w";

type Props = {
  appearance: ExplorationAvatarAppearance;
  hairVariant: ExplorationAvatarHairVariantKey;
  /** Optional custom hair art (¾ / head overlay). */
  hairImageUrl?: string;
  loadout?: ExplorationAvatarLoadout | null;
  walkPhase?: number;
  walking?: boolean;
  /** Held-tool chop swing angle in degrees. */
  toolChopDeg?: number;
  /** Held gather-tool sprite width in avatar SVG units. */
  heldToolImageSizePx?: number;
  /** Held-tool pivot + per-facing rotate/offset. */
  heldToolPose?: ExplorationToolHeldPose | null;
  /** Glow / shimmer rarity FX. */
  heldToolFx?: ExplorationToolHeldFx | null;
  /** Left- or right-handed tool grip. */
  heldHand?: "left" | "right";
  /** Dual-wield light tool (opposite hand). */
  heldLightImageUrl?: string;
  heldLightImageSizePx?: number;
  heldLightPose?: ExplorationToolHeldPose | null;
  heldLightFx?: ExplorationToolHeldFx | null;
  heldLightHand?: "left" | "right";
  /** Active emote. */
  emote?: ExplorationPawnEmote | null;
  /** 0–1 loop phase for timed emotes. */
  emotePhase?: number;
  /** Admin body / undergarment defaults. */
  bodySettings?: ExplorationBodySettings;
  /** Wade-in submerged body tint overlay. */
  waterVisual?: {
    wade: number;
    tintHex: string;
    bodyOpacity: number;
    depthPct: number;
  } | null;
  className?: string;
  size?: number;
};

/** Snap continuous facing to a cardinal for ¾ RPG drawing. */
export function snapFacingCardinal(facingDeg: number): AvatarCardinal {
  const d = ((facingDeg % 360) + 360) % 360;
  if (d >= 315 || d < 45) return "n";
  if (d >= 45 && d < 135) return "e";
  if (d >= 135 && d < 225) return "s";
  return "w";
}

/** Soft-corner block (procedural — no raster art). */
function Block({
  x,
  y,
  w,
  h,
  fill,
  rx = 1.5,
  opacity,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  rx?: number;
  opacity?: number;
}) {
  return <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} opacity={opacity} />;
}

/**
 * Oblique (¾) avatar — blocky procedural silhouette (same placements as before).
 *
 * Facing: 0° = north (away), 180° = south (toward camera).
 */
export function ArcadeExplorationAvatarFigure({
  appearance,
  hairVariant,
  hairImageUrl = "",
  loadout = null,
  walkPhase = 0,
  walking = false,
  toolChopDeg = 0,
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
  emotePhase = 0,
  bodySettings = DEFAULT_BODY_SETTINGS,
  waterVisual = null,
  className = "",
  size = 64,
}: Props) {
  const facingDeg = appearance.facingDeg ?? (appearance.facing === 1 ? 0 : 180);
  const dir = snapFacingCardinal(facingDeg);
  const flipX = dir === "w";
  const drawDir: Exclude<AvatarCardinal, "w"> = dir === "w" ? "e" : dir;
  const heldFacingKey = snapFacingHeldKey(facingDeg);
  const sitting = emote === "sit";
  const dancing = emote === "dance";
  const laughing = emote === "laugh";
  const celebrating = emote === "celebrate";
  const effectiveWalking = walking && !sitting;
  const swing = effectiveWalking || dancing ? Math.sin(walkPhase * Math.PI * 2) : 0;
  const danceBoost = dancing ? 1.8 : celebrating ? 1.2 : 1;
  const bob =
    celebrating
      ? Math.abs(Math.sin(emotePhase * Math.PI * 2)) * 7
      : laughing
        ? Math.abs(Math.sin(emotePhase * Math.PI * 2)) * 2.2
        : effectiveWalking || dancing
          ? Math.abs(Math.sin(walkPhase * Math.PI * 2)) * (1.4 * danceBoost)
          : 0;
  const headLean =
    laughing
      ? Math.sin(emotePhase * Math.PI * 2) * 3
      : effectiveWalking && (drawDir === "n" || drawDir === "s")
        ? drawDir === "n"
          ? -2.2
          : 1.2
        : 0;
  const sitDrop = sitting ? 10 : 0;
  const waterWade = waterVisual?.wade ?? 0;
  const waterlineY =
    waterVisual && waterWade > 0
      ? 58 - (waterVisual.depthPct / 100) * waterWade * 16
      : 58;
  const skin = appearance.skinColorHex;
  const shirt = appearance.shirtColorHex;
  const pants = appearance.pantsColorHex;
  const hair = appearance.hairColorHex;
  const bodySex = isExplorationBodySex(appearance.bodySex) ? appearance.bodySex : "male";
  const heldLightGear = heldLightImageUrl.trim()
    ? { variantKey: "custom", imageUrl: heldLightImageUrl.trim(), tintHex: "" }
    : null;
  const bodyCommon = {
    skin,
    shirt,
    pants,
    bodySex,
    bodySettings,
    swing: swing * danceBoost,
    walking: effectiveWalking || dancing,
    headLean,
    hairVariant,
    hairColor: hair,
    hairImageUrl,
    loadout,
    toolChopDeg,
    heldToolImageSizePx,
    heldToolPose,
    heldToolFx,
    heldFacingKey,
    heldHand,
    heldLightGear,
    heldLightImageSizePx,
    heldLightPose,
    heldLightFx,
    heldLightHand,
    bodyMirrored: flipX,
    emote,
    emotePhase,
  } as const;

  const confetti =
    celebrating
      ? Array.from({ length: 10 }, (_, i) => {
          const t = (emotePhase + i * 0.1) % 1;
          const ang = (i / 10) * Math.PI * 2 + emotePhase * Math.PI * 2;
          const r = 10 + t * 22;
          const colors = ["#f59e0b", "#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#ec4899"];
          return {
            key: i,
            x: 32 + Math.cos(ang) * r,
            y: 28 + Math.sin(ang) * r * 0.7 - t * 8,
            fill: colors[i % colors.length]!,
            w: 2.2 + (i % 3) * 0.6,
            h: 3.2 + (i % 2),
            rot: ang * (180 / Math.PI),
          };
        })
      : [];

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 64 72"
        width={size}
        height={size}
        aria-hidden
        className="overflow-visible"
        style={{ transform: `translateY(${-bob + sitDrop}px)` }}
      >
        <g transform={flipX ? "translate(64,0) scale(-1,1)" : undefined}>
          <Block x={18} y={58} w={28} h={8} rx={2} fill="rgba(0,0,0,0.22)" />
          {drawDir === "s" ? <SouthBody {...bodyCommon} showFace /> : null}
          {drawDir === "n" ? <NorthBody {...bodyCommon} /> : null}
          {drawDir === "e" ? <EastBody {...bodyCommon} /> : null}
          {confetti.map((c) => (
            <rect
              key={c.key}
              x={c.x}
              y={c.y}
              width={c.w}
              height={c.h}
              fill={c.fill}
              transform={`rotate(${c.rot} ${c.x + c.w / 2} ${c.y + c.h / 2})`}
              opacity={0.9}
            />
          ))}
          {waterVisual && waterWade > 0 ? (
            <>
              <rect
                x={0}
                y={waterlineY}
                width={64}
                height={72 - waterlineY}
                fill={
                  waterVisual.bodyOpacity <= 0
                    ? "rgba(0,0,0,0.82)"
                    : waterVisual.tintHex
                }
                opacity={
                  waterVisual.bodyOpacity <= 0
                    ? 0.55 + 0.35 * waterWade
                    : (waterVisual.bodyOpacity / 100) * 0.72 * waterWade
                }
              />
              <line
                x1={10}
                y1={waterlineY}
                x2={54}
                y2={waterlineY}
                stroke={waterVisual.tintHex}
                strokeWidth={1.2}
                opacity={0.35 + 0.45 * waterWade}
              />
            </>
          ) : null}
        </g>
      </svg>
    </div>
  );
}

type BodyProps = {
  skin: string;
  shirt: string;
  pants: string;
  bodySex: import("@/lib/game-exploration-body-shared").ExplorationBodySex;
  bodySettings: ExplorationBodySettings;
  swing: number;
  walking: boolean;
  headLean: number;
  hairVariant: ExplorationAvatarHairVariantKey;
  hairColor: string;
  hairImageUrl: string;
  loadout: ExplorationAvatarLoadout | null;
  toolChopDeg?: number;
  heldToolImageSizePx?: number;
  heldToolPose?: ExplorationToolHeldPose | null;
  heldToolFx?: ExplorationToolHeldFx | null;
  heldFacingKey?: ExplorationToolHeldFacingKey;
  heldHand?: "left" | "right";
  heldLightGear?: { variantKey: string; imageUrl: string; tintHex: string } | null;
  heldLightImageSizePx?: number;
  heldLightPose?: ExplorationToolHeldPose | null;
  heldLightFx?: ExplorationToolHeldFx | null;
  heldLightHand?: "left" | "right";
  bodyMirrored?: boolean;
  showFace?: boolean;
  /** Active emote pose (wave / sit / dance / laugh / celebrate). */
  emote?: ExplorationPawnEmote | null;
  emotePhase?: number;
};

function SouthBody({
  skin,
  shirt,
  pants,
  bodySex,
  bodySettings,
  swing,
  walking,
  headLean,
  hairVariant,
  hairColor,
  hairImageUrl,
  loadout,
  toolChopDeg = 0,
  heldToolImageSizePx = 20,
  heldToolPose = null,
  heldToolFx = null,
  heldFacingKey = "south",
  heldHand = "right",
  heldLightGear = null,
  heldLightImageSizePx = 20,
  heldLightPose = null,
  heldLightFx = null,
  heldLightHand = "left",
  bodyMirrored = false,
  showFace = true,
  emote = null,
  emotePhase = 0,
}: BodyProps) {
  const sitting = emote === "sit";
  const waving = emote === "wave";
  const celebrating = emote === "celebrate";
  const laughing = emote === "laugh";
  /** Flip arm up 180°, then slight shoulder pivot (not a ground-level wiggle). */
  const waveRotate = waving
    ? 180 + Math.sin(emotePhase * Math.PI * 2) * 22
    : celebrating
      ? 180 + Math.sin(emotePhase * Math.PI * 2) * 12
      : 0;
  const celebrateL = celebrating ? 180 - Math.sin(emotePhase * Math.PI * 2) * 12 : 0;
  const legL = sitting ? 6 : walking ? swing * 3.2 : 0;
  const legR = sitting ? 6 : walking ? -swing * 3.2 : 0;
  let armL = walking ? -swing * 2.5 : 0;
  let armR = walking ? swing * 2.5 : 0;
  if (waving || celebrating) {
    armR = 0;
    if (celebrating) armL = 0;
  }
  if (laughing) {
    armL = 3;
    armR = 3;
  }
  if (sitting) {
    armL = 4;
    armR = 4;
  }
  const headY = 18 + headLean + (sitting ? 4 : 0);
  const torsoY = sitting ? 29 : 25;
  /** End torso above the hip line so base garments (underwear/pants) stay visible. */
  const torsoH = sitting ? 14 : 16;
  const cosmetics = loadout?.cosmetics ?? [];
  const cape = pickGear(cosmetics, "CAPE");
  const armor = pickGear(cosmetics, "ARMOR");
  const shoulders = pickGear(cosmetics, "SHOULDERS");
  const hat = pickGear(cosmetics, "HAT");
  const helmet = pickGear(cosmetics, "HELMET");
  const hand = pickGear(cosmetics, "HAND");
  const bottom = pickGear(cosmetics, "BOTTOM");
  const feet = pickGear(cosmetics, "FEET");
  const bodyDraw = resolveBodyDrawState({
    bodySex,
    bodySettings,
    hasArmor: Boolean(armor && armor.variantKey !== "none"),
    hasBottom: Boolean(bottom && bottom.variantKey !== "none"),
    pantsColorHex: pants,
    bottomGearStyle: bottom?.variantKey,
    bottomGearTint: bottom?.tintHex,
  });
  const torsoFill = bodyDraw.torsoSkin ? skin : shirt;
  const armFill = bodyDraw.bareArms ? skin : shirt;
  const eyesVariant = loadout?.eyesVariant ?? "round";
  const mouthVariant = laughing ? "open" : (loadout?.mouthVariant ?? "smile");
  const toolOnLeft = heldHand === "left";
  const lightOnLeft = heldLightHand === "left";
  const toolArmY = toolOnLeft ? 36 + armL * 0.2 : 36 + armR * 0.2;
  const lightArmY = lightOnLeft ? 36 + armL * 0.2 : 36 + armR * 0.2;
  const wavePivotX = 47;
  const wavePivotY = 30;
  const leftPivotX = 17;
  const leftPivotY = 30;
  const rightArm = (
    <g
      transform={
        waving || celebrating
          ? `translate(${wavePivotX} ${wavePivotY}) rotate(${waveRotate}) translate(${-wavePivotX} ${-wavePivotY})`
          : undefined
      }
    >
      <Block x={43} y={28 + armR * 0.15} w={8} h={14} rx={1.5} fill={armFill} />
      <Block x={44} y={40 + armR * 0.2} w={6} h={6} rx={1.2} fill={skin} />
    </g>
  );
  const leftArm = (
    <g
      transform={
        celebrating
          ? `translate(${leftPivotX} ${leftPivotY}) rotate(${celebrateL}) translate(${-leftPivotX} ${-leftPivotY})`
          : undefined
      }
    >
      <Block x={13} y={28 + armL * 0.15} w={8} h={14} rx={1.5} fill={armFill} />
      <Block x={14} y={40 + armL * 0.2} w={6} h={6} rx={1.2} fill={skin} />
    </g>
  );
  return (
    <g data-facing="s">
      <AvatarCape gear={cape} facing="s" />
      {!bodyDraw.bottomStyle ? (
        <>
          <rect x={22.5 + legL * 0.1} y={41} width="7" height="15" rx={1} fill={skin} />
          <rect x={34.5 + legR * 0.1} y={41} width="7" height="15" rx={1} fill={skin} />
        </>
      ) : null}
      <AvatarFeet gear={feet} />
      {/* Torso — shorter so garment waistbands aren't covered */}
      <Block x={20} y={torsoY} w={24} h={torsoH} rx={2} fill={torsoFill} />
      <Block x={24} y={torsoY + 3} w={16} h={Math.max(8, torsoH - 6)} rx={1.5} fill={torsoFill} opacity={0.88} />
      {bodyDraw.bottomStyle ? (
        <AvatarBottoms
          style={bodyDraw.bottomStyle}
          color={bodyDraw.bottomColor}
          skin={skin}
          legL={legL}
          legR={legR}
          facing="s"
          hideShoes={
            bodyDraw.bareFeet || Boolean(feet && feet.variantKey !== "none")
          }
        />
      ) : null}
      <AvatarAnatomy
        facing="s"
        skin={skin}
        showBreasts={bodyDraw.showBreasts}
        breastScale={bodySettings.female.breastScale}
        breastColorHex={bodySettings.female.breastColorHex}
        torsoY={torsoY}
      />
      {bodyDraw.showBra ? (
        <AvatarBra
          color={bodySettings.undergarmentColorHex}
          facing="s"
          torsoY={torsoY}
          breastScale={bodySettings.female.breastScale}
        />
      ) : null}
      <AvatarArmor gear={armor} />
      {/* Arms + tool (under hands) + hands on grip */}
      {leftArm}
      {rightArm}
      <AvatarHandItem
        gear={hand}
        armY={toolArmY}
        facing="s"
        chopDeg={toolChopDeg}
        imageSizePx={heldToolImageSizePx}
        heldPose={heldToolPose}
        heldFx={heldToolFx}
        heldFacingKey={heldFacingKey}
        bodyMirrored={bodyMirrored}
        heldHand={heldHand}
      />
      {heldLightGear ? (
        <AvatarHandItem
          gear={heldLightGear}
          armY={lightArmY}
          facing="s"
          chopDeg={0}
          imageSizePx={heldLightImageSizePx}
          heldPose={heldLightPose}
          heldFx={heldLightFx}
          heldFacingKey={heldFacingKey}
          bodyMirrored={bodyMirrored}
          heldHand={heldLightHand}
        />
      ) : null}
      <AvatarShoulders gear={shoulders} />
      {/* Neck + blocky head — head sits above torso so the neck reads clearly */}
      <Block x={29} y={headY + 9} w={6} h={7} rx={1} fill={skin} />
      <Block x={21} y={headY - 11} w={22} h={21} rx={2.5} fill={skin} />
      {showFace ? (
        <g data-slot="face">
          <AvatarEyes
            variant={eyesVariant}
            imageUrl={loadout?.eyesImageUrl}
            cx={32}
            cy={headY}
            facing="s"
          />
          <Block x={30} y={headY + 4} w={4} h={2.5} rx={0.8} fill="rgba(0,0,0,0.18)" />
          <AvatarMouth
            variant={mouthVariant}
            imageUrl={loadout?.mouthImageUrl}
            cx={32}
            cy={headY}
            facing="s"
          />
        </g>
      ) : null}
      <HairLayer
        variant={hairVariant}
        color={hairColor}
        imageUrl={hairImageUrl}
        cx={32}
        cy={headY}
        facing="s"
      />
      <HairBangs
        variant={hairVariant}
        color={hairColor}
        cx={32}
        cy={headY}
        enabled={!hairImageUrl}
      />
      <AvatarHeadwear hat={hat} helmet={helmet} headY={headY} />
    </g>
  );
}

function NorthBody({
  skin,
  shirt,
  pants,
  bodySex,
  bodySettings,
  swing,
  walking,
  headLean,
  hairVariant,
  hairColor,
  hairImageUrl,
  loadout,
  toolChopDeg = 0,
  heldToolImageSizePx = 20,
  heldToolPose = null,
  heldToolFx = null,
  heldFacingKey = "south",
  heldHand = "right",
  heldLightGear = null,
  heldLightImageSizePx = 20,
  heldLightPose = null,
  heldLightFx = null,
  heldLightHand = "left",
  bodyMirrored = false,
  emote = null,
  emotePhase = 0,
}: BodyProps) {
  const sitting = emote === "sit";
  const waving = emote === "wave";
  const celebrating = emote === "celebrate";
  const laughing = emote === "laugh";
  const waveRotate = waving
    ? 180 + Math.sin(emotePhase * Math.PI * 2) * 22
    : celebrating
      ? 180 + Math.sin(emotePhase * Math.PI * 2) * 12
      : 0;
  const celebrateL = celebrating ? 180 - Math.sin(emotePhase * Math.PI * 2) * 12 : 0;
  const legL = sitting ? 6 : walking ? swing * 3.2 : 0;
  const legR = sitting ? 6 : walking ? -swing * 3.2 : 0;
  let armL = walking ? -swing * 2.2 : 0;
  let armR = walking ? swing * 2.2 : 0;
  if (waving || celebrating) {
    armR = 0;
    if (celebrating) armL = 0;
  }
  if (laughing) {
    armL = 3;
    armR = 3;
  }
  if (sitting) {
    armL = 4;
    armR = 4;
  }
  const headY = 18 + headLean + (sitting ? 4 : 0);
  const torsoY = sitting ? 29 : 25;
  const torsoH = sitting ? 14 : 16;
  const cosmetics = loadout?.cosmetics ?? [];
  const cape = pickGear(cosmetics, "CAPE");
  const armor = pickGear(cosmetics, "ARMOR");
  const shoulders = pickGear(cosmetics, "SHOULDERS");
  const hat = pickGear(cosmetics, "HAT");
  const helmet = pickGear(cosmetics, "HELMET");
  const hand = pickGear(cosmetics, "HAND");
  const bottom = pickGear(cosmetics, "BOTTOM");
  const feet = pickGear(cosmetics, "FEET");
  const bodyDraw = resolveBodyDrawState({
    bodySex,
    bodySettings,
    hasArmor: Boolean(armor && armor.variantKey !== "none"),
    hasBottom: Boolean(bottom && bottom.variantKey !== "none"),
    pantsColorHex: pants,
    bottomGearStyle: bottom?.variantKey,
    bottomGearTint: bottom?.tintHex,
  });
  const torsoFill = bodyDraw.torsoSkin ? skin : shirt;
  const armFill = bodyDraw.bareArms ? skin : shirt;
  const toolOnLeft = heldHand === "left";
  const lightOnLeft = heldLightHand === "left";
  const toolArmY = toolOnLeft ? 35 + armL * 0.2 : 35 + armR * 0.2;
  const lightArmY = lightOnLeft ? 35 + armL * 0.2 : 35 + armR * 0.2;
  const wavePivotX = 47;
  const wavePivotY = 30;
  const leftPivotX = 17;
  const leftPivotY = 30;
  return (
    <g data-facing="n">
      <AvatarCape gear={cape} facing="n" />
      {!bodyDraw.bottomStyle ? (
        <>
          <rect x={22.5 + legL * 0.1} y={41} width="7" height="15" rx={1} fill={skin} />
          <rect x={34.5 + legR * 0.1} y={41} width="7" height="15" rx={1} fill={skin} />
        </>
      ) : null}
      <AvatarFeet gear={feet} />
      <Block x={20} y={torsoY} w={24} h={torsoH} rx={2} fill={torsoFill} />
      {bodyDraw.bottomStyle ? (
        <AvatarBottoms
          style={bodyDraw.bottomStyle}
          color={bodyDraw.bottomColor}
          skin={skin}
          legL={legL}
          legR={legR}
          facing="n"
          hideShoes={
            bodyDraw.bareFeet || Boolean(feet && feet.variantKey !== "none")
          }
        />
      ) : null}
      <AvatarAnatomy
        facing="n"
        skin={skin}
        showBreasts={bodyDraw.showBreasts}
        breastScale={bodySettings.female.breastScale}
        breastColorHex={bodySettings.female.breastColorHex}
        torsoY={torsoY}
      />
      {bodyDraw.showBra ? (
        <AvatarBra
          color={bodySettings.undergarmentColorHex}
          facing="n"
          torsoY={torsoY}
          breastScale={bodySettings.female.breastScale}
        />
      ) : null}
      <AvatarArmor gear={armor} />
      <g
        transform={
          celebrating
            ? `translate(${leftPivotX} ${leftPivotY}) rotate(${celebrateL}) translate(${-leftPivotX} ${-leftPivotY})`
            : undefined
        }
      >
        <Block x={13} y={28 + armL * 0.15} w={8} h={14} rx={1.5} fill={armFill} />
        <Block x={14} y={39 + armL * 0.2} w={6} h={6} rx={1.2} fill={skin} />
      </g>
      <g
        transform={
          waving || celebrating
            ? `translate(${wavePivotX} ${wavePivotY}) rotate(${waveRotate}) translate(${-wavePivotX} ${-wavePivotY})`
            : undefined
        }
      >
        <Block x={43} y={28 + armR * 0.15} w={8} h={14} rx={1.5} fill={armFill} />
        <Block x={44} y={39 + armR * 0.2} w={6} h={6} rx={1.2} fill={skin} />
      </g>
      <AvatarHandItem
        gear={hand}
        armY={toolArmY}
        facing="n"
        chopDeg={toolChopDeg}
        imageSizePx={heldToolImageSizePx}
        heldPose={heldToolPose}
        heldFx={heldToolFx}
        heldFacingKey={heldFacingKey}
        bodyMirrored={bodyMirrored}
        heldHand={heldHand}
      />
      {heldLightGear ? (
        <AvatarHandItem
          gear={heldLightGear}
          armY={lightArmY}
          facing="n"
          chopDeg={0}
          imageSizePx={heldLightImageSizePx}
          heldPose={heldLightPose}
          heldFx={heldLightFx}
          heldFacingKey={heldFacingKey}
          bodyMirrored={bodyMirrored}
          heldHand={heldLightHand}
        />
      ) : null}
      <AvatarShoulders gear={shoulders} />
      <Block x={29} y={headY + 9} w={6} h={7} rx={1} fill={skin} />
      <Block x={21} y={headY - 11} w={22} h={21} rx={2.5} fill={skin} />
      <HairLayer
        variant={hairVariant}
        color={hairColor}
        imageUrl={hairImageUrl}
        cx={32}
        cy={headY}
        facing="n"
      />
      <AvatarHeadwear hat={hat} helmet={helmet} headY={headY} />
    </g>
  );
}

function EastBody({
  skin,
  shirt,
  pants,
  bodySex,
  bodySettings,
  swing,
  walking,
  headLean,
  hairVariant,
  hairColor,
  hairImageUrl,
  loadout,
  toolChopDeg = 0,
  heldToolImageSizePx = 20,
  heldToolPose = null,
  heldToolFx = null,
  heldFacingKey = "south",
  heldHand = "right",
  heldLightGear = null,
  heldLightImageSizePx = 20,
  heldLightPose = null,
  heldLightFx = null,
  heldLightHand = "left",
  bodyMirrored = false,
  emote = null,
  emotePhase = 0,
}: BodyProps) {
  const sitting = emote === "sit";
  const waving = emote === "wave";
  const celebrating = emote === "celebrate";
  const laughing = emote === "laugh";
  const waveRotate = waving
    ? 180 + Math.sin(emotePhase * Math.PI * 2) * 22
    : celebrating
      ? 180 + Math.sin(emotePhase * Math.PI * 2) * 12
      : 0;
  const celebrateBack = celebrating ? 160 - Math.sin(emotePhase * Math.PI * 2) * 10 : 0;
  const stride = sitting ? 0 : walking ? swing * 3.5 : 0;
  let arm = walking ? -swing * 2.8 : 0;
  if (waving || celebrating) arm = 0;
  if (laughing) arm = 3;
  if (sitting) arm = 3;
  const headY = 18 + headLean * 0.4 + (sitting ? 4 : 0);
  const headX = 34;
  /** Side torso is narrower than the head for a clearer silhouette. */
  const torsoX = 26;
  const torsoW = 16;
  const torsoY = sitting ? 28 : 24;
  const torsoH = sitting ? 14 : 16;
  const toolArmY = 36 + arm * 0.2;
  const cosmetics = loadout?.cosmetics ?? [];
  const cape = pickGear(cosmetics, "CAPE");
  const armor = pickGear(cosmetics, "ARMOR");
  const shoulders = pickGear(cosmetics, "SHOULDERS");
  const hat = pickGear(cosmetics, "HAT");
  const helmet = pickGear(cosmetics, "HELMET");
  const hand = pickGear(cosmetics, "HAND");
  const bottom = pickGear(cosmetics, "BOTTOM");
  const feet = pickGear(cosmetics, "FEET");
  const bodyDraw = resolveBodyDrawState({
    bodySex,
    bodySettings,
    hasArmor: Boolean(armor && armor.variantKey !== "none"),
    hasBottom: Boolean(bottom && bottom.variantKey !== "none"),
    pantsColorHex: pants,
    bottomGearStyle: bottom?.variantKey,
    bottomGearTint: bottom?.tintHex,
  });
  const torsoFill = bodyDraw.torsoSkin ? skin : shirt;
  const armFill = bodyDraw.bareArms ? skin : shirt;
  const eyesVariant = loadout?.eyesVariant ?? "round";
  const mouthVariant = laughing ? "open" : (loadout?.mouthVariant ?? "smile");
  const wavePivotX = 42;
  const wavePivotY = 30;
  const backPivotX = 23;
  const backPivotY = 30;
  /**
   * Side view depth (east art; west is the same art flipped):
   * - Facing east: right-hand tools behind the body, left-hand tools in front.
   * - Facing west: left-hand tools behind the body, right-hand tools in front.
   * Front tools sit under a palm redrawn after the sprite.
   */
  const toolBehindBody = bodyMirrored ? heldHand === "left" : heldHand === "right";
  const lightBehindBody = bodyMirrored
    ? heldLightHand === "left"
    : heldLightHand === "right";
  const gripHand = (hand: "left" | "right") =>
    bodyMirrored ? (hand === "left" ? "right" : "left") : hand;
  const frontGrips = new Set<"left" | "right">();
  if (!toolBehindBody) frontGrips.add(gripHand(heldHand));
  if (heldLightGear && !lightBehindBody) frontGrips.add(gripHand(heldLightHand));
  const frontLeftPalm = frontGrips.has("left");
  const frontRightPalm = frontGrips.has("right");
  const nearArmTransform =
    waving || celebrating
      ? `translate(${wavePivotX} ${wavePivotY}) rotate(${waveRotate}) translate(${-wavePivotX} ${-wavePivotY})`
      : undefined;
  const mainToolProps = {
    gear: hand,
    armY: toolArmY,
    facing: "e" as const,
    chopDeg: toolChopDeg,
    imageSizePx: heldToolImageSizePx,
    heldPose: heldToolPose,
    heldFx: heldToolFx,
    heldFacingKey,
    bodyMirrored,
    heldHand,
  };
  const lightToolProps = heldLightGear
    ? {
        gear: heldLightGear,
        armY: toolArmY,
        facing: "e" as const,
        chopDeg: 0,
        imageSizePx: heldLightImageSizePx,
        heldPose: heldLightPose,
        heldFx: heldLightFx,
        heldFacingKey,
        bodyMirrored,
        heldHand: heldLightHand,
      }
    : null;
  return (
    <g data-facing="e">
      <AvatarCape gear={cape} facing="e" />
      {!bodyDraw.bottomStyle ? (
        <>
          <rect x={25 - stride} y={42} width="6" height="14" rx={1} fill={skin} opacity={0.95} />
          <rect x={33 + stride} y={42} width="6.2" height="14.5" rx={1} fill={skin} />
        </>
      ) : null}
      <AvatarFeet gear={feet} />
      {/* Keep behind+front instances mounted (opacity) so tool art doesn't remount on turn. */}
      <AvatarHandItem {...mainToolProps} opacity={toolBehindBody ? 1 : 0} />
      {lightToolProps ? (
        <AvatarHandItem {...lightToolProps} opacity={lightBehindBody ? 1 : 0} />
      ) : null}
      <Block x={torsoX} y={torsoY} w={torsoW} h={torsoH} rx={2} fill={torsoFill} />
      {bodyDraw.bottomStyle ? (
        <AvatarBottoms
          style={bodyDraw.bottomStyle}
          color={bodyDraw.bottomColor}
          skin={skin}
          stride={stride}
          facing="e"
          hideShoes={
            bodyDraw.bareFeet || Boolean(feet && feet.variantKey !== "none")
          }
        />
      ) : null}
      <AvatarAnatomy
        facing="e"
        skin={skin}
        showBreasts={bodyDraw.showBreasts}
        breastScale={bodySettings.female.breastScale}
        breastColorHex={bodySettings.female.breastColorHex}
        torsoY={torsoY}
      />
      {bodyDraw.showBra ? (
        <AvatarBra
          color={bodySettings.undergarmentColorHex}
          facing="e"
          torsoY={torsoY}
          breastScale={bodySettings.female.breastScale}
        />
      ) : null}
      <AvatarArmor gear={armor} />
      <g
        transform={
          celebrating
            ? `translate(${backPivotX} ${backPivotY}) rotate(${celebrateBack}) translate(${-backPivotX} ${-backPivotY})`
            : undefined
        }
      >
        <Block x={20} y={27 + arm * -0.1} w={7} h={13} rx={1.5} fill={armFill} opacity={0.85} />
        {!frontLeftPalm ? (
          <Block x={19} y={38 + arm * -0.1} w={5.5} h={5.5} rx={1.2} fill={skin} opacity={0.9} />
        ) : null}
      </g>
      <g transform={nearArmTransform}>
        <Block x={38} y={28 + arm * 0.15} w={8} h={14} rx={1.5} fill={armFill} />
        {!frontRightPalm ? (
          <Block x={41} y={40 + arm * 0.2} w={6} h={6} rx={1.2} fill={skin} />
        ) : null}
      </g>
      <AvatarHandItem {...mainToolProps} opacity={toolBehindBody ? 0 : 1} />
      {lightToolProps ? (
        <AvatarHandItem {...lightToolProps} opacity={lightBehindBody ? 0 : 1} />
      ) : null}
      {frontLeftPalm ? (
        <Block x={19} y={38 + arm * -0.1} w={5.5} h={5.5} rx={1.2} fill={skin} opacity={0.9} />
      ) : null}
      {frontRightPalm ? (
        <g transform={nearArmTransform}>
          <Block x={41} y={40 + arm * 0.2} w={6} h={6} rx={1.2} fill={skin} />
        </g>
      ) : null}
      <AvatarShoulders gear={shoulders} />
      <Block x={headX - 3} y={headY + 9} w={6} h={7} rx={1} fill={skin} />
      <Block x={headX - 10.5} y={headY - 10.5} w={21} h={20} rx={2.5} fill={skin} />
      <g data-slot="face">
        <AvatarEyes
          variant={eyesVariant}
          imageUrl={loadout?.eyesImageUrl}
          cx={headX}
          cy={headY}
          facing="e"
        />
        <Block x={headX + 2} y={headY + 2} w={3.5} h={2} rx={0.6} fill="rgba(0,0,0,0.16)" />
        <AvatarMouth
          variant={mouthVariant}
          imageUrl={loadout?.mouthImageUrl}
          cx={headX}
          cy={headY}
          facing="e"
        />
      </g>
      <HairLayer
        variant={hairVariant}
        color={hairColor}
        imageUrl={hairImageUrl}
        cx={headX}
        cy={headY}
        facing="e"
      />
      <AvatarHeadwear hat={hat} helmet={helmet} headY={headY} />
    </g>
  );
}

function HairLayer({
  variant,
  color,
  imageUrl,
  cx,
  cy,
  facing,
}: {
  variant: ExplorationAvatarHairVariantKey;
  color: string;
  imageUrl: string;
  cx: number;
  cy: number;
  facing: "n" | "e" | "s";
}) {
  if (imageUrl) {
    const transform =
      facing === "n"
        ? `rotate(180 ${cx} ${cy})`
        : facing === "e"
          ? `rotate(-18 ${cx} ${cy}) translate(2, -2)`
          : `translate(0, -5)`;
    return (
      <g data-slot="hair" transform={transform}>
        <image
          href={imageUrl}
          x={cx - 14}
          y={cy - 14}
          width="28"
          height="28"
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    );
  }
  if (variant === "bald") return <g data-slot="hair" />;
  return (
    <g data-slot="hair">
      {facing === "s" ? <HairSouth variant={variant} color={color} cx={cx} cy={cy} /> : null}
      {facing === "n" ? <HairNorth variant={variant} color={color} cx={cx} cy={cy} /> : null}
      {facing === "e" ? <HairEast variant={variant} color={color} cx={cx} cy={cy} /> : null}
    </g>
  );
}

function HairBangs({
  variant,
  color,
  cx,
  cy,
  enabled,
}: {
  variant: ExplorationAvatarHairVariantKey;
  color: string;
  cx: number;
  cy: number;
  enabled: boolean;
}) {
  if (!enabled || variant === "bald" || variant === "spiky" || variant === "bun") return null;
  // Thin fringe only — sits on the forehead, not a second helmet.
  if (variant === "pixie") {
    return <Block x={cx - 7} y={cy - 9} w={14} h={2.5} rx={0.8} fill={color} />;
  }
  if (variant === "twin_tails") {
    return <Block x={cx - 8.5} y={cy - 9.5} w={17} h={3.2} rx={0.8} fill={color} />;
  }
  return <Block x={cx - 8} y={cy - 9.5} w={16} h={3} rx={0.8} fill={color} />;
}

function HairSouth({
  variant,
  color,
  cx,
  cy,
}: {
  variant: ExplorationAvatarHairVariantKey;
  color: string;
  cx: number;
  cy: number;
}) {
  // Cap hugs the crown; sides tuck against the head (no floating “ear muffs”).
  if (variant === "short") {
    return (
      <>
        <Block x={cx - 11} y={cy - 12} w={22} h={9} rx={2} fill={color} />
        <Block x={cx - 12} y={cy - 6} w={5} h={8} rx={1.2} fill={color} />
        <Block x={cx + 7} y={cy - 6} w={5} h={8} rx={1.2} fill={color} />
      </>
    );
  }
  if (variant === "pixie") {
    return (
      <>
        <Block x={cx - 10.5} y={cy - 12} w={21} h={8} rx={2} fill={color} />
        <Block x={cx - 11.5} y={cy - 6} w={4.5} h={6} rx={1} fill={color} />
        <Block x={cx + 7} y={cy - 6} w={4.5} h={6} rx={1} fill={color} />
        <Block x={cx - 4} y={cy - 5} w={8} h={3} rx={1} fill={color} opacity={0.85} />
      </>
    );
  }
  if (variant === "bob") {
    return (
      <>
        <Block x={cx - 11.5} y={cy - 12} w={23} h={10} rx={2} fill={color} />
        <Block x={cx - 13} y={cy - 4} w={7} h={10} rx={2} fill={color} />
        <Block x={cx + 6} y={cy - 4} w={7} h={10} rx={2} fill={color} />
        <Block x={cx - 8.5} y={cy - 9.5} w={17} h={3.2} rx={0.8} fill={color} />
      </>
    );
  }
  if (variant === "medium") {
    return (
      <>
        <Block x={cx - 11} y={cy - 12} w={22} h={9} rx={2} fill={color} />
        <Block x={cx - 13} y={cy - 5} w={6} h={14} rx={1.5} fill={color} />
        <Block x={cx + 7} y={cy - 5} w={6} h={14} rx={1.5} fill={color} />
      </>
    );
  }
  if (variant === "long") {
    return (
      <>
        <Block x={cx - 11} y={cy - 12} w={22} h={9} rx={2} fill={color} />
        <Block x={cx - 13.5} y={cy - 5} w={7} h={22} rx={1.5} fill={color} />
        <Block x={cx + 6.5} y={cy - 5} w={7} h={22} rx={1.5} fill={color} />
      </>
    );
  }
  if (variant === "long_wavy") {
    return (
      <>
        <Block x={cx - 11} y={cy - 12} w={22} h={9} rx={2} fill={color} />
        <Block x={cx - 14} y={cy - 5} w={7.5} h={18} rx={2} fill={color} />
        <Block x={cx + 6.5} y={cy - 5} w={7.5} h={18} rx={2} fill={color} />
        <Block x={cx - 15} y={cy + 10} w={8} h={8} rx={2.5} fill={color} />
        <Block x={cx + 7} y={cy + 10} w={8} h={8} rx={2.5} fill={color} />
        <Block x={cx - 13} y={cy + 16} w={6} h={6} rx={2} fill={color} opacity={0.92} />
        <Block x={cx + 7} y={cy + 16} w={6} h={6} rx={2} fill={color} opacity={0.92} />
      </>
    );
  }
  if (variant === "ponytail") {
    return (
      <>
        <Block x={cx - 10.5} y={cy - 12} w={21} h={9} rx={2} fill={color} />
        <Block x={cx - 12} y={cy - 6} w={5} h={8} rx={1.2} fill={color} />
        <Block x={cx + 7} y={cy - 6} w={5} h={8} rx={1.2} fill={color} />
        <Block x={cx - 3} y={cy - 22} w={6} h={12} rx={2} fill={color} />
      </>
    );
  }
  if (variant === "twin_tails") {
    return (
      <>
        <Block x={cx - 11} y={cy - 12} w={22} h={9} rx={2} fill={color} />
        <Block x={cx - 12} y={cy - 6} w={5} h={7} rx={1.2} fill={color} />
        <Block x={cx + 7} y={cy - 6} w={5} h={7} rx={1.2} fill={color} />
        <Block x={cx - 16} y={cy - 2} w={6} h={16} rx={2} fill={color} />
        <Block x={cx + 10} y={cy - 2} w={6} h={16} rx={2} fill={color} />
        <Block x={cx - 17} y={cy + 12} w={7} h={5} rx={2} fill={color} />
        <Block x={cx + 10} y={cy + 12} w={7} h={5} rx={2} fill={color} />
      </>
    );
  }
  if (variant === "braid") {
    return (
      <>
        <Block x={cx - 11} y={cy - 12} w={22} h={9} rx={2} fill={color} />
        <Block x={cx - 12} y={cy - 6} w={5} h={8} rx={1.2} fill={color} />
        <Block x={cx + 7} y={cy - 6} w={5} h={8} rx={1.2} fill={color} />
        {/* Braid hangs behind — hint over near shoulder, not in front of face. */}
        <Block x={cx - 14} y={cy + 1} w={5} h={14} rx={1.5} fill={color} opacity={0.92} />
        <Block x={cx - 13.5} y={cy + 13} w={4} h={6} rx={1.5} fill={color} opacity={0.88} />
      </>
    );
  }
  if (variant === "bun") {
    return (
      <>
        <Block x={cx - 10.5} y={cy - 12} w={21} h={9} rx={2} fill={color} />
        <Block x={cx - 5} y={cy - 18} w={10} h={8} rx={2.5} fill={color} />
      </>
    );
  }
  // Spiky — solid crown with connected triangular points (no orbiting cubes).
  return (
    <>
      <Block x={cx - 10.5} y={cy - 11} w={21} h={8} rx={1.5} fill={color} />
      <path
        d={`M ${cx - 10} ${cy - 11}
           L ${cx - 7} ${cy - 19}
           L ${cx - 3} ${cy - 11}
           L ${cx} ${cy - 21}
           L ${cx + 3} ${cy - 11}
           L ${cx + 7} ${cy - 18}
           L ${cx + 10} ${cy - 11} Z`}
        fill={color}
      />
      <Block x={cx - 12} y={cy - 6} w={4} h={7} rx={0.8} fill={color} />
      <Block x={cx + 8} y={cy - 6} w={4} h={7} rx={0.8} fill={color} />
    </>
  );
}

function HairNorth({
  variant,
  color,
  cx,
  cy,
}: {
  variant: ExplorationAvatarHairVariantKey;
  color: string;
  cx: number;
  cy: number;
}) {
  if (variant === "short" || variant === "pixie") {
    return <Block x={cx - 11} y={cy - 11} w={22} h={variant === "pixie" ? 14 : 16} rx={2} fill={color} />;
  }
  if (variant === "bob") {
    return (
      <>
        <Block x={cx - 12} y={cy - 11} w={24} h={16} rx={2} fill={color} />
        <Block x={cx - 12.5} y={cy + 2} w={25} h={10} rx={2} fill={color} />
      </>
    );
  }
  if (variant === "medium") {
    return (
      <>
        <Block x={cx - 11.5} y={cy - 11} w={23} h={16} rx={2} fill={color} />
        <Block x={cx - 11} y={cy + 2} w={22} h={12} rx={2} fill={color} />
      </>
    );
  }
  if (variant === "long" || variant === "long_wavy") {
    return (
      <>
        <Block x={cx - 11.5} y={cy - 11} w={23} h={16} rx={2} fill={color} />
        <Block
          x={cx - 12}
          y={cy + 2}
          w={24}
          h={variant === "long_wavy" ? 22 : 20}
          rx={2}
          fill={color}
        />
        {variant === "long_wavy" ? (
          <>
            <Block x={cx - 13} y={cy + 18} w={10} h={6} rx={2} fill={color} />
            <Block x={cx + 3} y={cy + 18} w={10} h={6} rx={2} fill={color} />
          </>
        ) : null}
      </>
    );
  }
  if (variant === "ponytail") {
    return (
      <>
        <Block x={cx - 11} y={cy - 11} w={22} h={15} rx={2} fill={color} />
        <Block x={cx - 3.5} y={cy + 4} w={7} h={16} rx={2} fill={color} />
      </>
    );
  }
  if (variant === "twin_tails") {
    return (
      <>
        <Block x={cx - 11} y={cy - 11} w={22} h={15} rx={2} fill={color} />
        <Block x={cx - 14} y={cy + 2} w={6} h={16} rx={2} fill={color} />
        <Block x={cx + 8} y={cy + 2} w={6} h={16} rx={2} fill={color} />
      </>
    );
  }
  if (variant === "braid") {
    return (
      <>
        <Block x={cx - 11} y={cy - 11} w={22} h={15} rx={2} fill={color} />
        <Block x={cx - 3} y={cy + 3} w={6} h={18} rx={1.5} fill={color} />
      </>
    );
  }
  if (variant === "bun") {
    return (
      <>
        <Block x={cx - 11} y={cy - 11} w={22} h={15} rx={2} fill={color} />
        <Block x={cx - 5} y={cy - 17} w={10} h={8} rx={2.5} fill={color} />
      </>
    );
  }
  return (
    <>
      <Block x={cx - 11} y={cy - 10} w={22} h={15} rx={1.5} fill={color} />
      <path
        d={`M ${cx - 10} ${cy - 10}
           L ${cx - 6} ${cy - 18}
           L ${cx - 2} ${cy - 10}
           L ${cx + 1} ${cy - 20}
           L ${cx + 4} ${cy - 10}
           L ${cx + 8} ${cy - 17}
           L ${cx + 10} ${cy - 10} Z`}
        fill={color}
      />
    </>
  );
}

function HairEast({
  variant,
  color,
  cx,
  cy,
}: {
  variant: ExplorationAvatarHairVariantKey;
  color: string;
  cx: number;
  cy: number;
}) {
  if (variant === "short") {
    return (
      <>
        <Block x={cx - 12} y={cy - 11} w={20} h={11} rx={2} fill={color} />
        <Block x={cx - 13} y={cy - 4} w={7} h={10} rx={1.2} fill={color} />
        <Block x={cx + 3} y={cy - 9} w={6} h={5} rx={1} fill={color} />
      </>
    );
  }
  if (variant === "pixie") {
    return (
      <>
        <Block x={cx - 11.5} y={cy - 11} w={19} h={10} rx={2} fill={color} />
        <Block x={cx - 12} y={cy - 4} w={6} h={7} rx={1} fill={color} />
        <Block x={cx + 3} y={cy - 9} w={5.5} h={4} rx={1} fill={color} />
      </>
    );
  }
  if (variant === "bob") {
    return (
      <>
        <Block x={cx - 12} y={cy - 11} w={20} h={11} rx={2} fill={color} />
        <Block x={cx - 14} y={cy - 3} w={9} h={12} rx={2} fill={color} />
        <Block x={cx + 3} y={cy - 9} w={7} h={5} rx={1} fill={color} />
      </>
    );
  }
  if (variant === "medium") {
    return (
      <>
        <Block x={cx - 12} y={cy - 11} w={20} h={11} rx={2} fill={color} />
        <Block x={cx - 14} y={cy - 3} w={8} h={14} rx={1.5} fill={color} />
        <Block x={cx + 3} y={cy - 9} w={7} h={5} rx={1} fill={color} />
      </>
    );
  }
  if (variant === "long") {
    return (
      <>
        <Block x={cx - 12} y={cy - 11} w={20} h={11} rx={2} fill={color} />
        <Block x={cx - 15} y={cy - 3} w={9} h={20} rx={1.5} fill={color} />
        <Block x={cx + 2} y={cy - 2} w={6} h={12} rx={1.2} fill={color} opacity={0.9} />
        <Block x={cx + 3} y={cy - 9} w={7} h={5} rx={1} fill={color} />
      </>
    );
  }
  if (variant === "long_wavy") {
    return (
      <>
        <Block x={cx - 12} y={cy - 11} w={20} h={11} rx={2} fill={color} />
        <Block x={cx - 15} y={cy - 3} w={9} h={16} rx={2} fill={color} />
        <Block x={cx - 16} y={cy + 10} w={10} h={8} rx={2.5} fill={color} />
        <Block x={cx - 14} y={cy + 16} w={7} h={6} rx={2} fill={color} />
        <Block x={cx + 2} y={cy - 2} w={6} h={10} rx={1.5} fill={color} opacity={0.9} />
        <Block x={cx + 3} y={cy - 9} w={7} h={5} rx={1} fill={color} />
      </>
    );
  }
  if (variant === "ponytail") {
    return (
      <>
        <Block x={cx - 11} y={cy - 11} w={19} h={11} rx={2} fill={color} />
        <Block x={cx + 2} y={cy - 9} w={6} h={5} rx={1} fill={color} />
        <Block x={cx - 17} y={cy - 2} w={8} h={14} rx={2} fill={color} />
      </>
    );
  }
  if (variant === "twin_tails") {
    return (
      <>
        <Block x={cx - 11} y={cy - 11} w={19} h={11} rx={2} fill={color} />
        <Block x={cx + 2} y={cy - 9} w={6} h={5} rx={1} fill={color} />
        {/* Single tail over the near ear (east = left side of head). */}
        <Block x={cx - 15} y={cy - 4} w={6} h={15} rx={2} fill={color} />
        <Block x={cx - 14.5} y={cy + 9} w={5} h={5} rx={2} fill={color} />
      </>
    );
  }
  if (variant === "braid") {
    return (
      <>
        <Block x={cx - 11} y={cy - 11} w={19} h={11} rx={2} fill={color} />
        <Block x={cx + 2} y={cy - 9} w={6} h={5} rx={1} fill={color} />
        <Block x={cx - 15} y={cy + 1} w={5} h={16} rx={1.5} fill={color} />
      </>
    );
  }
  if (variant === "bun") {
    return (
      <>
        <Block x={cx - 11} y={cy - 11} w={19} h={11} rx={2} fill={color} />
        <Block x={cx - 10} y={cy - 17} w={10} h={8} rx={2.5} fill={color} />
      </>
    );
  }
  return (
    <>
      <Block x={cx - 11} y={cy - 10} w={19} h={10} rx={1.5} fill={color} />
      <path
        d={`M ${cx - 10} ${cy - 10}
           L ${cx - 8} ${cy - 17}
           L ${cx - 4} ${cy - 10}
           L ${cx} ${cy - 19}
           L ${cx + 3} ${cy - 10}
           L ${cx + 7} ${cy - 16}
           L ${cx + 9} ${cy - 10} Z`}
        fill={color}
      />
      <Block x={cx - 13} y={cy - 4} w={5} h={8} rx={0.8} fill={color} />
    </>
  );
}
