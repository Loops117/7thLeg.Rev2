"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArcadeExplorationAvatarPawn } from "@/components/arcade/arcade-exploration-avatar-pawn";
import { ArcadeExplorationCompanionFigure } from "@/components/arcade/arcade-exploration-companion-figure";
import { ArcadeExplorationNameplate } from "@/components/arcade/arcade-exploration-nameplate";
import { ArcadeExplorationSpeechBubble } from "@/components/arcade/arcade-exploration-speech-bubble";
import { ArcadeExplorationZoneBackground } from "@/components/arcade/arcade-exploration-zone-background";
import {
  createFootstepTrail,
  createIdleWander,
  pushFootstep,
  stepIdleWander,
  trailFollowTarget,
  lerpVec,
  type FootstepTrail,
  type IdleWanderState,
} from "@/lib/game-exploration-companion-trail";
import type { ExplorationCompanionView } from "@/lib/game-exploration-companions-shared";
import type { ExplorationToolHeldFx, ExplorationToolHeldPose } from "@/lib/game-exploration-tools-shared";
import {
  resolveRideableCompanion,
  SIM_PLAYER_CAT_COMPANION,
} from "@/lib/game-exploration-companions-shared";
import {
  cameraTranslate,
  clamp,
  clampToWorld,
  keysToSteer,
  normalizeVec,
  spawnWorldPosition,
  stagePointToWorld,
  stepMovement,
  type BlockerRect,
  type MovementState,
  type Vec2,
  type WorldBounds,
  vecLength,
} from "@/lib/game-exploration-movement";
import {
  facingDegFromDirection,
  type ExplorationAvatarAppearance,
  type ExplorationAvatarCatalogView,
  type ExplorationAvatarHairStyleView,
} from "@/lib/game-exploration-avatar-shared";
import { snapFacingCardinal } from "@/components/arcade/arcade-exploration-avatar-figure";
import {
  CHARACTER_COLLISION_RADIUS_DEFAULT_PX,
  DEFAULT_NAMEPLATE_NPC,
  DEFAULT_NAMEPLATE_PLAYER,
  DEFAULT_SPEECH_BUBBLE_CONFIG,
  DEFAULT_STAMINA_SETTINGS,
  DEFAULT_WEIGHT_SETTINGS,
  EXPLORATION_FEET_COLLISION_OFFSET_Y_PX,
  isRunBlockedByWeight,
  resolveCharacterCollision,
  resolveWeightSpeedMult,
  type ExplorationCharacterCollisionMode,
  type ExplorationNameplateStyle,
  type ExplorationSpeechBubbleConfig,
  type ExplorationStaminaSettings,
  type ExplorationWeightSettings,
} from "@/lib/game-exploration-settings-shared";
import {
  elementRectToWorldPx,
  explorationDepthZ,
  EXPLORATION_OVERHEAD_LAYER_Z,
  pointInElementRect,
  zoneHasOverheadLayer,
  zoneUsesMapTiles,
  type ExplorationZoneElementView,
  type ExplorationZoneView,
} from "@/lib/game-exploration-shared";
import { homeDoorSpawnWorld } from "@/lib/game-exploration-housing-geom";

const STEER_THRESHOLD_PX = 10;
/** Max gap between clicks to count as double-click activate. */
const DOUBLE_CLICK_MS = 350;
/** Green selection ring under targeted characters. */
const SELECT_RING_W = 76;
const SELECT_RING_H = 30;

/** Click-to-target kinds (creatures reserved for future combat). */
type ExplorationTargetKind = "peer" | "simPlayer" | "npc" | "companion" | "creature";

type ExplorationSelection = {
  kind: ExplorationTargetKind;
  id: string;
};

function selectionKey(sel: ExplorationSelection): string {
  return `${sel.kind}:${sel.id}`;
}
/** On-screen avatar size in world pixels (1:1 with the map). */
const AVATAR_DISPLAY_SIZE_PX = 120;
/** Rider stays full size on mounts; slight inset seats them in the saddle. */
const MOUNTED_RIDER_SIZE_PX = AVATAR_DISPLAY_SIZE_PX;
const MOUNTED_RIDER_BOTTOM_PX = 20;
/** How close (world px) to an interactable center counts as "arrived". */
const INTERACT_ARRIVE_PX = 28;
/** How quickly remote peers catch up to network targets. */
const REMOTE_PEER_LERP = 11;
const REMOTE_FOLLOWER_LERP = 7;

function homeInteractWorld(
  el: Pick<
    ExplorationZoneElementView,
    "leftPct" | "topPct" | "widthPct" | "heightPct" | "rotateDeg" | "kind"
  >,
  worldWidthPx: number,
  worldHeightPx: number,
): Vec2 {
  if (el.kind === "HOME") return homeDoorSpawnWorld(el, worldWidthPx, worldHeightPx);
  return elementCenterWorld(el, worldWidthPx, worldHeightPx);
}

function nearInteractPoint(
  pos: Vec2,
  el: Pick<
    ExplorationZoneElementView,
    "leftPct" | "topPct" | "widthPct" | "heightPct" | "rotateDeg" | "kind"
  >,
  worldWidthPx: number,
  worldHeightPx: number,
  arrivePx = INTERACT_ARRIVE_PX,
): boolean {
  const p = homeInteractWorld(el, worldWidthPx, worldHeightPx);
  return Math.hypot(pos.x - p.x, pos.y - p.y) <= arrivePx;
}

function isTypingElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

type PeerSmoothState = {
  id: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  fx: number;
  fy: number;
  facingDeg: number;
  walking: boolean;
};

function elementCenterWorld(
  el: Pick<ExplorationZoneElementView, "leftPct" | "topPct" | "widthPct" | "heightPct">,
  worldWidthPx: number,
  worldHeightPx: number,
): Vec2 {
  const r = elementRectToWorldPx(el, worldWidthPx, worldHeightPx);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

function nearElementCenter(
  pos: Vec2,
  el: Pick<ExplorationZoneElementView, "leftPct" | "topPct" | "widthPct" | "heightPct">,
  worldWidthPx: number,
  worldHeightPx: number,
  arrivePx = INTERACT_ARRIVE_PX,
): boolean {
  const c = elementCenterWorld(el, worldWidthPx, worldHeightPx);
  return Math.hypot(pos.x - c.x, pos.y - c.y) <= arrivePx;
}

type Props = {
  zone: ExplorationZoneView;
  className?: string;
  /** Full / Low — half-res map art + higher move dt under load. */
  graphicsQuality?: "full" | "low";
  /** Show blocker outlines (admin playtest debug). Default false. */
  showBlockers?: boolean;
  /** Fired when player arrives at a teleporter after walking to it. */
  onTeleporterActivate?: (element: ExplorationZoneElementView) => void;
  /** Fired when player arrives at a Stable after walking to it. */
  onStableActivate?: (element: ExplorationZoneElementView) => void;
  /** Fired when player arrives at an item Store after walking to it. */
  onStoreActivate?: (element: ExplorationZoneElementView) => void;
  /** Fired when player arrives at a House after walking to the door. */
  onHomeActivate?: (element: ExplorationZoneElementView) => void;
  /** Fired when player arrives at a Sign. */
  onSignActivate?: (element: ExplorationZoneElementView) => void;
  /** Optional spawn (e.g. owned home door). */
  spawnOverride?: Vec2 | null;
  /**
   * Logout leftovers in this zone (other guests who left).
   * Hover / title shows displayName.
   */
  logoutMarkers?: Array<{
    id: string;
    displayName: string;
    x: number;
    y: number;
  }>;
  /** Admin-configured leftover image (empty = placeholder). */
  logoutMarkerImageUrl?: string;
  /** Square display size for leftover marker image (px). */
  logoutMarkerImageSizePx?: number;
  /** Throttled world-pixel position for minimap / full map. */
  onPositionChange?: (pos: Vec2) => void;
  /** Throttled local pose for co-op presence (position + facing + walk). */
  onPoseChange?: (pose: {
    x: number;
    y: number;
    facingDeg: number;
    walking: boolean;
    mounted?: boolean;
  }) => void;
  /** Layered ¾ avatar (playtest / in-game). */
  avatarAppearance?: ExplorationAvatarAppearance | null;
  avatarHairStyle?: ExplorationAvatarHairStyleView | null;
  avatarCatalog?: ExplorationAvatarCatalogView | null;
  /** Display name for the local player nametag. */
  localPlayerName?: string;
  /** Live co-op peers (same zone). Rendered in world space. */
  remotePeers?: ExplorationRemotePeer[];
  /** Fired when local player clicks / arrives at a remote co-op peer. */
  onRemotePeerActivate?: (peer: ExplorationRemotePeer) => void;
  /**
   * Fired when the green selection ring targets a peer/sim (or clears).
   * Used so Trade / Trace actions see the same selection as the ring.
   */
  onSocialTargetSelect?: (
    target: { kind: "peer"; id: string; name: string } | { kind: "sim"; name: string } | null,
  ) => void;
  /** Throttled sim player world position (minimap dots). */
  onSimPositionChange?: (pos: Vec2 | null) => void;
  /** Throttled NPC world position (minimap dots). */
  onNpcPositionChange?: (pos: Vec2 | null) => void;
  /** Playtest: spawn a wandering simulated peer in world space. */
  simulateOtherPlayer?: boolean;
  simAppearance?: ExplorationAvatarAppearance | null;
  simHairStyle?: ExplorationAvatarHairStyleView | null;
  /** Display name above the simulated player (player-style nameplate). */
  simPlayerName?: string;
  /** Zone-chat speech bubble above local player (cleared by parent after ~5s). */
  localSpeech?: string | null;
  /** Zone-chat speech bubble above sim player. */
  simSpeech?: string | null;
  /** Playtest: spawn a wandering simulated NPC. */
  simulateNpc?: boolean;
  npcAppearance?: ExplorationAvatarAppearance | null;
  npcHairStyle?: ExplorationAvatarHairStyleView | null;
  /** Display name above the simulated NPC (NPC-style nameplate). */
  npcName?: string;
  /** Resolved cosmetics so admin-picked ARMOR/BOTTOM/etc. actually draw. */
  npcAvatarLoadout?: import("@/lib/game-exploration-avatar-shared").ExplorationAvatarLoadout | null;
  /** When false, NPC stands still at npcIdleFacingDeg. */
  npcWanderEnabled?: boolean;
  /** Max wander radius in world px from spawn home. */
  npcWanderDistancePx?: number;
  /** Resting / non-wander facing (0 = north). */
  npcIdleFacingDeg?: number;
  /** Fired when local player arrives at / clicks the sim player. */
  onSimPlayerActivate?: () => void;
  /** Pause wander + keep facing local player while the sim menu is open. */
  simInteractOpen?: boolean;
  /** Fired when local player arrives at / clicks the NPC pawn. */
  onNpcActivate?: () => void;
  /** Fired when player arrives at / clicks an NPC map ping. */
  onNpcPinActivate?: (element: ExplorationZoneElementView) => void;
  /** Pause NPC wander while the NPC menu is open. */
  npcInteractOpen?: boolean;
  /** Game zoom limits (1 = default). */
  zoomMin?: number;
  zoomMax?: number;
  /** Walk collision radius (feet mode). */
  characterCollisionRadiusPx?: number;
  /** Feet / body collision mode. */
  characterCollisionMode?: ExplorationCharacterCollisionMode;
  /** Trail follower (dog, cat, wagon, …). Hidden while riding the same creature. */
  followerCompanion?: ExplorationCompanionView | null;
  /** Rideable mount (horse, wolf, …). If null, a rideable follower is used for R. */
  mountCompanion?: ExplorationCompanionView | null;
  mounted?: boolean;
  onMountedChange?: (mounted: boolean) => void;
  /** Stamina + run (Shift). */
  staminaSettings?: ExplorationStaminaSettings;
  /** Hydration drain + empty penalties. */
  hydrationSettings?: import("@/lib/game-exploration-settings-shared").ExplorationHydrationSettings;
  /** Body sex anatomy + default undergarments. */
  bodySettings?: import("@/lib/game-exploration-body-shared").ExplorationBodySettings;
  /** Current hydration max (from leveled points × 10). */
  hydrationMax?: number;
  /** Region override drain rate (pts/sec) when standing in a REGION with dehydrationRatePerSec. */
  regionDehydrationRatePerSec?: number | null;
  /** Carry weight curve (load % → speed). */
  weightSettings?: ExplorationWeightSettings;
  /** Current load as % of max carry weight (0 = no penalty until weight system wired). */
  weightLoadPct?: number;
  /** Throttled stamina for HUD (0–max). */
  onStaminaChange?: (stamina: number, max: number, running: boolean) => void;
  /** Throttled hydration for HUD (0–max). */
  onHydrationChange?: (hydration: number, max: number) => void;
  /** Fired when local player arrives at / clicks a FOUNTAIN. */
  onFountainActivate?: (element: ExplorationZoneElementView) => void;
  /** When nonce bumps, add `amount` to current hydration (sips). */
  hydrationInject?: { amount: number; nonce: number } | null;
  /** Read-only facing for flashlight cone (degrees). */
  onFacingChange?: (facingDeg: number) => void;
  /** Fired when local player clicks / arrives at their follower companion. */
  onCompanionActivate?: () => void;
  /** Playtest: give the simulated player a trailing cat. */
  simFollowerCompanion?: ExplorationCompanionView | null;
  /** Zone speech bubble look. */
  speechBubbleStyle?: ExplorationSpeechBubbleConfig;
  nameplatePlayerStyle?: ExplorationNameplateStyle;
  nameplateNpcStyle?: ExplorationNameplateStyle;
  /** Gather layer rendered inside world transform. */
  worldOverlay?: ReactNode;
  /** Night darkness + light cutouts (must live inside world transform). */
  nightFilter?: ReactNode;
  /** Equipped tool art for local player hand. */
  heldToolImageUrl?: string;
  /** Held gather-tool sprite width in avatar SVG units. */
  heldToolImageSizePx?: number;
  /** Held-tool pivot + per-facing rotate/offset. */
  heldToolPose?: ExplorationToolHeldPose | null;
  /** Glow / shimmer rarity FX. */
  heldToolFx?: ExplorationToolHeldFx | null;
  /** Dual-wield light tool (opposite hand). */
  heldLightImageUrl?: string;
  heldLightImageSizePx?: number;
  heldLightPose?: ExplorationToolHeldPose | null;
  heldLightFx?: ExplorationToolHeldFx | null;
  heldLightHand?: "left" | "right";
  /** Eyes/mouth + worn clothing loadout for local pawn. */
  avatarLoadout?: import("@/lib/game-exploration-avatar-shared").ExplorationAvatarLoadout | null;
  /** Left- or right-handed tool grip. */
  heldHand?: "left" | "right";
  /** Local player emote. */
  localEmote?: "wave" | "sit" | "dance" | "laugh" | "celebrate" | null;
  /** Walk = half speed; Run = normal (+ Shift); Auto Run = always sprint. */
  moveGait?: "walk" | "run" | "autorun";
  /** Bump to play a gather chop swing on the local pawn. */
  toolChopNonce?: number;
  /** Parent requests walk-to (gather nodes). Re-applies when nonce changes. */
  forceWalkTarget?: { x: number; y: number; nonce: number } | null;
  /** Fired when the player manually walks / steers away (cancel sticky gather). */
  onCancelGather?: () => void;
  /** Footstep tick while the local player is moving. */
  onFootstep?: () => void;
  /** Follow another player until cancelled. */
  traceTarget?: { kind: "peer"; id: string } | { kind: "sim" } | null;
  onCancelTrace?: () => void;
  /** Admin GM: ignore walk blockers. */
  gmNoclip?: boolean;
  /** Admin GM: multiply walk speed (1 = normal). */
  gmFlySpeedMult?: number;
  /** Wade-in water speed multiplier (1 = normal). */
  waterSpeedMult?: number;
  /** Local player submerged-body look while wading. */
  playerWaterVisual?: {
    wade: number;
    sinkPx: number;
    tintHex: string;
    bodyOpacity: number;
    depthPct: number;
  } | null;
  /** Admin GM: no stamina/hydration drain; keep bars full. */
  gmGodMode?: boolean;
  /** Bump to flash a brief teleport FX at the local player. */
  teleportFxNonce?: number;
  /** Gold nameplate for local GM highlight. */
  localNameplateHighlight?: boolean;
};

const SIM_WANDER_RADIUS_PX = 220;
const SIM_RETARGET_MS = 2800;
const SIM_SPAWN_OFFSET_PX = 100;
const NPC_SPAWN_OFFSET_PX = 140;
/** Sim walks a bit slower than the local player for readability. */
const SIM_SPEED_FACTOR = 0.72;
const NPC_SPEED_FACTOR = 0.58;
/** Stay this far behind the traced player (world px). */
const TRACE_FOLLOW_LAG_PX = 48;

export type ExplorationRemotePeer = {
  id: string;
  name: string;
  appearance: ExplorationAvatarAppearance;
  hairStyle: ExplorationAvatarHairStyleView | null;
  x: number;
  y: number;
  facingDeg: number;
  walking: boolean;
  /** Merged avatar cosmetics including worn clothing. */
  avatarLoadout?: import("@/lib/game-exploration-avatar-shared").ExplorationAvatarLoadout | null;
  /** Optional trailing companion (resolved on the client). */
  followerCompanion?: ExplorationCompanionView | null;
  /** Optional rideable mount for this peer. */
  mountCompanion?: ExplorationCompanionView | null;
  mounted?: boolean;
  heldToolImageUrl?: string;
  heldToolImageSizePx?: number;
  heldToolPose?: ExplorationToolHeldPose | null;
  heldToolFx?: ExplorationToolHeldFx | null;
  heldHand?: "left" | "right";
  heldLightImageUrl?: string;
  heldLightImageSizePx?: number;
  heldLightPose?: ExplorationToolHeldPose | null;
  heldLightFx?: ExplorationToolHeldFx | null;
  heldLightHand?: "left" | "right";
  /** Equipped light tool id for night beam. */
  lightToolId?: string;
  lightHand?: "left" | "right";
  emote?: "wave" | "sit" | "dance" | "laugh" | "celebrate" | null;
  speech?: string | null;
  typing?: boolean;
  /** Zone chat sync marker (epoch ms). */
  zoneChatAt?: number;
  zoneChatBody?: string;
  /** Admin GM peer (live presence). */
  isGm?: boolean;
  /** Gold nameplate / chat highlight. */
  highlight?: boolean;
  /** Hidden from normal players (filtered before render). */
  invisible?: boolean;
};

export function ArcadeExplorationViewport({
  zone,
  className = "",
  graphicsQuality = "full",
  showBlockers = false,
  onTeleporterActivate,
  onStableActivate,
  onStoreActivate,
  onHomeActivate,
  onSignActivate,
  spawnOverride = null,
  logoutMarkers = [],
  logoutMarkerImageUrl = "",
  logoutMarkerImageSizePx = 40,
  onPositionChange,
  onPoseChange,
  avatarAppearance = null,
  avatarHairStyle = null,
  avatarCatalog = null,
  localPlayerName = "Player",
  remotePeers = [],
  onRemotePeerActivate,
  onSocialTargetSelect,
  onSimPositionChange,
  onNpcPositionChange,
  simulateOtherPlayer = false,
  simAppearance = null,
  simHairStyle = null,
  simPlayerName = "SimPlayer",
  localSpeech = null,
  simSpeech = null,
  simulateNpc = false,
  npcAppearance = null,
  npcHairStyle = null,
  npcName = "NPC",
  npcAvatarLoadout = null,
  npcWanderEnabled = true,
  npcWanderDistancePx = 187,
  npcIdleFacingDeg = 90,
  onSimPlayerActivate,
  simInteractOpen = false,
  onNpcActivate,
  onNpcPinActivate,
  npcInteractOpen = false,
  zoomMin = 0.6,
  zoomMax = 2.25,
  characterCollisionRadiusPx = CHARACTER_COLLISION_RADIUS_DEFAULT_PX,
  characterCollisionMode = "body",
  followerCompanion = null,
  mountCompanion = null,
  mounted = false,
  onMountedChange,
  staminaSettings = DEFAULT_STAMINA_SETTINGS,
  hydrationSettings,
  bodySettings,
  hydrationMax = 30,
  regionDehydrationRatePerSec = null,
  weightSettings = DEFAULT_WEIGHT_SETTINGS,
  weightLoadPct = 0,
  onStaminaChange,
  onHydrationChange,
  onFountainActivate,
  hydrationInject = null,
  onFacingChange,
  onCompanionActivate,
  simFollowerCompanion = null,
  speechBubbleStyle = DEFAULT_SPEECH_BUBBLE_CONFIG,
  nameplatePlayerStyle = DEFAULT_NAMEPLATE_PLAYER,
  nameplateNpcStyle = DEFAULT_NAMEPLATE_NPC,
  worldOverlay = null,
  nightFilter = null,
  heldToolImageUrl = "",
  heldToolImageSizePx = 20,
  heldToolPose = null,
  heldToolFx = null,
  heldLightImageUrl = "",
  heldLightImageSizePx = 20,
  heldLightPose = null,
  heldLightFx = null,
  heldLightHand = "left",
  avatarLoadout = null,
  heldHand = "right",
  localEmote = null,
  moveGait = "run",
  toolChopNonce = 0,
  forceWalkTarget = null,
  onCancelGather,
  onFootstep,
  traceTarget = null,
  onCancelTrace,
  gmNoclip = false,
  gmFlySpeedMult = 1,
  waterSpeedMult = 1,
  playerWaterVisual = null,
  gmGodMode = false,
  teleportFxNonce = 0,
  localNameplateHighlight = false,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const charRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<HTMLDivElement>(null);
  const npcRef = useRef<HTMLDivElement>(null);
  const walkPinRef = useRef<HTMLDivElement>(null);
  const selectRingRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<ExplorationSelection | null>(null);
  const selectionRef = useRef<ExplorationSelection | null>(null);
  selectionRef.current = selection;
  const lastClickTargetRef = useRef<{ key: string; at: number } | null>(null);
  const onSocialTargetSelectRef = useRef(onSocialTargetSelect);
  onSocialTargetSelectRef.current = onSocialTargetSelect;
  const simPlayerNameRef = useRef(simPlayerName);
  simPlayerNameRef.current = simPlayerName;
  const remotePeersRef = useRef(remotePeers);
  remotePeersRef.current = remotePeers;
  const gmNoclipRef = useRef(gmNoclip);
  gmNoclipRef.current = gmNoclip;
  const gmFlySpeedMultRef = useRef(gmFlySpeedMult);
  gmFlySpeedMultRef.current = gmFlySpeedMult;
  const waterSpeedMultRef = useRef(waterSpeedMult);
  waterSpeedMultRef.current = waterSpeedMult;
  const playerWaterVisualRef = useRef(playerWaterVisual);
  playerWaterVisualRef.current = playerWaterVisual;
  const gmGodModeRef = useRef(gmGodMode);
  gmGodModeRef.current = gmGodMode;
  const [teleportFlash, setTeleportFlash] = useState(false);
  const lastTeleportFxNonceRef = useRef(teleportFxNonce);

  const applySelection = useCallback((next: ExplorationSelection | null) => {
    selectionRef.current = next;
    setSelection(next);
    if (!next) {
      onSocialTargetSelectRef.current?.(null);
      return;
    }
    if (next.kind === "peer") {
      const peer = remotePeersRef.current.find((p) => p.id === next.id);
      if (peer) {
        onSocialTargetSelectRef.current?.({
          kind: "peer",
          id: peer.id,
          name: peer.name,
        });
      } else {
        onSocialTargetSelectRef.current?.(null);
      }
      return;
    }
    if (next.kind === "simPlayer") {
      onSocialTargetSelectRef.current?.({
        kind: "sim",
        name: simPlayerNameRef.current,
      });
      return;
    }
    // Companion / NPC / creature — not a Trade/Trace target.
    onSocialTargetSelectRef.current?.(null);
  }, []);
  const stateRef = useRef<MovementState>({
    position: { x: 0, y: 0 },
    target: null,
    steer: { x: 0, y: 0 },
  });
  const simStateRef = useRef<MovementState>({
    position: { x: 0, y: 0 },
    target: null,
    steer: { x: 0, y: 0 },
  });
  const simHomeRef = useRef<Vec2>({ x: 0, y: 0 });
  const simRetargetAtRef = useRef(0);
  const lastSimFacingRef = useRef(180);
  const lastSimWalkingRef = useRef(false);
  const npcStateRef = useRef<MovementState>({
    position: { x: 0, y: 0 },
    target: null,
    steer: { x: 0, y: 0 },
  });
  const npcHomeRef = useRef<Vec2>({ x: 0, y: 0 });
  const npcRetargetAtRef = useRef(0);
  const lastNpcFacingRef = useRef(90);
  const lastNpcWalkingRef = useRef(false);
  const keysRef = useRef<Set<string>>(new Set());
  const pointerRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    steering: boolean;
  } | null>(null);
  const dragSteerRef = useRef<Vec2>({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const graphicsQualityRef = useRef(graphicsQuality);
  graphicsQualityRef.current = graphicsQuality;
  const lastFacingRef = useRef(0);
  const lastWalkingRef = useRef(false);
  const [facingDeg, setFacingDeg] = useState(0);
  const [walking, setWalking] = useState(false);
  const [followerFacingDeg, setFollowerFacingDeg] = useState(180);
  const [simFacingDeg, setSimFacingDeg] = useState(180);
  const [simWalking, setSimWalking] = useState(false);
  const [npcFacingDeg, setNpcFacingDeg] = useState(90);
  const [npcWalking, setNpcWalking] = useState(false);
  const simulateRef = useRef(simulateOtherPlayer);
  simulateRef.current = simulateOtherPlayer;
  const simulateNpcRef = useRef(simulateNpc);
  simulateNpcRef.current = simulateNpc;
  const npcWanderEnabledRef = useRef(npcWanderEnabled);
  npcWanderEnabledRef.current = npcWanderEnabled;
  const npcWanderDistanceRef = useRef(npcWanderDistancePx);
  npcWanderDistanceRef.current = npcWanderDistancePx;
  const npcIdleFacingRef = useRef(npcIdleFacingDeg);
  npcIdleFacingRef.current = npcIdleFacingDeg;
  const simInteractOpenRef = useRef(simInteractOpen);
  simInteractOpenRef.current = simInteractOpen;
  const npcInteractOpenRef = useRef(npcInteractOpen);
  npcInteractOpenRef.current = npcInteractOpen;
  const onSimPlayerActivateRef = useRef(onSimPlayerActivate);
  onSimPlayerActivateRef.current = onSimPlayerActivate;
  const onNpcActivateRef = useRef(onNpcActivate);
  onNpcActivateRef.current = onNpcActivate;
  const onNpcPinActivateRef = useRef(onNpcPinActivate);
  onNpcPinActivateRef.current = onNpcPinActivate;
  const onRemotePeerActivateRef = useRef(onRemotePeerActivate);
  onRemotePeerActivateRef.current = onRemotePeerActivate;
  const peerSmoothRef = useRef<Map<string, PeerSmoothState>>(new Map());
  const peerElRef = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const peerFollowerElRef = useRef<Map<string, HTMLDivElement | null>>(new Map());

  useEffect(() => {
    if (!forceWalkTarget) return;
    stateRef.current.target = clampToWorld(
      { x: forceWalkTarget.x, y: forceWalkTarget.y },
      { width: zone.worldWidthPx, height: zone.worldHeightPx },
    );
  }, [forceWalkTarget, zone.worldWidthPx, zone.worldHeightPx]);

  useEffect(() => {
    if (!teleportFxNonce || teleportFxNonce === lastTeleportFxNonceRef.current) return;
    lastTeleportFxNonceRef.current = teleportFxNonce;
    setTeleportFlash(true);
    const t = window.setTimeout(() => setTeleportFlash(false), 420);
    return () => window.clearTimeout(t);
  }, [teleportFxNonce]);

  useEffect(() => {
    const map = peerSmoothRef.current;
    const seen = new Set<string>();
    for (const peer of remotePeers) {
      seen.add(peer.id);
      const cur = map.get(peer.id);
      if (cur) {
        cur.tx = peer.x;
        cur.ty = peer.y;
        cur.facingDeg = peer.facingDeg;
        cur.walking = peer.walking;
      } else {
        map.set(peer.id, {
          id: peer.id,
          x: peer.x,
          y: peer.y,
          tx: peer.x,
          ty: peer.y,
          fx: peer.x - 28,
          fy: peer.y + 18,
          facingDeg: peer.facingDeg,
          walking: peer.walking,
        });
      }
    }
    for (const id of [...map.keys()]) {
      if (!seen.has(id)) {
        map.delete(id);
        peerElRef.current.delete(id);
        peerFollowerElRef.current.delete(id);
      }
    }
  }, [remotePeers]);
  const onSimPositionChangeRef = useRef(onSimPositionChange);
  onSimPositionChangeRef.current = onSimPositionChange;
  const onNpcPositionChangeRef = useRef(onNpcPositionChange);
  onNpcPositionChangeRef.current = onNpcPositionChange;
  const pendingRemotePeerIdRef = useRef<string | null>(null);
  const pendingSimInteractRef = useRef(false);
  const pendingNpcInteractRef = useRef(false);
  const zoomRef = useRef(1);
  const zoomMinRef = useRef(zoomMin);
  zoomMinRef.current = zoomMin;
  const zoomMaxRef = useRef(zoomMax);
  zoomMaxRef.current = zoomMax;
  /** Two-finger pinch in progress — suppress single-finger steer / tap. */
  const pinchActiveRef = useRef(false);
  const [zoomUi, setZoomUi] = useState(1);

  const world: WorldBounds = useMemo(() => {
    const col = resolveCharacterCollision({
      characterCollisionMode,
      characterCollisionRadiusPx,
    });
    return {
      width: zone.worldWidthPx,
      height: zone.worldHeightPx,
      radius: col.radius,
      collisionOffset: { x: 0, y: col.offsetY },
    };
  }, [
    zone.worldWidthPx,
    zone.worldHeightPx,
    characterCollisionRadiusPx,
    characterCollisionMode,
  ]);

  const blockers: BlockerRect[] = useMemo(
    () =>
      zone.elements
        .filter((el) => el.kind === "BLOCKER" || el.kind === "HOME")
        .map((el) => {
          const rect = elementRectToWorldPx(el, zone.worldWidthPx, zone.worldHeightPx);
          if (el.shape === "polygon" && el.polyPoints.length >= 3) {
            return {
              ...rect,
              shape: "polygon" as const,
              poly: el.polyPoints.map((p) => ({
                x: (p.xPct / 100) * zone.worldWidthPx,
                y: (p.yPct / 100) * zone.worldHeightPx,
              })),
            };
          }
          return {
            ...rect,
            shape: el.shape === "circle" || el.shape === "ellipse" ? el.shape : "square",
          };
        }),
    [zone.elements, zone.worldWidthPx, zone.worldHeightPx],
  );

  const blockersRef = useRef(blockers);
  blockersRef.current = blockers;

  const trailRef = useRef<FootstepTrail>(createFootstepTrail());
  const followerPosRef = useRef<Vec2>({ x: 0, y: 0 });
  const wanderRef = useRef<IdleWanderState>(createIdleWander());
  const mountedRef = useRef(mounted);
  mountedRef.current = mounted;
  const onMountedChangeRef = useRef(onMountedChange);
  onMountedChangeRef.current = onMountedChange;
  const staminaCfgRef = useRef(staminaSettings);
  staminaCfgRef.current = staminaSettings;
  const hydrationCfgRef = useRef(hydrationSettings);
  hydrationCfgRef.current = hydrationSettings;
  const hydrationMaxRef = useRef(hydrationMax);
  hydrationMaxRef.current = hydrationMax;
  const regionDehydRef = useRef(regionDehydrationRatePerSec);
  regionDehydRef.current = regionDehydrationRatePerSec;
  const weightCfgRef = useRef(weightSettings);
  weightCfgRef.current = weightSettings;
  const weightLoadRef = useRef(weightLoadPct);
  weightLoadRef.current = weightLoadPct;
  const staminaRef = useRef(staminaSettings.max);
  const hydrationRef = useRef(hydrationMax);
  const staminaExhaustedRef = useRef(false);
  const runHeldRef = useRef(false);
  const moveGaitRef = useRef(moveGait);
  moveGaitRef.current = moveGait;
  const onStaminaChangeRef = useRef(onStaminaChange);
  onStaminaChangeRef.current = onStaminaChange;
  const onHydrationChangeRef = useRef(onHydrationChange);
  onHydrationChangeRef.current = onHydrationChange;
  const onFountainActivateRef = useRef(onFountainActivate);
  onFountainActivateRef.current = onFountainActivate;
  const lastStaminaPublishRef = useRef(0);
  const lastHydrationPublishRef = useRef(0);
  const followerCompanionRef = useRef(followerCompanion);
  followerCompanionRef.current = followerCompanion;
  const mountCompanionRef = useRef(mountCompanion);
  mountCompanionRef.current = mountCompanion;
  const onCompanionActivateRef = useRef(onCompanionActivate);
  onCompanionActivateRef.current = onCompanionActivate;
  const pendingCompanionInteractRef = useRef(false);
  const simFollowerCompanionRef = useRef(simFollowerCompanion);
  simFollowerCompanionRef.current = simFollowerCompanion;
  const simTrailRef = useRef<FootstepTrail>(createFootstepTrail());
  const simFollowerPosRef = useRef<Vec2>({ x: 0, y: 0 });
  const simWanderRef = useRef<IdleWanderState>(createIdleWander());
  const simFollowerRef = useRef<HTMLDivElement>(null);
  const [simFollowerFacingDeg, setSimFollowerFacingDeg] = useState(180);

  function currentRideable(): ExplorationCompanionView | null {
    return resolveRideableCompanion(
      mountCompanionRef.current,
      followerCompanionRef.current,
    );
  }

  const dismountZones = useMemo(
    () => zone.elements.filter((el) => el.kind === "DISMOUNT"),
    [zone.elements],
  );
  const dismountZonesRef = useRef(dismountZones);
  dismountZonesRef.current = dismountZones;

  const artAndNodes = useMemo(
    () =>
      [...zone.elements]
        .filter(
          (el) =>
            el.kind === "ART" ||
            el.kind === "NODE" ||
            el.kind === "TELEPORTER" ||
            el.kind === "STABLE" ||
            el.kind === "STORE" ||
            el.kind === "NPC" ||
            el.kind === "HOME" ||
            el.kind === "SIGN" ||
            el.kind === "FOUNTAIN" ||
            el.kind === "LIGHT",
        )
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [zone.elements],
  );
  const groundDecor = useMemo(
    () => artAndNodes.filter((el) => el.kind !== "ART" || el.artDepth === "ground"),
    [artAndNodes],
  );
  const ysortArt = useMemo(
    () => artAndNodes.filter((el) => el.kind === "ART" && el.artDepth === "ysort"),
    [artAndNodes],
  );
  const overheadArt = useMemo(
    () => artAndNodes.filter((el) => el.kind === "ART" && el.artDepth === "overhead"),
    [artAndNodes],
  );
  const showOverheadLayer = zoneHasOverheadLayer(zone);

  const interactablesRef = useRef(
    zone.elements.filter(
      (el) =>
        el.kind === "TELEPORTER" ||
        el.kind === "NODE" ||
        el.kind === "STABLE" ||
        el.kind === "STORE" ||
        el.kind === "NPC" ||
        el.kind === "HOME" ||
        el.kind === "SIGN" ||
        el.kind === "FOUNTAIN",
    ),
  );
  interactablesRef.current = zone.elements.filter(
    (el) =>
      el.kind === "TELEPORTER" ||
      el.kind === "NODE" ||
      el.kind === "STABLE" ||
      el.kind === "STORE" ||
      el.kind === "NPC" ||
      el.kind === "HOME" ||
      el.kind === "SIGN" ||
      el.kind === "FOUNTAIN",
  );
  const onTeleporterActivateRef = useRef(onTeleporterActivate);
  onTeleporterActivateRef.current = onTeleporterActivate;
  const onStableActivateRef = useRef(onStableActivate);
  onStableActivateRef.current = onStableActivate;
  const onStoreActivateRef = useRef(onStoreActivate);
  onStoreActivateRef.current = onStoreActivate;
  const onHomeActivateRef = useRef(onHomeActivate);
  onHomeActivateRef.current = onHomeActivate;
  const onSignActivateRef = useRef(onSignActivate);
  onSignActivateRef.current = onSignActivate;
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  const onCancelGatherRef = useRef(onCancelGather);
  onCancelGatherRef.current = onCancelGather;
  const onFootstepRef = useRef(onFootstep);
  onFootstepRef.current = onFootstep;
  const onCancelTraceRef = useRef(onCancelTrace);
  onCancelTraceRef.current = onCancelTrace;
  const lastFootstepAtRef = useRef(0);
  const traceTargetRef = useRef(traceTarget);
  traceTargetRef.current = traceTarget;
  const onPoseChangeRef = useRef(onPoseChange);
  onPoseChangeRef.current = onPoseChange;
  const lastPosPublishRef = useRef(0);
  /** Walk-then-interact: open menu only after arriving. */
  const pendingInteractRef = useRef<ExplorationZoneElementView | null>(null);

  const clearPendingInteract = useCallback(() => {
    pendingInteractRef.current = null;
    pendingSimInteractRef.current = false;
    pendingNpcInteractRef.current = false;
    pendingCompanionInteractRef.current = false;
    pendingRemotePeerIdRef.current = null;
  }, []);

  useEffect(() => {
    if (!traceTarget) return;
    clearPendingInteract();
  }, [traceTarget, clearPendingInteract]);

  const faceSimTowardLocal = useCallback(() => {
    const local = stateRef.current.position;
    const sim = simStateRef.current.position;
    const nextFacing = facingDegFromDirection(local.x - sim.x, local.y - sim.y);
    simStateRef.current.target = null;
    simStateRef.current.steer = { x: 0, y: 0 };
    if (lastSimWalkingRef.current) {
      lastSimWalkingRef.current = false;
      setSimWalking(false);
    }
    if (Math.abs(nextFacing - lastSimFacingRef.current) > 2) {
      lastSimFacingRef.current = nextFacing;
      setSimFacingDeg(nextFacing);
    }
  }, []);

  const faceNpcTowardLocal = useCallback(() => {
    const local = stateRef.current.position;
    const npc = npcStateRef.current.position;
    const nextFacing = facingDegFromDirection(local.x - npc.x, local.y - npc.y);
    npcStateRef.current.target = null;
    npcStateRef.current.steer = { x: 0, y: 0 };
    if (lastNpcWalkingRef.current) {
      lastNpcWalkingRef.current = false;
      setNpcWalking(false);
    }
    if (Math.abs(nextFacing - lastNpcFacingRef.current) > 2) {
      lastNpcFacingRef.current = nextFacing;
      setNpcFacingDeg(nextFacing);
    }
  }, []);

  const tryFirePendingSimInteract = useCallback(
    (pos: Vec2) => {
      if (!pendingSimInteractRef.current || !simulateRef.current) return;
      const sim = simStateRef.current.position;
      if (Math.hypot(pos.x - sim.x, pos.y - sim.y) > INTERACT_ARRIVE_PX + 12) return;
      pendingSimInteractRef.current = false;
      faceSimTowardLocal();
      onSimPlayerActivateRef.current?.();
    },
    [faceSimTowardLocal],
  );

  const tryFirePendingNpcInteract = useCallback(
    (pos: Vec2) => {
      if (!pendingNpcInteractRef.current || !simulateNpcRef.current) return;
      const npc = npcStateRef.current.position;
      if (Math.hypot(pos.x - npc.x, pos.y - npc.y) > INTERACT_ARRIVE_PX + 12) return;
      pendingNpcInteractRef.current = false;
      faceNpcTowardLocal();
      onNpcActivateRef.current?.();
    },
    [faceNpcTowardLocal],
  );

  const tryFirePendingInteract = useCallback(
    (pos: Vec2) => {
      const pending = pendingInteractRef.current;
      if (!pending) return;
      if (!nearInteractPoint(pos, pending, zone.worldWidthPx, zone.worldHeightPx)) {
        return;
      }
      pendingInteractRef.current = null;
      if (pending.kind === "TELEPORTER") {
        onTeleporterActivateRef.current?.(pending);
      } else if (pending.kind === "STABLE") {
        onStableActivateRef.current?.(pending);
      } else if (pending.kind === "STORE") {
        onStoreActivateRef.current?.(pending);
      } else if (pending.kind === "NPC") {
        onNpcPinActivateRef.current?.(pending);
      } else if (pending.kind === "HOME") {
        onHomeActivateRef.current?.(pending);
      } else if (pending.kind === "SIGN") {
        onSignActivateRef.current?.(pending);
      } else if (pending.kind === "FOUNTAIN") {
        onFountainActivateRef.current?.(pending);
      }
      // NODE (and future interactables): arrival hook can land here later.
    },
    [zone.worldHeightPx, zone.worldWidthPx],
  );

  const applyDom = useCallback(() => {
    const stage = stageRef.current;
    const worldEl = worldRef.current;
    const charEl = charRef.current;
    if (!stage || !worldEl || !charEl) return;
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    if (sw <= 0 || sh <= 0) return;

    const z = zoomRef.current;
    const pos = stateRef.current.position;
    const cam = cameraTranslate(pos, sw, sh, z);
    worldEl.style.width = `${zone.worldWidthPx}px`;
    worldEl.style.height = `${zone.worldHeightPx}px`;
    worldEl.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${z})`;
    worldEl.style.transformOrigin = "0 0";
    // Local player lives in world space so overhead / ysort ART can cover them.
    charEl.style.transform = `translate(-50%, -50%) translate(${pos.x}px, ${pos.y + (playerWaterVisualRef.current?.sinkPx ?? 0)}px)`;
    charEl.style.zIndex = String(explorationDepthZ(pos.y));

    const simEl = simRef.current;
    if (simEl) {
      if (simulateRef.current) {
        const sp = simStateRef.current.position;
        simEl.style.display = "block";
        simEl.style.transform = `translate(-50%, -50%) translate(${sp.x}px, ${sp.y}px)`;
        simEl.style.zIndex = String(explorationDepthZ(sp.y));
      } else {
        simEl.style.display = "none";
      }
    }

    const npcEl = npcRef.current;
    if (npcEl) {
      if (simulateNpcRef.current) {
        const np = npcStateRef.current.position;
        npcEl.style.display = "block";
        npcEl.style.transform = `translate(-50%, -50%) translate(${np.x}px, ${np.y}px)`;
        npcEl.style.zIndex = String(explorationDepthZ(np.y));
      } else {
        npcEl.style.display = "none";
      }
    }

    const pin = walkPinRef.current;
    if (pin) {
      const target = stateRef.current.target;
      if (target) {
        pin.style.display = "block";
        pin.style.transform = `translate(-50%, -100%) translate(${target.x}px, ${target.y}px)`;
      } else {
        pin.style.display = "none";
      }
    }

    const ring = selectRingRef.current;
    if (ring) {
      const sel = selectionRef.current;
      let rx: number | null = null;
      let ry: number | null = null;
      if (sel?.kind === "peer") {
        const sm = peerSmoothRef.current.get(sel.id);
        const peer = remotePeersRef.current.find((p) => p.id === sel.id);
        if (sm || peer) {
          rx = sm?.x ?? peer!.x;
          ry = sm?.y ?? peer!.y;
        }
      } else if (sel?.kind === "simPlayer" && simulateRef.current) {
        rx = simStateRef.current.position.x;
        ry = simStateRef.current.position.y;
      } else if (sel?.kind === "npc" && simulateNpcRef.current) {
        rx = npcStateRef.current.position.x;
        ry = npcStateRef.current.position.y;
      } else if (sel?.kind === "companion") {
        const fol = followerCompanionRef.current;
        const ride = resolveRideableCompanion(mountCompanionRef.current, fol);
        const hidden = Boolean(mountedRef.current && ride && fol && ride.id === fol.id);
        if (fol?.canFollow && !hidden) {
          rx = followerPosRef.current.x;
          ry = followerPosRef.current.y;
        }
      } else if (sel?.kind === "creature") {
        // Future attackable world creatures — resolve position when combat lands.
      }
      if (rx != null && ry != null) {
        // Sprite position is mid-body; drop the ring to the soles (same offset as feet collision).
        const feetScale = sel?.kind === "companion" ? 0.72 : 1;
        const feetY = ry + Math.round(EXPLORATION_FEET_COLLISION_OFFSET_Y_PX * feetScale);
        ring.style.display = "block";
        ring.style.transform = `translate(-50%, -50%) translate(${rx}px, ${feetY}px)`;
        ring.style.zIndex = String(Math.max(1, explorationDepthZ(feetY) - 1));
      } else {
        ring.style.display = "none";
      }
    }

    const folEl = followerRef.current;
    if (folEl) {
      const fol = followerCompanionRef.current;
      const hideFollower =
        !fol ||
        !fol.canFollow ||
        (mountedRef.current && currentRideable()?.id === fol.id);
      if (hideFollower) {
        folEl.style.display = "none";
      } else {
        const fp = followerPosRef.current;
        folEl.style.display = "block";
        folEl.style.transform = `translate(-50%, -50%) translate(${fp.x}px, ${fp.y}px)`;
        folEl.style.zIndex = String(explorationDepthZ(fp.y));
      }
    }

    const simFolEl = simFollowerRef.current;
    if (simFolEl) {
      const simFol = simFollowerCompanionRef.current;
      if (!simulateRef.current || !simFol?.canFollow) {
        simFolEl.style.display = "none";
      } else {
        const sfp = simFollowerPosRef.current;
        simFolEl.style.display = "block";
        simFolEl.style.transform = `translate(-50%, -50%) translate(${sfp.x}px, ${sfp.y}px)`;
        simFolEl.style.zIndex = String(explorationDepthZ(sfp.y));
      }
    }
  }, [zone.worldHeightPx, zone.worldWidthPx]);

  const applyDomRef = useRef(applyDom);
  applyDomRef.current = applyDom;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => applyDom());
    ro.observe(stage);
    applyDom();
    return () => ro.disconnect();
  }, [applyDom]);

  useEffect(() => {
    const next = clamp(zoomRef.current, zoomMin, zoomMax);
    zoomRef.current = next;
    setZoomUi(next);
    applyDom();
  }, [zoomMin, zoomMax, applyDom]);

  const recomputeSteer = useCallback(() => {
    const keySteer = keysToSteer(keysRef.current);
    const drag = dragSteerRef.current;
    if (vecLength(keySteer) > 0) {
      stateRef.current.steer = keySteer;
    } else if (vecLength(drag) > 0) {
      stateRef.current.steer = drag;
    } else {
      stateRef.current.steer = { x: 0, y: 0 };
    }
  }, []);

  const applyZoom = useCallback(
    (next: number) => {
      const z = clamp(next, zoomMinRef.current, zoomMaxRef.current);
      if (Math.abs(z - zoomRef.current) < 1e-4) return;
      zoomRef.current = z;
      setZoomUi(z);
      applyDom();
    },
    [applyDom],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      // Block browser page zoom / scroll over the map; zoom the game instead.
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      applyZoom(zoomRef.current * factor);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [applyZoom]);

  // Pinch-to-zoom (phones / tablets). One finger still steers / taps.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const active = new Map<number, { x: number; y: number }>();
    let pinch: { startDist: number; startZoom: number } | null = null;

    function touchDist(
      a: { x: number; y: number },
      b: { x: number; y: number },
    ): number {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    const onTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches.item(i)!;
        active.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
      if (active.size >= 2) {
        e.preventDefault();
        pinchActiveRef.current = true;
        pointerRef.current = null;
        dragSteerRef.current = { x: 0, y: 0 };
        recomputeSteer();
        const pts = [...active.values()];
        pinch = {
          startDist: touchDist(pts[0]!, pts[1]!),
          startZoom: zoomRef.current,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches.item(i)!;
        if (active.has(t.identifier)) {
          active.set(t.identifier, { x: t.clientX, y: t.clientY });
        }
      }
      if (active.size < 2 || !pinch) return;
      e.preventDefault();
      const pts = [...active.values()];
      const d = touchDist(pts[0]!, pts[1]!);
      if (pinch.startDist < 12) return;
      applyZoom(pinch.startZoom * (d / pinch.startDist));
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        active.delete(e.changedTouches.item(i)!.identifier);
      }
      if (active.size < 2) {
        pinch = null;
        pinchActiveRef.current = false;
      }
    };

    stage.addEventListener("touchstart", onTouchStart, { passive: false });
    stage.addEventListener("touchmove", onTouchMove, { passive: false });
    stage.addEventListener("touchend", onTouchEnd);
    stage.addEventListener("touchcancel", onTouchEnd);
    return () => {
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("touchend", onTouchEnd);
      stage.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [applyZoom, recomputeSteer]);

  useEffect(() => {
    const spawn = clampToWorld(
      spawnOverride ?? spawnWorldPosition(zone.spawnXPct, zone.spawnYPct, world),
      world,
    );
    pendingInteractRef.current = null;
    pendingSimInteractRef.current = false;
    pendingNpcInteractRef.current = false;
    pendingCompanionInteractRef.current = false;
    zoomRef.current = clamp(1, zoomMinRef.current, zoomMaxRef.current);
    setZoomUi(zoomRef.current);
    lastWalkingRef.current = false;
    lastFacingRef.current = 0;
    setWalking(false);
    setFacingDeg(0);
    stateRef.current = {
      position: spawn,
      target: null,
      steer: { x: 0, y: 0 },
    };
    trailRef.current = createFootstepTrail();
    pushFootstep(trailRef.current, spawn);
    followerPosRef.current = {
      x: spawn.x - 28,
      y: spawn.y + 20,
    };
    wanderRef.current = createIdleWander();
    setFollowerFacingDeg(180);
    onMountedChangeRef.current?.(false);

    const simSpawn = clampToWorld(
      { x: spawn.x + SIM_SPAWN_OFFSET_PX, y: spawn.y - SIM_SPAWN_OFFSET_PX * 0.35 },
      world,
    );
    simHomeRef.current = simSpawn;
    simStateRef.current = {
      position: simSpawn,
      target: null,
      steer: { x: 0, y: 0 },
    };
    simTrailRef.current = createFootstepTrail();
    pushFootstep(simTrailRef.current, simSpawn);
    simFollowerPosRef.current = { x: simSpawn.x - 24, y: simSpawn.y + 18 };
    simWanderRef.current = createIdleWander();
    setSimFollowerFacingDeg(180);
    simRetargetAtRef.current = 0;
    lastSimWalkingRef.current = false;
    lastSimFacingRef.current = 180;
    setSimWalking(false);
    setSimFacingDeg(180);

    const npcPin = zone.elements.find((el) => el.kind === "NPC");
    const npcSpawn = clampToWorld(
      npcPin
        ? elementCenterWorld(npcPin, zone.worldWidthPx, zone.worldHeightPx)
        : { x: spawn.x - NPC_SPAWN_OFFSET_PX, y: spawn.y + NPC_SPAWN_OFFSET_PX * 0.25 },
      world,
    );
    npcHomeRef.current = npcSpawn;
    npcStateRef.current = {
      position: npcSpawn,
      target: null,
      steer: { x: 0, y: 0 },
    };
    npcRetargetAtRef.current = 0;
    lastNpcWalkingRef.current = false;
    const idleFace = npcIdleFacingRef.current;
    lastNpcFacingRef.current = idleFace;
    setNpcWalking(false);
    setNpcFacingDeg(idleFace);

    onPositionChangeRef.current?.({ x: spawn.x, y: spawn.y });
    onPoseChangeRef.current?.({ x: spawn.x, y: spawn.y, facingDeg: 0, walking: false });
    applyDomRef.current();
    // Value deps only — object identity of spawnOverride/world/applyDom must not retrigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- world size via width/height primitives
  }, [
    zone.id,
    zone.spawnXPct,
    zone.spawnYPct,
    zone.worldWidthPx,
    zone.worldHeightPx,
    spawnOverride?.x,
    spawnOverride?.y,
  ]);

  useEffect(() => {
    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      // Low graphics: allow larger dt so weak tablets don't crawl when FPS dips.
      const dtCap = graphicsQualityRef.current === "low" ? 0.1 : 0.05;
      const dt = Math.min(dtCap, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      if (vecLength(stateRef.current.steer) > 1e-4) {
        pendingInteractRef.current = null;
        pendingSimInteractRef.current = false;
        pendingNpcInteractRef.current = false;
        if (traceTargetRef.current) {
          onCancelTraceRef.current?.();
        }
      }

      const tracing = traceTargetRef.current;
      if (tracing && vecLength(stateRef.current.steer) < 1e-4) {
        let tx = 0;
        let ty = 0;
        let facing = 180;
        let ok = false;
        if (tracing.kind === "sim") {
          if (simulateRef.current) {
            tx = simStateRef.current.position.x;
            ty = simStateRef.current.position.y;
            facing = lastSimFacingRef.current;
            ok = true;
          }
        } else {
          const peer = remotePeersRef.current.find((r) => r.id === tracing.id);
          const smooth = peer ? peerSmoothRef.current.get(peer.id) : undefined;
          if (peer) {
            tx = smooth?.x ?? peer.x;
            ty = smooth?.y ?? peer.y;
            facing = smooth?.facingDeg ?? peer.facingDeg;
            ok = true;
          }
        }
        if (!ok) {
          onCancelTraceRef.current?.();
        } else {
          const rad = (facing * Math.PI) / 180;
          const fx = Math.sin(rad);
          const fy = -Math.cos(rad);
          stateRef.current.target = clampToWorld(
            {
              x: tx - fx * TRACE_FOLLOW_LAG_PX,
              y: ty - fy * TRACE_FOLLOW_LAG_PX,
            },
            world,
          );
        }
      }

      const hadTarget = Boolean(stateRef.current.target);
      const prevPos = stateRef.current.position;
      const mount = currentRideable();
      const mountMult =
        mountedRef.current && mount?.canRide ? Math.max(1, mount.mountSpeedMult) : 1;
      const cfg = staminaCfgRef.current;
      const hydCfg = hydrationCfgRef.current;
      const hydMax = Math.max(1, hydrationMaxRef.current);
      const loadPct = weightLoadRef.current;
      const weightBlockedRun = isRunBlockedByWeight(loadPct, weightCfgRef.current);
      const hydrationEmpty = hydrationRef.current <= 0;
      const hydBlockedRun = Boolean(hydCfg?.emptyBlockRun && hydrationEmpty);
      const gait = moveGaitRef.current;
      const gaitMult = gait === "walk" ? 0.5 : 1;
      const wantRun =
        (gait === "autorun" || (gait === "run" && runHeldRef.current)) &&
        !staminaExhaustedRef.current &&
        !weightBlockedRun &&
        !hydBlockedRun &&
        staminaRef.current > 0;
      const runMult = wantRun ? Math.max(1, cfg.runSpeedMult) : 1;
      const weightMult = resolveWeightSpeedMult(loadPct, weightCfgRef.current);
      const hydMult =
        hydrationEmpty && hydCfg
          ? Math.max(0.1, Math.min(1, hydCfg.emptySpeedPct / 100))
          : 1;
      const flyMult = Math.max(1, gmFlySpeedMultRef.current || 1);
      const waterMult = Math.max(0.05, Math.min(1, waterSpeedMultRef.current || 1));
      stateRef.current = stepMovement(
        stateRef.current,
        world,
        zone.walkSpeedPxPerSec * mountMult * runMult * weightMult * hydMult * gaitMult * flyMult * waterMult,
        dt,
        gmNoclipRef.current ? [] : blockersRef.current,
      );

      const playerPosNow = stateRef.current.position;
      const moveDist = Math.hypot(playerPosNow.x - prevPos.x, playerPosNow.y - prevPos.y);
      const playerMoving = moveDist > 0.4 || vecLength(stateRef.current.steer) > 1e-4;
      const actuallyRunning = wantRun && playerMoving && moveDist > 0.2;
      if (gmGodModeRef.current) {
        staminaRef.current = cfg.max;
        staminaExhaustedRef.current = false;
        if (hydCfg) hydrationRef.current = hydMax;
      } else if (actuallyRunning) {
        staminaRef.current = Math.max(0, staminaRef.current - cfg.drainPerSec * dt);
        if (staminaRef.current <= 0) {
          staminaRef.current = 0;
          staminaExhaustedRef.current = true;
        }
      } else {
        staminaRef.current = Math.min(cfg.max, staminaRef.current + cfg.regenPerSec * dt);
        if (staminaExhaustedRef.current && staminaRef.current >= cfg.resumeThreshold) {
          staminaExhaustedRef.current = false;
        }
      }
      if (hydCfg && !gmGodModeRef.current) {
        const baseDrain =
          regionDehydRef.current != null && Number.isFinite(regionDehydRef.current)
            ? Math.max(0, regionDehydRef.current)
            : hydCfg.drainPerSec;
        const drain = baseDrain * (playerMoving ? hydCfg.moveDrainMult : 1);
        hydrationRef.current = Math.max(0, Math.min(hydMax, hydrationRef.current - drain * dt));
      }
      if (ts - lastStaminaPublishRef.current >= 80) {
        lastStaminaPublishRef.current = ts;
        onStaminaChangeRef.current?.(
          staminaRef.current,
          cfg.max,
          actuallyRunning,
        );
      }
      if (ts - lastHydrationPublishRef.current >= 80) {
        lastHydrationPublishRef.current = ts;
        onHydrationChangeRef.current?.(hydrationRef.current, hydMax);
      }
      if (playerMoving) {
        pushFootstep(trailRef.current, playerPosNow);
      }

      // Auto-dismount in town / safe zones.
      if (mountedRef.current) {
        for (const el of dismountZonesRef.current) {
          if (
            pointInElementRect(
              playerPosNow.x,
              playerPosNow.y,
              el,
              zone.worldWidthPx,
              zone.worldHeightPx,
            )
          ) {
            mountedRef.current = false;
            onMountedChangeRef.current?.(false);
            break;
          }
        }
      }

      const fol = followerCompanionRef.current;
      if (fol?.canFollow) {
        const hideFollower = mountedRef.current && currentRideable()?.id === fol.id;
        if (!hideFollower) {
          const spot = trailFollowTarget(
            trailRef.current,
            fol.followSteps,
            { x: playerPosNow.x - 24, y: playerPosNow.y + 18 },
          );
          const wanderTarget = stepIdleWander(
            wanderRef.current,
            spot,
            ts,
            playerMoving,
            fol.isWagon ? 8 : 18,
          );
          const prevF = followerPosRef.current;
          const nextF = lerpVec(prevF, wanderTarget, Math.min(1, dt * 4.2));
          const fdx = nextF.x - prevF.x;
          const fdy = nextF.y - prevF.y;
          if (Math.hypot(fdx, fdy) > 0.35) {
            setFollowerFacingDeg(facingDegFromDirection(fdx, fdy));
          }
          followerPosRef.current = nextF;
        }
      }

      // Sim player cat companion trail.
      if (simulateRef.current && simFollowerCompanionRef.current?.canFollow) {
        const simPos = simStateRef.current.position;
        const simMoving =
          lastSimWalkingRef.current || vecLength(simStateRef.current.steer) > 1e-4;
        if (simMoving) {
          pushFootstep(simTrailRef.current, simPos);
        }
        const simFol = simFollowerCompanionRef.current;
        const spot = trailFollowTarget(
          simTrailRef.current,
          simFol.followSteps,
          { x: simPos.x - 20, y: simPos.y + 16 },
        );
        const wanderTarget = stepIdleWander(
          simWanderRef.current,
          spot,
          ts,
          simMoving,
          14,
        );
        const prevS = simFollowerPosRef.current;
        const nextS = lerpVec(prevS, wanderTarget, Math.min(1, dt * 4.2));
        const sdx = nextS.x - prevS.x;
        const sdy = nextS.y - prevS.y;
        if (Math.hypot(sdx, sdy) > 0.35) {
          setSimFollowerFacingDeg(facingDegFromDirection(sdx, sdy));
        }
        simFollowerPosRef.current = nextS;
      }

      const pending = pendingInteractRef.current;
      if (pending) {
        tryFirePendingInteract(stateRef.current.position);
        // Gave up walking (blocked / cancelled) before arrival — drop the queued interact.
        if (
          pendingInteractRef.current &&
          hadTarget &&
          !stateRef.current.target &&
          vecLength(stateRef.current.steer) < 1e-4
        ) {
          if (
            !nearElementCenter(
              stateRef.current.position,
              pending,
              zone.worldWidthPx,
              zone.worldHeightPx,
            )
          ) {
            pendingInteractRef.current = null;
          }
        }
      }

      if (pendingSimInteractRef.current) {
        const tracingSim = traceTargetRef.current?.kind === "sim";
        if (tracingSim) {
          pendingSimInteractRef.current = false;
        } else {
          tryFirePendingSimInteract(stateRef.current.position);
          if (
            pendingSimInteractRef.current &&
            hadTarget &&
            !stateRef.current.target &&
            vecLength(stateRef.current.steer) < 1e-4
          ) {
            const sim = simStateRef.current.position;
            const p = stateRef.current.position;
            if (Math.hypot(p.x - sim.x, p.y - sim.y) > INTERACT_ARRIVE_PX + 12) {
              pendingSimInteractRef.current = false;
            }
          }
        }
      }

      if (pendingNpcInteractRef.current) {
        tryFirePendingNpcInteract(stateRef.current.position);
        if (
          pendingNpcInteractRef.current &&
          hadTarget &&
          !stateRef.current.target &&
          vecLength(stateRef.current.steer) < 1e-4
        ) {
          const npc = npcStateRef.current.position;
          const p = stateRef.current.position;
          if (Math.hypot(p.x - npc.x, p.y - npc.y) > INTERACT_ARRIVE_PX + 12) {
            pendingNpcInteractRef.current = false;
          }
        }
      }

      if (pendingCompanionInteractRef.current) {
        const fp = followerPosRef.current;
        const p = stateRef.current.position;
        if (Math.hypot(p.x - fp.x, p.y - fp.y) <= INTERACT_ARRIVE_PX + 16) {
          pendingCompanionInteractRef.current = false;
          onCompanionActivateRef.current?.();
        } else if (hadTarget && !stateRef.current.target && vecLength(stateRef.current.steer) < 1e-4) {
          if (Math.hypot(p.x - fp.x, p.y - fp.y) > INTERACT_ARRIVE_PX + 16) {
            pendingCompanionInteractRef.current = false;
          }
        }
      }

      if (pendingRemotePeerIdRef.current) {
        const peer = remotePeersRef.current.find((r) => r.id === pendingRemotePeerIdRef.current);
        const smooth = peer
          ? peerSmoothRef.current.get(peer.id)
          : undefined;
        const p = stateRef.current.position;
        const px = smooth?.x ?? peer?.x ?? 0;
        const py = smooth?.y ?? peer?.y ?? 0;
        const tracingPeer =
          traceTargetRef.current?.kind === "peer" &&
          peer &&
          traceTargetRef.current.id === peer.id;
        if (!peer) {
          pendingRemotePeerIdRef.current = null;
        } else if (tracingPeer) {
          // Stay in Trace — don't reopen the player menu on arrival.
          pendingRemotePeerIdRef.current = null;
        } else if (Math.hypot(p.x - px, p.y - py) <= INTERACT_ARRIVE_PX + 12) {
          pendingRemotePeerIdRef.current = null;
          onRemotePeerActivateRef.current?.(peer);
        } else if (hadTarget && !stateRef.current.target && vecLength(stateRef.current.steer) < 1e-4) {
          if (Math.hypot(p.x - px, p.y - py) > INTERACT_ARRIVE_PX + 12) {
            pendingRemotePeerIdRef.current = null;
          }
        }
      }

      const pos = stateRef.current.position;
      const movedDx = pos.x - prevPos.x;
      const movedDy = pos.y - prevPos.y;
      const moved = Math.hypot(movedDx, movedDy) > 0.05;
      if (moved !== lastWalkingRef.current) {
        lastWalkingRef.current = moved;
        setWalking(moved);
      }

      if (moved) {
        const gait = moveGaitRef.current;
        const intervalMs = gait === "walk" ? 420 : gait === "autorun" ? 260 : 300;
        if (ts - lastFootstepAtRef.current >= intervalMs) {
          lastFootstepAtRef.current = ts;
          onFootstepRef.current?.();
        }
      }

      if (moved) {
        const nextFacing = facingDegFromDirection(movedDx, movedDy);
        if (Math.abs(nextFacing - lastFacingRef.current) > 2) {
          lastFacingRef.current = nextFacing;
          setFacingDeg(nextFacing);
        }
      } else {
        const steer = stateRef.current.steer;
        const target = stateRef.current.target;
        let dir: Vec2 | null = null;
        if (vecLength(steer) > 1e-4) {
          dir = normalizeVec(steer);
        } else if (target) {
          dir = normalizeVec({ x: target.x - pos.x, y: target.y - pos.y });
        }
        if (dir && vecLength(dir) > 1e-4) {
          const nextFacing = facingDegFromDirection(dir.x, dir.y);
          if (Math.abs(nextFacing - lastFacingRef.current) > 2) {
            lastFacingRef.current = nextFacing;
            setFacingDeg(nextFacing);
          }
        }
      }

      if (ts - lastPosPublishRef.current >= 80) {
        lastPosPublishRef.current = ts;
        onPositionChangeRef.current?.({ x: pos.x, y: pos.y });
        onPoseChangeRef.current?.({
          x: pos.x,
          y: pos.y,
          facingDeg: lastFacingRef.current,
          walking: lastWalkingRef.current,
          mounted: mountedRef.current,
        });
        if (simulateRef.current) {
          const sp = simStateRef.current.position;
          onSimPositionChangeRef.current?.(sp);
        } else {
          onSimPositionChangeRef.current?.(null);
        }
        if (simulateNpcRef.current) {
          const np = npcStateRef.current.position;
          onNpcPositionChangeRef.current?.(np);
        } else {
          onNpcPositionChangeRef.current?.(null);
        }
      }

      // Smooth remote co-op peers toward network targets (avoids jumpy teleports).
      {
        const peerT = Math.min(1, dt * REMOTE_PEER_LERP);
        const folT = Math.min(1, dt * REMOTE_FOLLOWER_LERP);
        for (const sm of peerSmoothRef.current.values()) {
          sm.x += (sm.tx - sm.x) * peerT;
          sm.y += (sm.ty - sm.y) * peerT;
          const rad = ((sm.facingDeg - 90) * Math.PI) / 180;
          const ftx = sm.x - Math.cos(rad) * 36;
          const fty = sm.y - Math.sin(rad) * 36;
          sm.fx += (ftx - sm.fx) * folT;
          sm.fy += (fty - sm.fy) * folT;
          const el = peerElRef.current.get(sm.id);
          if (el) {
            el.style.transform = `translate(-50%, -50%) translate(${sm.x}px, ${sm.y}px)`;
            el.style.zIndex = String(explorationDepthZ(sm.y));
          }
          const fel = peerFollowerElRef.current.get(sm.id);
          if (fel) {
            fel.style.transform = `translate(-50%, -50%) translate(${sm.fx}px, ${sm.fy}px)`;
            fel.style.zIndex = String(explorationDepthZ(sm.fy));
          }
        }
      }

      if (simulateRef.current) {
        if (simInteractOpenRef.current) {
          // Stay put and keep looking at the local player while the menu is open.
          faceSimTowardLocal();
        } else {
          if (ts >= simRetargetAtRef.current) {
            const home = simHomeRef.current;
            const ang = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * SIM_WANDER_RADIUS_PX;
            simStateRef.current.target = clampToWorld(
              {
                x: home.x + Math.cos(ang) * dist,
                y: home.y + Math.sin(ang) * dist,
              },
              world,
            );
            simStateRef.current.steer = { x: 0, y: 0 };
            simRetargetAtRef.current = ts + SIM_RETARGET_MS + Math.random() * 1200;
          }

          const simPrev = simStateRef.current.position;
          simStateRef.current = stepMovement(
            simStateRef.current,
            world,
            zone.walkSpeedPxPerSec * SIM_SPEED_FACTOR,
            dt,
            blockersRef.current,
          );
          const simPos = simStateRef.current.position;
          const sdx = simPos.x - simPrev.x;
          const sdy = simPos.y - simPrev.y;
          const simMoved = Math.hypot(sdx, sdy) > 0.05;
          if (simMoved !== lastSimWalkingRef.current) {
            lastSimWalkingRef.current = simMoved;
            setSimWalking(simMoved);
          }
          if (simMoved) {
            const nextFacing = facingDegFromDirection(sdx, sdy);
            if (Math.abs(nextFacing - lastSimFacingRef.current) > 2) {
              lastSimFacingRef.current = nextFacing;
              setSimFacingDeg(nextFacing);
            }
          } else if (simStateRef.current.target) {
            const t = simStateRef.current.target;
            const dir = normalizeVec({ x: t.x - simPos.x, y: t.y - simPos.y });
            if (vecLength(dir) > 1e-4) {
              const nextFacing = facingDegFromDirection(dir.x, dir.y);
              if (Math.abs(nextFacing - lastSimFacingRef.current) > 2) {
                lastSimFacingRef.current = nextFacing;
                setSimFacingDeg(nextFacing);
              }
            }
          }
        }
      } else if (lastSimWalkingRef.current) {
        lastSimWalkingRef.current = false;
        setSimWalking(false);
      }

      if (simulateNpcRef.current) {
        if (npcInteractOpenRef.current) {
          faceNpcTowardLocal();
        } else if (!npcWanderEnabledRef.current) {
          npcStateRef.current.target = null;
          npcStateRef.current.steer = { x: 0, y: 0 };
          if (lastNpcWalkingRef.current) {
            lastNpcWalkingRef.current = false;
            setNpcWalking(false);
          }
          const idleFace = npcIdleFacingRef.current;
          if (Math.abs(idleFace - lastNpcFacingRef.current) > 0.5) {
            lastNpcFacingRef.current = idleFace;
            setNpcFacingDeg(idleFace);
          }
        } else if (ts >= npcRetargetAtRef.current) {
          const home = npcHomeRef.current;
          const radius = Math.max(0, npcWanderDistanceRef.current);
          if (radius <= 0.5) {
            npcStateRef.current.target = null;
            npcStateRef.current.steer = { x: 0, y: 0 };
            npcRetargetAtRef.current = ts + SIM_RETARGET_MS;
            const idleFace = npcIdleFacingRef.current;
            if (Math.abs(idleFace - lastNpcFacingRef.current) > 0.5) {
              lastNpcFacingRef.current = idleFace;
              setNpcFacingDeg(idleFace);
            }
          } else {
            const ang = Math.random() * Math.PI * 2;
            const dist = Math.min(radius, 12 + Math.random() * radius);
            npcStateRef.current.target = clampToWorld(
              {
                x: home.x + Math.cos(ang) * dist,
                y: home.y + Math.sin(ang) * dist,
              },
              world,
            );
            npcStateRef.current.steer = { x: 0, y: 0 };
            npcRetargetAtRef.current = ts + SIM_RETARGET_MS + 400 + Math.random() * 1600;
          }
        }

        if (!npcInteractOpenRef.current && npcWanderEnabledRef.current) {
          const npcPrev = npcStateRef.current.position;
          npcStateRef.current = stepMovement(
            npcStateRef.current,
            world,
            zone.walkSpeedPxPerSec * NPC_SPEED_FACTOR,
            dt,
            blockersRef.current,
          );
          const npcPos = npcStateRef.current.position;
          const ndx = npcPos.x - npcPrev.x;
          const ndy = npcPos.y - npcPrev.y;
          const npcMoved = Math.hypot(ndx, ndy) > 0.05;
          if (npcMoved !== lastNpcWalkingRef.current) {
            lastNpcWalkingRef.current = npcMoved;
            setNpcWalking(npcMoved);
          }
          if (npcMoved) {
            const nextFacing = facingDegFromDirection(ndx, ndy);
            if (Math.abs(nextFacing - lastNpcFacingRef.current) > 2) {
              lastNpcFacingRef.current = nextFacing;
              setNpcFacingDeg(nextFacing);
            }
          } else if (npcStateRef.current.target) {
            const t = npcStateRef.current.target;
            const dir = normalizeVec({ x: t.x - npcPos.x, y: t.y - npcPos.y });
            if (vecLength(dir) > 1e-4) {
              const nextFacing = facingDegFromDirection(dir.x, dir.y);
              if (Math.abs(nextFacing - lastNpcFacingRef.current) > 2) {
                lastNpcFacingRef.current = nextFacing;
                setNpcFacingDeg(nextFacing);
              }
            }
          } else {
            const idleFace = npcIdleFacingRef.current;
            if (Math.abs(idleFace - lastNpcFacingRef.current) > 0.5) {
              lastNpcFacingRef.current = idleFace;
              setNpcFacingDeg(idleFace);
            }
          }
        }
      } else if (lastNpcWalkingRef.current) {
        lastNpcWalkingRef.current = false;
        setNpcWalking(false);
      }

      applyDom();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
    };
  }, [
    zone.id,
    zone.walkSpeedPxPerSec,
    zone.worldWidthPx,
    zone.worldHeightPx,
    world,
    applyDom,
    tryFirePendingInteract,
    tryFirePendingSimInteract,
    tryFirePendingNpcInteract,
    faceSimTowardLocal,
    faceNpcTowardLocal,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isTypingElement(e.target)) return;
        applySelection(null);
        applyDom();
        return;
      }
      if (e.key === "Shift") {
        if (isTypingElement(e.target)) return;
        runHeldRef.current = true;
        return;
      }
      const k = e.key;
      if (k === "r" || k === "R") {
        if (e.repeat) return;
        if (isTypingElement(e.target)) return;
        const mount = currentRideable();
        if (!mount?.canRide) return;
        e.preventDefault();
        const next = !mountedRef.current;
        // Block remount inside a dismount zone.
        if (next) {
          const pos = stateRef.current.position;
          for (const el of dismountZonesRef.current) {
            if (
              pointInElementRect(pos.x, pos.y, el, zone.worldWidthPx, zone.worldHeightPx)
            ) {
              return;
            }
          }
        }
        mountedRef.current = next;
        onMountedChangeRef.current?.(next);
        return;
      }
      if (
        k === "ArrowUp" ||
        k === "ArrowDown" ||
        k === "ArrowLeft" ||
        k === "ArrowRight"
      ) {
        if (isTypingElement(e.target)) return;
        e.preventDefault();
        keysRef.current.add(k);
        recomputeSteer();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        runHeldRef.current = false;
        return;
      }
      keysRef.current.delete(e.key);
      recomputeSteer();
    };
    const onBlur = () => {
      keysRef.current.clear();
      runHeldRef.current = false;
      recomputeSteer();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [recomputeSteer, zone.worldWidthPx, zone.worldHeightPx, applySelection, applyDom]);

  useEffect(() => {
    applySelection(null);
  }, [zone.id, applySelection]);

  useEffect(() => {
    staminaRef.current = staminaSettings.max;
    staminaExhaustedRef.current = false;
  }, [zone.id, staminaSettings.max]);

  useEffect(() => {
    hydrationRef.current = hydrationMax;
    onHydrationChangeRef.current?.(hydrationRef.current, Math.max(1, hydrationMax));
  }, [zone.id]);

  useEffect(() => {
    hydrationRef.current = Math.min(hydrationRef.current, hydrationMax);
    onHydrationChangeRef.current?.(hydrationRef.current, Math.max(1, hydrationMax));
  }, [hydrationMax]);

  useEffect(() => {
    if (!hydrationInject || hydrationInject.nonce <= 0) return;
    const max = Math.max(1, hydrationMaxRef.current);
    hydrationRef.current = Math.min(max, hydrationRef.current + Math.max(0, hydrationInject.amount));
    onHydrationChangeRef.current?.(hydrationRef.current, max);
  }, [hydrationInject]);

  const onFacingChangeRef = useRef(onFacingChange);
  onFacingChangeRef.current = onFacingChange;

  useEffect(() => {
    mountedRef.current = mounted;
  }, [mounted]);

  function stageLocal(e: React.PointerEvent): { x: number; y: number } | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (pinchActiveRef.current) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const local = stageLocal(e);
    if (!local) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointerRef.current = {
      id: e.pointerId,
      startX: local.x,
      startY: local.y,
      steering: false,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (pinchActiveRef.current) return;
    const ptr = pointerRef.current;
    if (!ptr || ptr.id !== e.pointerId) return;
    const local = stageLocal(e);
    if (!local) return;
    const dx = local.x - ptr.startX;
    const dy = local.y - ptr.startY;
    if (!ptr.steering && Math.hypot(dx, dy) >= STEER_THRESHOLD_PX) {
      ptr.steering = true;
      stateRef.current.target = null;
      clearPendingInteract();
      onCancelGatherRef.current?.();
      onCancelTraceRef.current?.();
      applyDom();
    }
    if (ptr.steering) {
      dragSteerRef.current = normalizeVec({ x: dx, y: dy });
      recomputeSteer();
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const ptr = pointerRef.current;
    if (!ptr || ptr.id !== e.pointerId) return;
    const local = stageLocal(e);
    const wasSteering = ptr.steering;
    pointerRef.current = null;
    dragSteerRef.current = { x: 0, y: 0 };
    recomputeSteer();

    if (pinchActiveRef.current || wasSteering || !local) return;

    const stage = stageRef.current;
    if (!stage) return;
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    const worldPt = stagePointToWorld(
      local.x,
      local.y,
      stateRef.current.position,
      sw,
      sh,
      zoomRef.current,
    );

    const hitInteractable = [...interactablesRef.current]
      .reverse()
      .find((el) =>
        pointInElementRect(worldPt.x, worldPt.y, el, zone.worldWidthPx, zone.worldHeightPx),
      );

    /** Resolve which character (if any) was clicked — priority: companion → peer → sim → npc. */
    function hitCharacterSelection(): ExplorationSelection | null {
      const fol = followerCompanionRef.current;
      const ride = currentRideable();
      const followerHidden =
        Boolean(mountedRef.current && ride && fol && ride.id === fol.id);
      if (fol?.canFollow && !followerHidden) {
        const fp = followerPosRef.current;
        const half = fol.isWagon ? 50 : 44;
        if (
          worldPt.x >= fp.x - half &&
          worldPt.x <= fp.x + half &&
          worldPt.y >= fp.y - half &&
          worldPt.y <= fp.y + half
        ) {
          return { kind: "companion", id: fol.id };
        }
      }

      const half = AVATAR_DISPLAY_SIZE_PX * 0.45;
      const hitPeer = [...remotePeersRef.current].reverse().find((peer) => {
        const sm = peerSmoothRef.current.get(peer.id);
        const px = sm?.x ?? peer.x;
        const py = sm?.y ?? peer.y;
        return (
          worldPt.x >= px - half &&
          worldPt.x <= px + half &&
          worldPt.y >= py - half &&
          worldPt.y <= py + half
        );
      });
      if (hitPeer) return { kind: "peer", id: hitPeer.id };

      if (simulateRef.current && simAppearance) {
        const sim = simStateRef.current.position;
        if (
          worldPt.x >= sim.x - half &&
          worldPt.x <= sim.x + half &&
          worldPt.y >= sim.y - half &&
          worldPt.y <= sim.y + half
        ) {
          return { kind: "simPlayer", id: "sim-player" };
        }
      }

      if (simulateNpcRef.current && npcAppearance) {
        const npc = npcStateRef.current.position;
        if (
          worldPt.x >= npc.x - half &&
          worldPt.x <= npc.x + half &&
          worldPt.y >= npc.y - half &&
          worldPt.y <= npc.y + half
        ) {
          return { kind: "npc", id: "sim-npc" };
        }
      }

      // Future: hit-test attackable creatures → { kind: "creature", id }
      return null;
    }

    function walkThenActivateSelection(sel: ExplorationSelection) {
      if (sel.kind === "companion") {
        const fp = followerPosRef.current;
        const dist = Math.hypot(
          stateRef.current.position.x - fp.x,
          stateRef.current.position.y - fp.y,
        );
        if (dist <= INTERACT_ARRIVE_PX + 16) {
          clearPendingInteract();
          stateRef.current.target = null;
          onCompanionActivateRef.current?.();
          return;
        }
        pendingInteractRef.current = null;
        pendingSimInteractRef.current = false;
        pendingNpcInteractRef.current = false;
        pendingRemotePeerIdRef.current = null;
        pendingCompanionInteractRef.current = true;
        stateRef.current.target = clampToWorld(fp, world);
        return;
      }

      if (sel.kind === "peer") {
        const hitPeer = remotePeersRef.current.find((p) => p.id === sel.id);
        if (!hitPeer) return;
        const sm = peerSmoothRef.current.get(hitPeer.id);
        const px = sm?.x ?? hitPeer.x;
        const py = sm?.y ?? hitPeer.y;
        const dist = Math.hypot(
          stateRef.current.position.x - px,
          stateRef.current.position.y - py,
        );
        if (dist <= INTERACT_ARRIVE_PX + 12) {
          clearPendingInteract();
          stateRef.current.target = null;
          onRemotePeerActivateRef.current?.(hitPeer);
          return;
        }
        pendingInteractRef.current = null;
        pendingSimInteractRef.current = false;
        pendingNpcInteractRef.current = false;
        pendingCompanionInteractRef.current = false;
        pendingRemotePeerIdRef.current = hitPeer.id;
        const dx = px - stateRef.current.position.x;
        const dy = py - stateRef.current.position.y;
        const len = Math.hypot(dx, dy) || 1;
        const stopDist = Math.max(0, len - (INTERACT_ARRIVE_PX + 8));
        stateRef.current.target = clampToWorld(
          {
            x: stateRef.current.position.x + (dx / len) * stopDist,
            y: stateRef.current.position.y + (dy / len) * stopDist,
          },
          world,
        );
        return;
      }

      if (sel.kind === "simPlayer") {
        const sim = simStateRef.current.position;
        const dist = Math.hypot(
          stateRef.current.position.x - sim.x,
          stateRef.current.position.y - sim.y,
        );
        if (dist <= INTERACT_ARRIVE_PX + 12) {
          clearPendingInteract();
          stateRef.current.target = null;
          faceSimTowardLocal();
          onSimPlayerActivateRef.current?.();
          return;
        }
        pendingInteractRef.current = null;
        pendingNpcInteractRef.current = false;
        pendingCompanionInteractRef.current = false;
        pendingRemotePeerIdRef.current = null;
        pendingSimInteractRef.current = true;
        const dx = sim.x - stateRef.current.position.x;
        const dy = sim.y - stateRef.current.position.y;
        const len = Math.hypot(dx, dy) || 1;
        const stopDist = Math.max(0, len - (INTERACT_ARRIVE_PX + 8));
        stateRef.current.target = clampToWorld(
          {
            x: stateRef.current.position.x + (dx / len) * stopDist,
            y: stateRef.current.position.y + (dy / len) * stopDist,
          },
          world,
        );
        return;
      }

      if (sel.kind === "npc") {
        const npc = npcStateRef.current.position;
        const dist = Math.hypot(
          stateRef.current.position.x - npc.x,
          stateRef.current.position.y - npc.y,
        );
        if (dist <= INTERACT_ARRIVE_PX + 12) {
          clearPendingInteract();
          stateRef.current.target = null;
          faceNpcTowardLocal();
          onNpcActivateRef.current?.();
          return;
        }
        pendingInteractRef.current = null;
        pendingSimInteractRef.current = false;
        pendingCompanionInteractRef.current = false;
        pendingRemotePeerIdRef.current = null;
        pendingNpcInteractRef.current = true;
        const dx = npc.x - stateRef.current.position.x;
        const dy = npc.y - stateRef.current.position.y;
        const len = Math.hypot(dx, dy) || 1;
        const stopDist = Math.max(0, len - (INTERACT_ARRIVE_PX + 8));
        stateRef.current.target = clampToWorld(
          {
            x: stateRef.current.position.x + (dx / len) * stopDist,
            y: stateRef.current.position.y + (dy / len) * stopDist,
          },
          world,
        );
      }

      // sel.kind === "creature" — attack handled separately.
    }

    const charHit = hitCharacterSelection();
    if (charHit) {
      const key = selectionKey(charHit);
      const now = performance.now();
      const last = lastClickTargetRef.current;
      const isDouble = Boolean(last && last.key === key && now - last.at <= DOUBLE_CLICK_MS);
      lastClickTargetRef.current = { key, at: now };

      const alreadySelected =
        selectionRef.current != null && selectionKey(selectionRef.current) === key;

      // Attackables: first click selects; second click (or double-click) attacks (stub).
      if (charHit.kind === "creature") {
        if (alreadySelected || isDouble) {
          applySelection(charHit);
          // TODO: start attack on selected creature when combat exists.
          applyDom();
          return;
        }
        applySelection(charHit);
        applyDom();
        return;
      }

      applySelection(charHit);
      if (isDouble) {
        walkThenActivateSelection(charHit);
      }
      applyDom();
      return;
    }

    if (hitInteractable) {
      applySelection(null);
      // Already standing on it — interact now.
      if (
        nearInteractPoint(
          stateRef.current.position,
          hitInteractable,
          zone.worldWidthPx,
          zone.worldHeightPx,
        )
      ) {
        clearPendingInteract();
        stateRef.current.target = null;
        if (hitInteractable.kind === "TELEPORTER") {
          onTeleporterActivateRef.current?.(hitInteractable);
        } else if (hitInteractable.kind === "STABLE") {
          onStableActivateRef.current?.(hitInteractable);
        } else if (hitInteractable.kind === "STORE") {
          onStoreActivateRef.current?.(hitInteractable);
        } else if (hitInteractable.kind === "NPC") {
          onNpcPinActivateRef.current?.(hitInteractable);
        } else if (hitInteractable.kind === "HOME") {
          onHomeActivateRef.current?.(hitInteractable);
        } else if (hitInteractable.kind === "SIGN") {
          onSignActivateRef.current?.(hitInteractable);
        } else if (hitInteractable.kind === "FOUNTAIN") {
          onFountainActivateRef.current?.(hitInteractable);
        }
        applyDom();
        return;
      }

      // Walk to the interactable, then open on arrival.
      const center = homeInteractWorld(
        hitInteractable,
        zone.worldWidthPx,
        zone.worldHeightPx,
      );
      pendingInteractRef.current = hitInteractable;
      pendingSimInteractRef.current = false;
      pendingNpcInteractRef.current = false;
      pendingCompanionInteractRef.current = false;
      pendingRemotePeerIdRef.current = null;
      stateRef.current.target = clampToWorld(center, world);
      applyDom();
      return;
    }

    applySelection(null);
    clearPendingInteract();
    stateRef.current.target = clampToWorld(worldPt, world);
    onCancelGatherRef.current?.();
    onCancelTraceRef.current?.();
    applyDom();
  }

  const rideableCompanion = useMemo(
    () => resolveRideableCompanion(mountCompanion, followerCompanion),
    [mountCompanion, followerCompanion],
  );

  return (
    <div
      ref={stageRef}
      className={`relative size-full overflow-hidden touch-none select-none ${className}`.trim()}
      style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDragStart={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      role="application"
      aria-label={`${zone.name} exploration map`}
      tabIndex={0}
    >
      <div ref={worldRef} className="absolute left-0 top-0 will-change-transform">
        <ArcadeExplorationZoneBackground
          zone={zone}
          layer="GROUND"
          graphicsQuality={graphicsQuality}
        />
        {worldOverlay}

        {/* Play: only art/interactable images — editor colored pins stay in the map builder. */}
        {groundDecor.map((el) => {
          const rect = elementRectToWorldPx(el, zone.worldWidthPx, zone.worldHeightPx);
          if (!el.imageUrl && el.kind !== "SIGN") return null;
          return (
            <div
              key={el.id}
              className="pointer-events-none absolute"
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.w,
                height: rect.h,
                zIndex: el.kind === "ART" ? 2 : 3,
              }}
              title={el.label || el.nodeKind || el.kind}
            >
              {el.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={el.imageUrl}
                  alt=""
                  draggable={false}
                  className={`h-full w-full object-contain drop-shadow ${
                    el.shape === "circle" ? "rounded-full" : ""
                  }`}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-end">
                  <span className="rounded border-2 border-amber-800/80 bg-amber-100/95 px-1 py-0.5 text-center text-[9px] font-black uppercase text-amber-950 shadow">
                    {(el.label || "Sign").slice(0, 10)}
                  </span>
                  <span className="mt-0.5 h-3 w-1 rounded-sm bg-amber-900/80" aria-hidden />
                </div>
              )}
            </div>
          );
        })}

        {showBlockers
          ? blockers.map((b, i) =>
              b.shape === "polygon" && b.poly && b.poly.length >= 3 ? (
                <svg
                  key={`blocker-${i}`}
                  className="pointer-events-none absolute left-0 top-0"
                  width={zone.worldWidthPx}
                  height={zone.worldHeightPx}
                  style={{ zIndex: 4 }}
                >
                  <polygon
                    points={b.poly.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="rgba(239, 71, 111, 0.25)"
                    stroke="rgba(239, 71, 111, 0.8)"
                    strokeWidth={2}
                  />
                </svg>
              ) : (
                <div
                  key={`blocker-${i}`}
                  className={`pointer-events-none absolute border-2 border-coral/80 bg-coral/25 ${
                    b.shape === "circle" || b.shape === "ellipse" ? "rounded-full" : ""
                  }`}
                  style={{ left: b.x, top: b.y, width: b.w, height: b.h, zIndex: 4 }}
                />
              ),
            )
          : null}

        {ysortArt.map((el) => {
          const rect = elementRectToWorldPx(el, zone.worldWidthPx, zone.worldHeightPx);
          return (
            <div
              key={el.id}
              className="pointer-events-none absolute"
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.w,
                height: rect.h,
                zIndex: explorationDepthZ(rect.y + rect.h),
              }}
              title={el.label || "Art"}
            >
              {el.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={el.imageUrl}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-contain"
                />
              ) : null}
            </div>
          );
        })}

        {remotePeers.map((peer) => {
          if (!avatarCatalog) return null;
          const sm = peerSmoothRef.current.get(peer.id);
          const x = sm?.x ?? peer.x;
          const y = sm?.y ?? peer.y;
          const fx = sm?.fx ?? peer.x - 28;
          const fy = sm?.fy ?? peer.y + 18;
          const ride = resolveRideableCompanion(peer.mountCompanion ?? null, peer.followerCompanion ?? null);
          const fol = peer.followerCompanion;
          const hideFollower =
            Boolean(peer.mounted && ride && fol && ride.id === fol.id);
          return (
            <div key={peer.id}>
              <div
                ref={(el) => {
                  peerElRef.current.set(peer.id, el);
                }}
                className="pointer-events-none absolute left-0 top-0 will-change-transform"
                style={{
                  transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                  zIndex: explorationDepthZ(y),
                }}
                aria-hidden
              >
                <div className="relative flex flex-col items-center">
                  {peer.speech?.trim() ? (
                    <ArcadeExplorationSpeechBubble
                      text={peer.speech}
                      styleConfig={speechBubbleStyle}
                    />
                  ) : peer.typing ? (
                    <ArcadeExplorationSpeechBubble text="…" styleConfig={speechBubbleStyle} />
                  ) : null}
                  <ArcadeExplorationNameplate
                    name={peer.name}
                    kind="player"
                    styleConfig={nameplatePlayerStyle}
                    highlight={Boolean(peer.highlight || peer.isGm)}
                  />
                  {peer.mounted && ride?.canRide ? (
                    <div
                      className="relative"
                      style={{ width: 120, height: 108 }}
                    >
                      <div className="absolute bottom-0 left-1/2 z-0 -translate-x-1/2">
                        <ArcadeExplorationCompanionFigure
                          variantKey={ride.variantKey}
                          tintHex={ride.tintHex}
                          imageUrl={ride.imageUrl}
                          size={118}
                          facing={snapFacingCardinal(peer.facingDeg)}
                          asMount
                        />
                      </div>
                      <div
                        className="absolute left-1/2 z-[1] -translate-x-1/2"
                        style={{ bottom: MOUNTED_RIDER_BOTTOM_PX }}
                      >
                        <ArcadeExplorationAvatarPawn
                          appearance={peer.appearance}
                          hairStyle={peer.hairStyle}
                          avatarLoadout={peer.avatarLoadout}
                          facingDeg={peer.facingDeg}
                          walking={peer.walking}
                          size={MOUNTED_RIDER_SIZE_PX}
                          heldToolImageUrl={peer.heldToolImageUrl ?? ""}
                          heldToolImageSizePx={peer.heldToolImageSizePx ?? 20}
                          heldToolPose={peer.heldToolPose ?? null}
                          heldToolFx={peer.heldToolFx ?? null}
                          heldHand={peer.heldHand ?? "right"}
                          heldLightImageUrl={peer.heldLightImageUrl ?? ""}
                          heldLightImageSizePx={peer.heldLightImageSizePx ?? 20}
                          heldLightPose={peer.heldLightPose ?? null}
                          heldLightFx={peer.heldLightFx ?? null}
                          heldLightHand={peer.heldLightHand ?? "left"}
                          emote={peer.emote ?? null}
                          bodySettings={bodySettings}
                        />
                      </div>
                    </div>
                  ) : (
                    <ArcadeExplorationAvatarPawn
                      appearance={peer.appearance}
                      hairStyle={peer.hairStyle}
                      avatarLoadout={peer.avatarLoadout}
                      facingDeg={peer.facingDeg}
                      walking={peer.walking}
                      size={AVATAR_DISPLAY_SIZE_PX}
                      heldToolImageUrl={peer.heldToolImageUrl ?? ""}
                      heldToolImageSizePx={peer.heldToolImageSizePx ?? 20}
                      heldToolPose={peer.heldToolPose ?? null}
                      heldToolFx={peer.heldToolFx ?? null}
                      heldHand={peer.heldHand ?? "right"}
                      heldLightImageUrl={peer.heldLightImageUrl ?? ""}
                      heldLightImageSizePx={peer.heldLightImageSizePx ?? 20}
                      heldLightPose={peer.heldLightPose ?? null}
                      heldLightFx={peer.heldLightFx ?? null}
                      heldLightHand={peer.heldLightHand ?? "left"}
                      emote={peer.emote ?? null}
                      bodySettings={bodySettings}
                    />
                  )}
                </div>
              </div>
              {fol?.canFollow && !hideFollower ? (
                <div
                  ref={(el) => {
                    peerFollowerElRef.current.set(peer.id, el);
                  }}
                  className="pointer-events-none absolute left-0 top-0 will-change-transform"
                  style={{
                    transform: `translate(-50%, -50%) translate(${fx}px, ${fy}px)`,
                    zIndex: explorationDepthZ(fy),
                  }}
                  aria-hidden
                >
                  <ArcadeExplorationCompanionFigure
                    variantKey={fol.variantKey}
                    tintHex={fol.tintHex}
                    imageUrl={fol.imageUrl}
                    size={fol.isWagon ? 80 : 72}
                    facing={snapFacingCardinal(peer.facingDeg)}
                  />
                </div>
              ) : null}
            </div>
          );
        })}

        {logoutMarkers.map((m) => {
          const feetY = m.y + EXPLORATION_FEET_COLLISION_OFFSET_Y_PX;
          return (
            <div
              key={`logout-${m.id}`}
              className="group pointer-events-auto absolute left-0 top-0 z-[4]"
              style={{
                transform: `translate(-50%, -50%) translate(${m.x}px, ${feetY}px)`,
                zIndex: Math.max(1, explorationDepthZ(feetY) - 1),
              }}
              title={m.displayName}
            >
              <div className="relative flex flex-col items-center">
                <span className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white group-hover:block">
                  {m.displayName}
                </span>
                {logoutMarkerImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoutMarkerImageUrl}
                    alt={m.displayName}
                    draggable={false}
                    className="object-contain drop-shadow"
                    style={{
                      width: logoutMarkerImageSizePx,
                      height: logoutMarkerImageSizePx,
                    }}
                  />
                ) : (
                  <span
                    className="flex items-center justify-center rounded-full border-2 border-white/80 bg-zinc-700/90 text-[11px] font-black text-white shadow"
                    style={{
                      width: Math.max(24, Math.round(logoutMarkerImageSizePx * 0.9)),
                      height: Math.max(24, Math.round(logoutMarkerImageSizePx * 0.9)),
                    }}
                    aria-hidden
                  >
                    {m.displayName.slice(0, 1).toUpperCase() || "?"}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {simulateOtherPlayer && simAppearance && avatarCatalog ? (
          <div
            ref={simRef}
            className="pointer-events-none absolute left-0 top-0 will-change-transform"
            aria-hidden
          >
            <div className="relative flex flex-col items-center">
              {simSpeech ? (
                <ArcadeExplorationSpeechBubble text={simSpeech} styleConfig={speechBubbleStyle} />
              ) : null}
              <ArcadeExplorationNameplate
                name={simPlayerName}
                kind="player"
                styleConfig={nameplatePlayerStyle}
              />
              <ArcadeExplorationAvatarPawn
                appearance={simAppearance}
                hairStyle={simHairStyle}
                facingDeg={simFacingDeg}
                walking={simWalking}
                size={AVATAR_DISPLAY_SIZE_PX}
              
                          bodySettings={bodySettings}
                        />
            </div>
          </div>
        ) : null}

        {simulateOtherPlayer && (simFollowerCompanion ?? SIM_PLAYER_CAT_COMPANION).canFollow ? (
          <div
            ref={simFollowerRef}
            className="pointer-events-none absolute left-0 top-0 hidden will-change-transform"
            aria-hidden
          >
            <ArcadeExplorationCompanionFigure
              variantKey={(simFollowerCompanion ?? SIM_PLAYER_CAT_COMPANION).variantKey}
              tintHex={(simFollowerCompanion ?? SIM_PLAYER_CAT_COMPANION).tintHex}
              imageUrl={(simFollowerCompanion ?? SIM_PLAYER_CAT_COMPANION).imageUrl}
              size={72}
              facing={snapFacingCardinal(simFollowerFacingDeg)}
            />
          </div>
        ) : null}

        {simulateNpc && npcAppearance && avatarCatalog ? (
          <div
            ref={npcRef}
            className="pointer-events-none absolute left-0 top-0 will-change-transform"
            aria-hidden
          >
            <div className="relative flex flex-col items-center">
              <ArcadeExplorationNameplate
                name={npcName}
                kind="npc"
                styleConfig={nameplateNpcStyle}
              />
              <ArcadeExplorationAvatarPawn
                appearance={npcAppearance}
                hairStyle={npcHairStyle}
                avatarLoadout={npcAvatarLoadout}
                facingDeg={npcFacingDeg}
                walking={npcWalking}
                size={AVATAR_DISPLAY_SIZE_PX}
                bodySettings={bodySettings}
              />
            </div>
          </div>
        ) : null}

        <div
          ref={followerRef}
          className="pointer-events-none absolute left-0 top-0 hidden will-change-transform"
          aria-hidden
        >
          {followerCompanion?.canFollow ? (
            <ArcadeExplorationCompanionFigure
              variantKey={followerCompanion.variantKey}
              tintHex={followerCompanion.tintHex}
              imageUrl={followerCompanion.imageUrl}
              size={followerCompanion.isWagon ? 100 : 88}
              facing={snapFacingCardinal(followerFacingDeg)}
            />
          ) : null}
        </div>

        <div
          ref={charRef}
          className="pointer-events-none absolute left-0 top-0 will-change-transform"
          aria-hidden
        >
          {avatarAppearance && avatarCatalog ? (
            <div className="relative flex flex-col items-center">
              {localSpeech ? (
                <ArcadeExplorationSpeechBubble text={localSpeech} styleConfig={speechBubbleStyle} />
              ) : null}
              <ArcadeExplorationNameplate
                name={
                  localPlayerName.trim() && localPlayerName.trim().toLowerCase() !== "you"
                    ? localPlayerName.trim()
                    : "Player"
                }
                kind="player"
                styleConfig={nameplatePlayerStyle}
                highlight={localNameplateHighlight}
              />
              {teleportFlash ? (
                <span
                  className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-24 w-24 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-amber-300/70 blur-[2px]"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(253,224,71,0.9) 0%, rgba(251,191,36,0.4) 50%, transparent 72%)",
                  }}
                  aria-hidden
                />
              ) : null}
              {mounted && rideableCompanion?.canRide ? (
                <div
                  className="relative"
                  style={{ width: 120, height: 108 }}
                >
                  <div className="absolute bottom-0 left-1/2 z-0 -translate-x-1/2">
                    <ArcadeExplorationCompanionFigure
                      variantKey={rideableCompanion.variantKey}
                      tintHex={rideableCompanion.tintHex}
                      imageUrl={rideableCompanion.imageUrl}
                      size={118}
                      facing={snapFacingCardinal(facingDeg)}
                      asMount
                    />
                  </div>
                  <div
                    className="absolute left-1/2 z-[1] -translate-x-1/2"
                    style={{ bottom: MOUNTED_RIDER_BOTTOM_PX }}
                  >
                    <ArcadeExplorationAvatarPawn
                      appearance={avatarAppearance}
                      hairStyle={avatarHairStyle}
                      facingDeg={facingDeg}
                      walking={walking}
                      size={MOUNTED_RIDER_SIZE_PX}
                      avatarLoadout={avatarLoadout}
                      heldToolImageUrl={heldToolImageUrl}
                      heldToolImageSizePx={heldToolImageSizePx}
                      heldToolPose={heldToolPose}
                      heldToolFx={heldToolFx}
                      heldLightImageUrl={heldLightImageUrl}
                      heldLightImageSizePx={heldLightImageSizePx}
                      heldLightPose={heldLightPose}
                      heldLightFx={heldLightFx}
                      heldLightHand={heldLightHand}
                      heldHand={heldHand}
                      emote={localEmote}
                      toolChopNonce={toolChopNonce}
                      bodySettings={bodySettings}
                      waterVisual={playerWaterVisual}
                    />
                  </div>
                </div>
              ) : (
                <ArcadeExplorationAvatarPawn
                  appearance={avatarAppearance}
                  hairStyle={avatarHairStyle}
                  facingDeg={facingDeg}
                  walking={walking}
                  size={AVATAR_DISPLAY_SIZE_PX}
                  avatarLoadout={avatarLoadout}
                  heldToolImageUrl={heldToolImageUrl}
                  heldToolImageSizePx={heldToolImageSizePx}
                  heldToolPose={heldToolPose}
                  heldToolFx={heldToolFx}
                  heldLightImageUrl={heldLightImageUrl}
                  heldLightImageSizePx={heldLightImageSizePx}
                  heldLightPose={heldLightPose}
                  heldLightFx={heldLightFx}
                  heldLightHand={heldLightHand}
                  heldHand={heldHand}
                  emote={localEmote}
                  toolChopNonce={toolChopNonce}
                  bodySettings={bodySettings}
                  waterVisual={playerWaterVisual}
                />
              )}
            </div>
          ) : (
            <div className="relative flex h-10 w-10 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-palm/30 blur-[2px]" />
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-palm shadow-md">
                <span className="h-2 w-2 rounded-full bg-white/90" />
              </span>
            </div>
          )}
        </div>

        {/* Selection ring under targeted characters. */}
        <div
          ref={selectRingRef}
          className="pointer-events-none absolute left-0 top-0 z-[2] hidden will-change-transform"
          aria-hidden
          data-selection={selection ? selectionKey(selection) : undefined}
        >
          <div
            className="rounded-[50%] border-[3px] border-emerald-400 bg-emerald-400/30 shadow-[0_0_10px_rgba(52,211,153,0.55)]"
            style={{ width: SELECT_RING_W, height: SELECT_RING_H }}
          />
        </div>

        {/* Click-to-walk destination pin — shown while target is active. */}
        <div
          ref={walkPinRef}
          className="pointer-events-none absolute left-0 top-0 z-[6] hidden will-change-transform"
          aria-hidden
        >
          <div className="relative flex flex-col items-center">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-mango shadow-md">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            <span className="-mt-0.5 h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-mango drop-shadow" />
          </div>
        </div>

        {showOverheadLayer ? (
          <div
            className="pointer-events-none absolute left-0 top-0"
            style={{
              width: zone.worldWidthPx,
              height: zone.worldHeightPx,
              zIndex: EXPLORATION_OVERHEAD_LAYER_Z,
            }}
          >
            <ArcadeExplorationZoneBackground
              zone={zone}
              layer="OVERHEAD"
              graphicsQuality={graphicsQuality}
            />
          </div>
        ) : null}

        {overheadArt.map((el) => {
          const rect = elementRectToWorldPx(el, zone.worldWidthPx, zone.worldHeightPx);
          return (
            <div
              key={el.id}
              className="pointer-events-none absolute"
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.w,
                height: rect.h,
                zIndex: EXPLORATION_OVERHEAD_LAYER_Z + 1,
              }}
              title={el.label || "Canopy"}
            >
              {el.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={el.imageUrl}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-contain"
                />
              ) : null}
            </div>
          );
        })}

        {/* Night darkness + light cutouts — must pan/zoom with the world. */}
        {nightFilter}
      </div>

      {!zone.backgroundImageUrl && !zoneUsesMapTiles(zone) ? (
        <p className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded bg-black/50 px-3 py-1 text-center text-[11px] font-bold text-white">
          Upload a zone map in Zones admin — click / drag / arrows to move
        </p>
      ) : null}

      {/* Touch-friendly map zoom (pinch also works on the stage). */}
      <div
        className="pointer-events-auto absolute bottom-20 right-2 z-30 flex flex-col gap-1.5 [@media(pointer:fine)]:hidden"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-md border-2 border-white/40 bg-black/55 text-lg font-black text-white shadow-md active:bg-black/75 disabled:opacity-35"
          aria-label="Zoom in"
          disabled={zoomUi >= zoomMax - 0.001}
          onClick={() => applyZoom(zoomRef.current * 1.2)}
        >
          +
        </button>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-md border-2 border-white/40 bg-black/55 text-lg font-black text-white shadow-md active:bg-black/75 disabled:opacity-35"
          aria-label="Zoom out"
          disabled={zoomUi <= zoomMin + 0.001}
          onClick={() => applyZoom(zoomRef.current / 1.2)}
        >
          −
        </button>
      </div>
    </div>
  );
}
