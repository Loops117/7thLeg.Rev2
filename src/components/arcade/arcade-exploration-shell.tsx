"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArcadeStage, ArcadeStageViewport } from "@/components/arcade/arcade-stage";
import {
  ArcadeExplorationViewport,
  type ExplorationRemotePeer,
} from "@/components/arcade/arcade-exploration-viewport";
import { ArcadeExplorationTeleporterMenu } from "@/components/arcade/arcade-exploration-teleporter-menu";
import { ArcadeExplorationStableMenu } from "@/components/arcade/arcade-exploration-stable-menu";
import { ArcadeExplorationStoreMenu } from "@/components/arcade/arcade-exploration-store-menu";
import { ArcadeExplorationHomeMenu } from "@/components/arcade/arcade-exploration-home-menu";
import { ArcadeExplorationSignDialogue } from "@/components/arcade/arcade-exploration-sign-dialogue";
import { ArcadeExplorationCompanionMenu } from "@/components/arcade/arcade-exploration-companion-menu";
import { ArcadeExplorationSimPlayerMenu } from "@/components/arcade/arcade-exploration-sim-player-menu";
import { ArcadeExplorationNpcMenu } from "@/components/arcade/arcade-exploration-npc-menu";
import { ArcadeExplorationGatherLayer } from "@/components/arcade/arcade-exploration-gather-layer";
import { ArcadeExplorationFountainMenu } from "@/components/arcade/arcade-exploration-fountain-menu";
import {
  ArcadeExplorationNightFilter,
  type ExplorationShineLight,
} from "@/components/arcade/arcade-exploration-night-filter";
import { explorationHeldLightOrigin, isLightColorClear } from "@/lib/game-exploration-light-shared";
import { ArcadeExplorationChatPanel } from "@/components/arcade/arcade-exploration-chat-panel";
import { ArcadeExplorationActivityLogPanel } from "@/components/arcade/arcade-exploration-activity-log-panel";
import type {
  ExplorationMapMarker,
  ExplorationPartyChatMessageView,
  ExplorationPartyView,
} from "@/lib/game-exploration-party-shared";
import {
  appendActivityLogLines,
  makeActivityLogLine,
  partyActivityLogLines,
  type ExplorationActivityLogLine,
} from "@/lib/game-exploration-activity-log";
import { ArcadeExplorationBagPanel } from "@/components/arcade/arcade-exploration-bag-panel";
import { EXPL_TOOL_DRAG_MIME } from "@/components/arcade/arcade-exploration-tools-panel";
import { ArcadeExplorationActionMenu } from "@/components/arcade/arcade-exploration-action-menu";
import { ArcadeExplorationMenuPanel } from "@/components/arcade/arcade-exploration-menu-panel";
import { ArcadeExplorationHudPortrait } from "@/components/arcade/arcade-exploration-hud-portrait";
import { ArcadeExplorationCompanionCargoPanel } from "@/components/arcade/arcade-exploration-companion-cargo-panel";
import { ArcadeExplorationFullMapModal } from "@/components/arcade/arcade-exploration-full-map-modal";
import { ArcadeExplorationMapFace } from "@/components/arcade/arcade-exploration-map-face";
import { arcadeStageBackgroundClass, arcadeStageMobileFillClass } from "@/lib/arcade-stage";
import { resolveDayNight } from "@/lib/game-exploration-day-night-shared";
import {
  computeArcadeHudClock,
  type ArcadeHudClockConfig,
} from "@/lib/game-hud-clock";
import type { ExplorationCompanionCargoSlot, ExplorationCompanionView } from "@/lib/game-exploration-companions-shared";
import {
  resolveRideableCompanion,
  SIM_PLAYER_CAT_COMPANION,
} from "@/lib/game-exploration-companions-shared";
import type { ExplorationStableListingView } from "@/lib/game-exploration-stable-shared";
import { formatStablePriceCents } from "@/lib/game-exploration-stable-shared";
import type { ExplorationStoreListingView } from "@/lib/game-exploration-store-shared";
import { addStorePurchaseToBag } from "@/lib/game-exploration-store-shared";
import {
  addNpcOfferToBag,
  type ExplorationNpcCompanionOfferView,
  type ExplorationNpcOfferView,
  type ExplorationNpcRole,
  type ExplorationNpcView,
} from "@/lib/game-exploration-npc-shared";
import type { Vec2 } from "@/lib/game-exploration-movement";
import { blockersFromZoneElements } from "@/lib/game-exploration-movement";
import { isWaypointOnMinimap, minimapRimArrowStyle } from "@/lib/game-exploration-minimap";
import { homeCenterWorld, homeDoorSpawnWorld } from "@/lib/game-exploration-housing-geom";
import {
  megaPxToZoneLocal,
  zoneLocalToMegaPx,
  type ExplorationMegaMapView,
} from "@/lib/game-exploration-mega-map-shared";
import type {
  ExplorationMenuActionId,
  ExplorationMenuView,
} from "@/lib/game-exploration-menu-shared";
import type {
  ExplorationHomeBoardRow,
  ExplorationHomeLeaseView,
} from "@/lib/game-exploration-housing-shared";
import { getOrCreateCoopGuestId, type CoopPresenceActivity } from "@/lib/game-exploration-coop-shared";
import type {
  ExplorationActionId,
  ExplorationHotbarEntry,
  ExplorationHotbarLoadout,
  ExplorationOverlayHotspotView,
  ExplorationOverlaySectionView,
  ExplorationOverlayView,
  ExplorationPawnEmote,
  ExplorationTeleporterDestination,
  ExplorationZoneElementView,
  ExplorationZoneView,
} from "@/lib/game-exploration-shared";
import {
  DEFAULT_CHAT_CONFIG,
  DEFAULT_MINIMAP_CONFIG,
  DEFAULT_OVERLAY_PIN_CHROME,
  DEFAULT_OVERLAY_PIN_SHAPE,
  EXPL_ACTION_DRAG_MIME,
  EXPL_WATER_DRAG_MIME,
  EXPLORATION_ACTION_MENU_ITEMS,
  EXPLORATION_MIDDLE_CLICK_SLOT,
  explorationActionAltActive,
  hexToRgba,
  HYDRATION_EMPTY_WARNING,
  isExplorationActionId,
  overlayPinFrameStyle,
  overlayPinShapeStyle,
  overlayPinTextAlignStyles,
  resolveExplorationActionIcon,
  resolveExplorationActionLabel,
  resolveRegionAtWorldPos,
} from "@/lib/game-exploration-shared";
import { useExplorationAudioPlayer } from "@/components/arcade/arcade-exploration-audio";
import {
  ArcadeExplorationEscapeMenu,
  ArcadeExplorationEscapeSettings,
} from "@/components/arcade/arcade-exploration-escape-menu";
import {
  DEFAULT_AUDIO_SETTINGS,
  DEFAULT_EXPLORATION_GENERAL_SETTINGS,
  waterFillWeight,
  type ExplorationAudioSettings,
  type ExplorationGeneralSettings,
} from "@/lib/game-exploration-settings-shared";
import { explorationProgressFromTotalXp } from "@/lib/game-exploration-experience-shared";
import type {
  ExplorationBagStack,
  ExplorationOwnedTool,
  ExplorationToolView,
} from "@/lib/game-exploration-tools-shared";
import {
  buildStarterOwnedTools,
  collectToolImageUrls,
  explorationIconFitClass,
  explorationToolIconUrl,
  gatherStandOffPoint,
  ownedToolsCarryWeight,
  toolWorkInRangePx,
} from "@/lib/game-exploration-tools-shared";
import { preloadExplorationImages } from "@/lib/exploration-image-preload";
import type {
  ExplorationClothingView,
  ExplorationEquipSlot,
  ExplorationEquipmentLoadout,
  ExplorationInvDragPayload,
  ExplorationOwnedClothing,
} from "@/lib/game-exploration-equipment-shared";
import { EXPL_INV_DRAG_MIME } from "@/lib/game-exploration-equipment-shared";
import { isGmClothingId } from "@/lib/game-exploration-gm-shared";
import {
  equipInventoryItem,
  equipToolOntoLoadout,
  equippedGatherToolIdFromLoadout,
  equippedLightToolIdFromLoadout,
  equippedToolIdFromLoadout,
  heldHandFromLoadout,
  mergeEquipmentIntoAvatarLoadout,
  unequipToolFromLoadout,
} from "@/lib/game-exploration-equipment";
import type { ExplorationCollectAreaView, ExplorationFleeingBug } from "@/lib/game-exploration-gather-shared";
import { serializeRoamAreasForRealtime } from "@/lib/game-exploration-realtime-client";
import { resolvePlayerWaterState } from "@/lib/game-exploration-gather-shared";
import type { ExplorationWorldNode } from "@/lib/game-exploration-gather-shared";
import type {
  ExplorationBugContainerView,
  ExplorationBugView,
} from "@/lib/game-exploration-bugs-shared";
import {
  buildStarterContainerStacks,
  placeBugInContainer,
} from "@/lib/game-exploration-bug-bag";
import {
  clampHudScalePct,
  loadHudScalePct,
  parseHudAnchor,
  saveHudScalePct,
  scaleHudSectionBox,
} from "@/lib/game-exploration-hud-scale";
import {
  loadGraphicsQuality,
  saveGraphicsQuality,
  type ExplorationGraphicsQuality,
} from "@/lib/game-exploration-graphics-prefs";
import {
  loadAudioBrowserPrefs,
  saveAudioBrowserPrefs,
} from "@/lib/game-exploration-audio-prefs";
import type {
  ExplorationAvatarAppearance,
  ExplorationAvatarCatalogView,
  ExplorationAvatarHairStyleView,
} from "@/lib/game-exploration-avatar-shared";
import { resolveAvatarLoadout } from "@/lib/game-exploration-avatar-shared";
import { btnSecondarySm } from "@/lib/btn-theme-classes";
import {
  registerExplHudDropHandler,
  setExplHudDragArmed,
} from "@/lib/expl-hud-drag";
import {
  buildStarterOwnedWaterContainers,
  DEFAULT_WATER_CONTAINER_CAPACITY,
  explorationWaterIconUrl,
  type ExplorationOwnedWaterContainer,
  type ExplorationWaterContainerView,
} from "@/lib/game-exploration-water-shared";

const WAYPOINT_ARRIVE_PX = 48;
const DEFAULT_CHAT_LAYOUT = { leftPct: 2, topPct: 55, widthPct: 36, heightPct: 42 };
const DEFAULT_ACTIVITY_LOG_LAYOUT = { leftPct: 64, topPct: 55, widthPct: 34, heightPct: 42 };

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

function findOverlayHotspot(
  overlay: ExplorationOverlayView | null | undefined,
  kind: ExplorationOverlayHotspotView["kind"],
): { hotspot: ExplorationOverlayHotspotView; section: ExplorationOverlaySectionView | null } | null {
  if (!overlay) return null;
  const legacy = overlay.hotspots.find((h) => h.kind === kind);
  if (legacy) return { hotspot: legacy, section: null };
  for (const section of overlay.sections ?? []) {
    const hit = section.hotspots.find((h) => h.kind === kind);
    if (hit) return { hotspot: hit, section };
  }
  return null;
}

function overlayHasHotspotKind(
  overlay: ExplorationOverlayView | null | undefined,
  kind: ExplorationOverlayHotspotView["kind"],
): boolean {
  return Boolean(findOverlayHotspot(overlay, kind));
}

/** Stage-% box for a pin, optionally nested in a scaled HUD section. */
function stagePinBoxPct(
  hotspot: ExplorationOverlayHotspotView,
  section: ExplorationOverlaySectionView | null,
  hudScalePct: number,
): { leftPct: number; topPct: number; widthPct: number; heightPct: number } {
  if (!section) {
    return {
      leftPct: hotspot.leftPct,
      topPct: hotspot.topPct,
      widthPct: hotspot.widthPct,
      heightPct: hotspot.heightPct,
    };
  }
  const scaled = scaleHudSectionBox(
    {
      leftPct: section.leftPct,
      topPct: section.topPct,
      widthPct: section.widthPct,
      heightPct: section.heightPct,
    },
    parseHudAnchor(section.anchor),
    hudScalePct,
  );
  return {
    leftPct: scaled.leftPct + (hotspot.leftPct / 100) * scaled.widthPct,
    topPct: scaled.topPct + (hotspot.topPct / 100) * scaled.heightPct,
    widthPct: (hotspot.widthPct / 100) * scaled.widthPct,
    heightPct: (hotspot.heightPct / 100) * scaled.heightPct,
  };
}

type Props = {
  zone: ExplorationZoneView;
  overlay: ExplorationOverlayView | null;
  onExit?: () => void;
  /** Called when player picks a teleporter destination. */
  onTeleport?: (destination: ExplorationTeleporterDestination) => void;
  /** Map of zone id → display name for destination labels. */
  zoneNameById?: Record<string, string>;
  /** Taller preview when embedded in admin. */
  className?: string;
  viewportClassName?: string;
  fill?: boolean;
  /** Fill parent without 16:10 letterbox (fullscreen playtest). */
  mobileFill?: boolean;
  avatarAppearance?: ExplorationAvatarAppearance | null;
  avatarHairStyle?: ExplorationAvatarHairStyleView | null;
  avatarCatalog?: ExplorationAvatarCatalogView | null;
  /** Local display name (chat + nameplate). */
  localPlayerName?: string;
  /** Live co-op peers in the current zone. */
  remotePeers?: ExplorationRemotePeer[];
  /** Throttled local pose for co-op sync. */
  onPoseChange?: (pose: {
    x: number;
    y: number;
    facingDeg: number;
    walking: boolean;
    mounted?: boolean;
  }) => void;
  /** Live weapon / emote / speech / typing for co-op presence. */
  onActivityChange?: (activity: CoopPresenceActivity) => void;
  simulateOtherPlayer?: boolean;
  simAppearance?: ExplorationAvatarAppearance | null;
  simHairStyle?: ExplorationAvatarHairStyleView | null;
  simPlayerName?: string;
  simulateNpc?: boolean;
  npcAppearance?: ExplorationAvatarAppearance | null;
  npcHairStyle?: ExplorationAvatarHairStyleView | null;
  npcName?: string;
  npcNotes?: string;
  npcRole?: ExplorationNpcRole;
  npcOfferItems?: ExplorationNpcOfferView[];
  npcOfferCompanions?: ExplorationNpcCompanionOfferView[];
  npcWanderEnabled?: boolean;
  npcWanderDistancePx?: number;
  npcIdleFacingDeg?: number;
  /** Full NPC catalog for resolving map pins. */
  npcs?: ExplorationNpcView[];
  onBuyNpcOffer?: (offer: ExplorationNpcOfferView) => void;
  onBuyNpcCompanionOffer?: (offer: ExplorationNpcCompanionOfferView) => void;
  onTakeNpcGift?: (offer: ExplorationNpcOfferView) => void;
  /** Zoom + speech bubble options from Exploration → Settings. */
  generalSettings?: ExplorationGeneralSettings;
  /** Shared arcade day clock for day/night gather filtering. */
  hudClock?: ArcadeHudClockConfig | null;
  /** Trail follower (dog / cat / wagon / wolf). */
  followerCompanion?: ExplorationCompanionView | null;
  /** Rideable mount. */
  mountCompanion?: ExplorationCompanionView | null;
  /** Stable shop catalog (Exploration → Stable). */
  stableListings?: ExplorationStableListingView[];
  /** Item store catalog (Exploration → Store). */
  storeListings?: ExplorationStoreListingView[];
  /** Playtest / session coins (cents). */
  playtestCoinsCents?: number;
  /** Companion ids already owned this session. */
  ownedCompanionIds?: string[];
  companionNicknames?: Record<string, string>;
  activeFollowerId?: string;
  activeMountId?: string;
  onBuyStableListing?: (listing: ExplorationStableListingView) => void;
  onBuyStoreListing?: (listing: ExplorationStoreListingView) => void;
  onEquipStableCompanion?: (
    listing: ExplorationStableListingView,
    role: "follower" | "mount",
  ) => void;
  onUnequipStableCompanion?: (role: "follower" | "mount") => void;
  onRenameCompanion?: (companionId: string, name: string) => void;
  /** Playtest exploration bag stacks (for cargo transfers). */
  bagStacks?: ExplorationBagStack[];
  onBagStacksChange?: (stacks: ExplorationBagStack[]) => void;
  /** Gathering tools catalog. */
  tools?: ExplorationToolView[];
  equippedToolId?: string;
  onEquipTool?: (toolId: string) => void;
  onUnequipTool?: () => void;
  /** Owned tool instances (durability). Defaults to givenByDefault tools only. */
  ownedTools?: ExplorationOwnedTool[];
  onOwnedToolsChange?: (next: ExplorationOwnedTool[]) => void;
  /** Water container catalog + owned instances for hydration sips / refills. */
  waterCatalog?: ExplorationWaterContainerView[];
  ownedWater?: ExplorationOwnedWaterContainer[];
  onOwnedWaterChange?: (next: ExplorationOwnedWaterContainer[]) => void;
  /** Clothing catalog + owned instances for inventory equipment. */
  clothing?: ExplorationClothingView[];
  ownedClothing?: ExplorationOwnedClothing[];
  onOwnedClothingChange?: (next: ExplorationOwnedClothing[]) => void;
  /** Initial worn loadout (e.g. shirt/pants/shoes from character creation). */
  initialEquipment?: ExplorationEquipmentLoadout | null;
  /** Persisted quick-bar layout (null/undefined = seed defaults when empty). */
  initialHotbar?: ExplorationHotbarLoadout | null;
  /** Fired when the player rearranges the quick bar. */
  onHotbarChange?: (slots: ExplorationHotbarLoadout) => void;
  /** Fired when worn equipment changes (for persistence). */
  onEquipmentChange?: (equipment: ExplorationEquipmentLoadout) => void;
  onAppearanceChange?: (next: ExplorationAvatarAppearance) => void;
  /** Collect spawn areas for the current zone. */
  collectAreas?: ExplorationCollectAreaView[];
  /** Active bug catalog (catch → container). */
  bugsCatalog?: ExplorationBugView[];
  /** Bug container types (starter jars + placement rules). */
  bugContainers?: ExplorationBugContainerView[];
  /** Party item sharing — disperse loot to in-range members. */
  partyItemSharing?: boolean;
  partyMemberIdsInRange?: string[];
  /** Guest ids in the local player's exploration party (map nametags). */
  partyMemberGuestIds?: string[];
  /** Invite a remote co-op peer to the party (Add to party). */
  onInviteToParty?: (peer: ExplorationRemotePeer) => void;
  /** Open party matching board. */
  onOpenPartyMatching?: () => void;
  /**
   * Embeddable party matching controls for custom menus (Party pin category).
   * The standalone party modal still opens via P / Open party.
   */
  partyMatching?: import("@/components/arcade/arcade-exploration-menu-embeds").ExplorationMenuPartyMatching | null;
  /** When set, shows a small party find-boost chip in the HUD. */
  partyFindBoostPct?: number | null;
  /** Current party id for $ party chat. */
  partyId?: string | null;
  /** Full party view for activity-log membership diffs. */
  party?: ExplorationPartyView | null;
  /** Synced party chat lines. */
  partyChatMessages?: ExplorationPartyChatMessageView[];
  /** Post a $ party chat line. */
  onPartySay?: (body: string) => void;
  /** Extra map markers from the parent (merged with peers / sims). */
  extraMapMarkers?: ExplorationMapMarker[];
  /** Playtest guest id for housing leases (defaults to localStorage guest). */
  housingGuestId?: string;
  /** Notify parent when rent / housing spends coins. */
  onPlaytestCoinsChange?: (cents: number) => void;
  /** Unequip when a companion is stored at home. */
  onUnequipCompanionId?: (companionId: string) => void;
  /** All zones (for home element lookup on mega map). */
  allZones?: ExplorationZoneView[];
  /** Mega map atlas layout (open map). */
  megaMap?: ExplorationMegaMapView | null;
  /** Custom menus from Exploration → Menus. */
  menus?: ExplorationMenuView[];
  /** Party members' presence in any zone (mega map pins). */
  partyPresence?: Array<{
    id: string;
    name: string;
    zoneId: string;
    x: number;
    y: number;
  }>;
  /** Guest id for all-chat sync. */
  chatGuestId?: string;
  /** Co-op online player count for the Escape menu. */
  onlineCount?: number;
  /** Leave the session (Escape menu → Log out). */
  onLogout?: () => void;
  /** Force spawn (logout reclaim) — wins over home door when set for this zone. */
  spawnOverride?: { x: number; y: number } | null;
  /** Other guests' logout leftovers in the current zone. */
  logoutMarkers?: Array<{ id: string; displayName: string; x: number; y: number }>;
  /** When true, ambient roam bugs come from dedicated realtime. */
  sharedBugsActive?: boolean;
  /** Authoritative ambient bugs from realtime. */
  sharedAmbientBugs?: ExplorationFleeingBug[];
  /** Seed / refresh the dedicated bug room for this zone. */
  onBugsSubscribe?: (seed: {
    zoneId: string;
    worldW: number;
    worldH: number;
    areas: unknown[];
    escapeMissesMin?: number;
    escapeMissesMax?: number;
    wrongToolChancePct?: number;
    isNight?: boolean;
  }) => void;
  /** Push day/night to the dedicated bug sim. */
  onBugsEnv?: (env: { isNight: boolean }) => void;
  /** Ask dedicated server to resolve an ambient catch. */
  onSharedCatchAttempt?: (payload: {
    bugId: string;
    toolKind: string;
    collectionChancePct: number;
    wrongToolChancePct: number;
    workDistancePx: number;
    x?: number;
    y?: number;
  }) => boolean;
  /** When true, slow HTTP world/chat polls (WS owns live fan-out). */
  realtimeTrafficCut?: boolean;
  worldNodePatch?: {
    zoneId: string;
    upserts?: import("@/lib/game-exploration-gather-shared").ExplorationWorldNode[];
    removes?: string[];
  } | null;
  worldNodePatchSeq?: number;
  onPublishWorldNodesPatch?: (patch: {
    zoneId: string;
    upserts?: import("@/lib/game-exploration-gather-shared").ExplorationWorldNode[];
    removes?: string[];
  }) => void;
  realtimeChatActive?: boolean;
  realtimeChatMessages?: import("@/lib/game-exploration-chat").ExplorationChatMessage[];
  onRealtimeChatSay?: (payload: {
    id?: string;
    channel: "all" | "zone";
    body: string;
    zoneName?: string;
    at?: number;
  }) => boolean;
  /** Admin GM: ignore walk blockers. */
  gmNoclip?: boolean;
  /** Admin GM: multiply walk speed (1 = normal). */
  gmFlySpeedMult?: number;
  /** Bump to flash teleport FX at local player. */
  teleportFxNonce?: number;
  /** When true, block unequipping GM clothing slots. */
  gmLockedEquipment?: boolean;
  /** Local GM flags (nameplate highlight on self). */
  gmFlags?: import("@/lib/game-exploration-gm-shared").ExplorationGmFlags | null;
};

export function ArcadeExplorationShell({
  zone,
  overlay,
  onExit,
  onTeleport,
  zoneNameById = {},
  className = "",
  viewportClassName = "",
  fill = false,
  mobileFill = false,
  avatarAppearance = null,
  avatarHairStyle = null,
  avatarCatalog = null,
  localPlayerName = "You",
  remotePeers = [],
  onPoseChange,
  onActivityChange,
  simulateOtherPlayer = false,
  simAppearance = null,
  simHairStyle = null,
  simPlayerName = "SimPlayer",
  simulateNpc = false,
  npcAppearance = null,
  npcHairStyle = null,
  npcName = "NPC",
  npcNotes = "",
  npcRole = "QUEST",
  npcOfferItems = [],
  npcOfferCompanions = [],
  npcWanderEnabled = true,
  npcWanderDistancePx = 187,
  npcIdleFacingDeg = 90,
  npcs = [],
  onBuyNpcOffer,
  onBuyNpcCompanionOffer,
  onTakeNpcGift,
  generalSettings = DEFAULT_EXPLORATION_GENERAL_SETTINGS,
  hudClock = null,
  followerCompanion = null,
  mountCompanion = null,
  stableListings = [],
  storeListings = [],
  playtestCoinsCents = 0,
  ownedCompanionIds = [],
  companionNicknames = {},
  activeFollowerId = "",
  activeMountId = "",
  onBuyStableListing,
  onBuyStoreListing,
  onEquipStableCompanion,
  onUnequipStableCompanion,
  onRenameCompanion,
  bagStacks: bagStacksProp,
  onBagStacksChange,
  tools = [],
  equippedToolId = "",
  onEquipTool,
  onUnequipTool,
  ownedTools: ownedToolsProp,
  onOwnedToolsChange,
  waterCatalog = [],
  ownedWater: ownedWaterProp,
  onOwnedWaterChange,
  clothing = [],
  ownedClothing: ownedClothingProp,
  onOwnedClothingChange,
  initialEquipment = null,
  initialHotbar = null,
  onHotbarChange,
  onEquipmentChange,
  onAppearanceChange,
  collectAreas = [],
  bugsCatalog = [],
  bugContainers = [],
  partyItemSharing = false,
  partyMemberIdsInRange = [],
  partyMemberGuestIds = [],
  onInviteToParty,
  onOpenPartyMatching,
  partyMatching = null,
  partyFindBoostPct = null,
  partyId = null,
  party = null,
  partyChatMessages = [],
  onPartySay,
  extraMapMarkers = [],
  housingGuestId,
  onPlaytestCoinsChange,
  onUnequipCompanionId,
  allZones = [],
  megaMap = null,
  menus = [],
  partyPresence = [],
  chatGuestId = "",
  onlineCount = 1,
  onLogout,
  spawnOverride: spawnOverrideProp = null,
  logoutMarkers = [],
  sharedBugsActive = false,
  sharedAmbientBugs = [],
  onBugsSubscribe,
  onBugsEnv,
  onSharedCatchAttempt,
  realtimeTrafficCut = false,
  worldNodePatch = null,
  worldNodePatchSeq = 0,
  onPublishWorldNodesPatch,
  realtimeChatActive = false,
  realtimeChatMessages = [],
  onRealtimeChatSay,
  gmNoclip = false,
  gmFlySpeedMult = 1,
  teleportFxNonce = 0,
  gmLockedEquipment = false,
  gmFlags = null,
}: Props) {
  const [activeTeleporter, setActiveTeleporter] = useState<ExplorationZoneElementView | null>(
    null,
  );
  const [activeStable, setActiveStable] = useState<ExplorationZoneElementView | null>(null);
  const [activeStore, setActiveStore] = useState<ExplorationZoneElementView | null>(null);
  const [activeHome, setActiveHome] = useState<ExplorationZoneElementView | null>(null);
  const [activeSign, setActiveSign] = useState<ExplorationZoneElementView | null>(null);
  const [homeLease, setHomeLease] = useState<ExplorationHomeLeaseView | null>(null);
  const [zoneHomes, setZoneHomes] = useState<ExplorationHomeBoardRow[]>([]);
  const [rentDueCents, setRentDueCents] = useState(0);
  const [guestId, setGuestId] = useState(housingGuestId ?? "");
  const [simMenuOpen, setSimMenuOpen] = useState(false);
  const [activeRemotePeer, setActiveRemotePeer] = useState<ExplorationRemotePeer | null>(null);
  const [traceTarget, setTraceTarget] = useState<
    { kind: "peer"; id: string } | { kind: "sim" } | null
  >(null);
  const [npcMenuOpen, setNpcMenuOpen] = useState(false);
  const [pinNpc, setPinNpc] = useState<ExplorationNpcView | null>(null);
  const [simBlocked, setSimBlocked] = useState(false);
  const [simPos, setSimPos] = useState<Vec2 | null>(null);
  const [npcPos, setNpcPos] = useState<Vec2 | null>(null);
  const [gatherMapMarkers, setGatherMapMarkers] = useState<ExplorationMapMarker[]>([]);
  const [chatFocusDm, setChatFocusDm] = useState<string | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [customMenuOpen, setCustomMenuOpen] = useState<ExplorationMenuView | null>(null);
  const [cargoOpen, setCargoOpen] = useState(false);
  const [companionMenuOpen, setCompanionMenuOpen] = useState(false);
  const [escapeMenuOpen, setEscapeMenuOpen] = useState(false);
  const [escapeSettingsOpen, setEscapeSettingsOpen] = useState(false);
  const [sessionAudio, setSessionAudio] = useState<ExplorationAudioSettings | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const [nightDarkness01, setNightDarkness01] = useState(0);
  const [playerFacingDeg, setPlayerFacingDeg] = useState(180);

  useEffect(() => {
    if (!hudClock) {
      setIsNight(false);
      setNightDarkness01(0);
      return;
    }
    let timeoutId = 0;
    let cancelled = false;
    const tick = () => {
      const snap = computeArcadeHudClock(hudClock);
      const dn = resolveDayNight(snap.dayProgressBps, generalSettings.dayNight);
      setIsNight(dn.isNight);
      setNightDarkness01(dn.darkness01);
    };
    const schedule = () => {
      if (cancelled) return;
      const force = generalSettings.dayNight.forceTimeOfDay;
      const transitioning =
        force != null &&
        force.transitionMs > 0 &&
        Date.now() - force.startedAtMs < force.transitionMs + 50;
      timeoutId = window.setTimeout(() => {
        tick();
        schedule();
      }, transitioning ? 50 : 1000);
    };
    tick();
    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [generalSettings.dayNight, hudClock]);
  const [localBag, setLocalBag] = useState<ExplorationBagStack[]>(() => {
    if (bagStacksProp && bagStacksProp.length > 0) return bagStacksProp;
    const starters = buildStarterContainerStacks(bugContainers);
    if (starters.length > 0) return starters;
    return bagStacksProp ?? [];
  });
  const [hudScalePct, setHudScalePct] = useState(100);
  const [graphicsQuality, setGraphicsQuality] =
    useState<ExplorationGraphicsQuality>("full");
  const [bugGlowLights, setBugGlowLights] = useState<ExplorationShineLight[]>([]);
  const [activityLogLines, setActivityLogLines] = useState<ExplorationActivityLogLine[]>([]);
  const partySnapshotRef = useRef<ExplorationPartyView | null>(null);
  const [cargoSlots, setCargoSlots] = useState<ExplorationCompanionCargoSlot[]>([]);
  /** Hotbar: slotIndex 0–9 → tool or action. */
  const [hotbarSlots, setHotbarSlots] = useState<ExplorationHotbarLoadout>(
    () => initialHotbar ?? {},
  );
  const hotbarPersistRef = useRef(onHotbarChange);
  hotbarPersistRef.current = onHotbarChange;
  const equipmentPersistRef = useRef(onEquipmentChange);
  equipmentPersistRef.current = onEquipmentChange;
  const [flashingToolSlot, setFlashingToolSlot] = useState<number | null>(null);
  const toolSlotFlashTimerRef = useRef<number | null>(null);
  /** Selected peer/sim for Trade / Trace from the action menu. */
  const [socialTarget, setSocialTarget] = useState<
    { kind: "peer"; id: string; name: string } | { kind: "sim"; name: string } | null
  >(null);
  const [localEmote, setLocalEmote] = useState<ExplorationPawnEmote | null>(null);
  const localEmoteTimerRef = useRef<number | null>(null);
  /** Walk = half speed; Run = normal (+ Shift sprint); Auto Run = always sprint. */
  const [moveGait, setMoveGait] = useState<"walk" | "run" | "autorun">("run");
  /** Last gather node the player targeted (for Attack action). */
  const selectedGatherNodeRef = useRef<ExplorationWorldNode | null>(null);
  const [ownedToolsLocal, setOwnedToolsLocal] = useState<ExplorationOwnedTool[]>([]);
  const [ownedWaterLocal, setOwnedWaterLocal] = useState<ExplorationOwnedWaterContainer[]>([]);
  const [ownedClothingLocal, setOwnedClothingLocal] = useState<ExplorationOwnedClothing[]>([]);
  const [equipment, setEquipment] = useState<ExplorationEquipmentLoadout>({});
  const [localAppearance, setLocalAppearance] = useState<ExplorationAvatarAppearance | null>(
    avatarAppearance,
  );
  const [holdNodeId, setHoldNodeId] = useState<string | null>(null);
  const [chaseBugId, setChaseBugId] = useState<string | null>(null);
  const [bugChaseCutNonce, setBugChaseCutNonce] = useState(0);
  const [pendingGather, setPendingGather] = useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);
  const [forceWalkTarget, setForceWalkTarget] = useState<{
    x: number;
    y: number;
    nonce: number;
  } | null>(null);
  const [localSpeech, setLocalSpeech] = useState<string | null>(null);
  const [simSpeech, setSimSpeech] = useState<string | null>(null);
  const localSpeechTimerRef = useRef<number | null>(null);
  const simSpeechTimerRef = useRef<number | null>(null);
  const [chatTyping, setChatTyping] = useState(false);
  const [localZoneChat, setLocalZoneChat] = useState<{ body: string; at: number } | null>(
    null,
  );
  const [remoteZoneMessages, setRemoteZoneMessages] = useState<
    Array<{ id: string; from: string; body: string; at: number }>
  >([]);
  const seenRemoteZoneChatRef = useRef<Map<string, number>>(new Map());
  const browserZoomRootRef = useRef<HTMLDivElement>(null);
  const [fullMapOpen, setFullMapOpen] = useState(false);
  const [liveMegaMap, setLiveMegaMap] = useState<ExplorationMegaMapView | null>(megaMap ?? null);
  const [megaMapLoading, setMegaMapLoading] = useState(false);
  const minimapBaseViewPct =
    findOverlayHotspot(overlay, "EXPL_MINIMAP")?.hotspot.minimap.viewPct ??
    DEFAULT_MINIMAP_CONFIG.viewPct;
  const [minimapViewPct, setMinimapViewPct] = useState(minimapBaseViewPct);

  useEffect(() => {
    setMinimapViewPct(minimapBaseViewPct);
  }, [minimapBaseViewPct]);

  useEffect(() => {
    setLiveMegaMap(megaMap ?? null);
  }, [megaMap]);

  useEffect(() => {
    if (!fullMapOpen) return;
    let cancelled = false;
    const hasAtlas =
      Boolean(liveMegaMap && liveMegaMap.placements.length > 0 && liveMegaMap.widthPx > 0);
    // Keep showing the current atlas while refreshing so open stays snappy.
    if (!hasAtlas) setMegaMapLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/arcade/playtest/mega-map", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { megaMap?: ExplorationMegaMapView };
        if (!cancelled && data.megaMap) setLiveMegaMap(data.megaMap);
      } catch {
        /* keep prop / previous */
      } finally {
        if (!cancelled) setMegaMapLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Refresh each time the map opens (picks up admin edits + fixed tile payloads).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only on open
  }, [fullMapOpen]);
  const [playerPos, setPlayerPos] = useState<Vec2 | null>(null);
  const [waypoint, setWaypoint] = useState<Vec2 | null>(null);
  const activeRegion = useMemo(() => {
    if (!playerPos) return null;
    return resolveRegionAtWorldPos(
      playerPos.x,
      playerPos.y,
      zone.elements,
      zone.worldWidthPx,
      zone.worldHeightPx,
    );
  }, [playerPos, zone.elements, zone.worldWidthPx, zone.worldHeightPx]);
  const activeRegionName = activeRegion?.label ?? "";
  const activeRegionElement = useMemo(() => {
    if (!activeRegion) return null;
    return (
      zone.elements.find((el) => el.id === activeRegion.id && el.kind === "REGION") ?? null
    );
  }, [activeRegion, zone.elements]);
  const [staminaHud, setStaminaHud] = useState({
    value: 30,
    max: 30,
    running: false,
  });
  const [totalXp, setTotalXp] = useState(0);
  const [weightPoints, setWeightPoints] = useState(3);
  const [staminaPoints, setStaminaPoints] = useState(3);
  const [hydrationPoints, setHydrationPoints] = useState(3);
  const [unspentStatPoints, setUnspentStatPoints] = useState(0);
  const xpProgress = useMemo(
    () => explorationProgressFromTotalXp(totalXp, generalSettings.leveling),
    [totalXp, generalSettings.leveling],
  );
  const prevXpLevelRef = useRef(xpProgress.level);
  const carryMax = weightPoints * 10;
  const staminaMax = staminaPoints * 10;
  const hydrationMax = hydrationPoints * 10;
  const [hydrationHud, setHydrationHud] = useState({
    value: hydrationMax,
    max: hydrationMax,
  });
  const [hydrationInject, setHydrationInject] = useState<{ amount: number; nonce: number } | null>(
    null,
  );
  const [activeFountain, setActiveFountain] = useState<ExplorationZoneElementView | null>(null);
  const staminaSettings = useMemo(
    () => ({ ...generalSettings.stamina, max: staminaMax }),
    [generalSettings.stamina, staminaMax],
  );

  useEffect(() => {
    const prev = prevXpLevelRef.current;
    const next = xpProgress.level;
    if (next > prev) {
      setUnspentStatPoints((u) => u + (next - prev));
    }
    prevXpLevelRef.current = next;
  }, [xpProgress.level]);

  function spendWeightStat() {
    setUnspentStatPoints((u) => {
      if (u <= 0) return u;
      setWeightPoints((w) => w + 1);
      return u - 1;
    });
  }

  function spendStaminaStat() {
    setUnspentStatPoints((u) => {
      if (u <= 0) return u;
      setStaminaPoints((s) => s + 1);
      return u - 1;
    });
  }

  function spendHydrationStat() {
    setUnspentStatPoints((u) => {
      if (u <= 0) return u;
      setHydrationPoints((h) => h + 1);
      return u - 1;
    });
  }

  const staminaMaxRef = useRef(staminaMax);
  staminaMaxRef.current = staminaMax;
  const hydrationMaxRef = useRef(hydrationMax);
  hydrationMaxRef.current = hydrationMax;

  useEffect(() => {
    setActiveTeleporter(null);
    setActiveStable(null);
    setActiveStore(null);
    setActiveHome(null);
    setPinNpc(null);
    setNpcMenuOpen(false);
    setMounted(false);
    setCargoOpen(false);
    setCompanionMenuOpen(false);
    setSimMenuOpen(false);
    setActiveRemotePeer(null);
    setSocialTarget(null);
    setTraceTarget(null);
    setLocalEmote(null);
    setNpcMenuOpen(false);
    setChatFocusDm(null);
    setBagOpen(false);
    setBagOpen(false);
    setLocalSpeech(null);
    setSimSpeech(null);
    setFullMapOpen(false);
    setPlayerPos(null);
    setWaypoint(null);
    setSimPos(null);
    setNpcPos(null);
    const max = staminaMaxRef.current;
    setStaminaHud({
      value: max,
      max,
      running: false,
    });
    const hydMax = hydrationMaxRef.current;
    setHydrationHud({ value: hydMax, max: hydMax });
    setActiveFountain(null);
    if (localSpeechTimerRef.current) window.clearTimeout(localSpeechTimerRef.current);
    if (simSpeechTimerRef.current) window.clearTimeout(simSpeechTimerRef.current);
  }, [zone.id]);

  useEffect(() => {
    setStaminaHud((h) => ({
      ...h,
      max: staminaMax,
      value: Math.min(h.value, staminaMax),
    }));
  }, [staminaMax]);

  useEffect(() => {
    setHydrationHud((h) => ({
      ...h,
      max: hydrationMax,
      value: Math.min(h.value, hydrationMax),
    }));
  }, [hydrationMax]);

  useEffect(() => {
    if (housingGuestId) {
      setGuestId(housingGuestId);
      return;
    }
    setGuestId(getOrCreateCoopGuestId());
  }, [housingGuestId]);

  const refreshHousing = useCallback(async () => {
    const id = guestId || housingGuestId;
    if (!id) return;
    try {
      const res = await fetch(
        `/api/arcade/playtest/housing?guestId=${encodeURIComponent(id)}&zoneId=${encodeURIComponent(zone.id)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        lease: ExplorationHomeLeaseView | null;
        homes: ExplorationHomeBoardRow[];
        rentDueCents?: number;
      };
      setHomeLease(data.lease ?? null);
      setZoneHomes(Array.isArray(data.homes) ? data.homes : []);
      setRentDueCents(typeof data.rentDueCents === "number" ? data.rentDueCents : 0);
    } catch {
      /* ignore */
    }
  }, [guestId, housingGuestId, zone.id]);

  useEffect(() => {
    void refreshHousing();
    const t = window.setInterval(() => void refreshHousing(), 12_000);
    return () => window.clearInterval(t);
  }, [refreshHousing]);

  /** Auto-collect rent when due and funds allow. */
  useEffect(() => {
    if (!guestId || rentDueCents <= 0) return;
    if (playtestCoinsCents < rentDueCents) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/arcade/playtest/housing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "payRent",
            guestId,
            displayName: localPlayerName,
          }),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { dueCents?: number; lease?: ExplorationHomeLeaseView };
        const due = typeof data.dueCents === "number" ? data.dueCents : rentDueCents;
        onPlaytestCoinsChange?.(Math.max(0, playtestCoinsCents - due));
        setRentDueCents(0);
        if (data.lease) setHomeLease(data.lease);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    guestId,
    rentDueCents,
    playtestCoinsCents,
    localPlayerName,
    onPlaytestCoinsChange,
  ]);

  const ownedHomeElement = useMemo(() => {
    if (!homeLease || homeLease.zoneId !== zone.id) return null;
    return zone.elements.find((el) => el.id === homeLease.elementId && el.kind === "HOME") ?? null;
  }, [homeLease, zone.elements, zone.id]);

  const homeSpawn = useMemo(() => {
    if (!ownedHomeElement) return null;
    return homeDoorSpawnWorld(
      ownedHomeElement,
      zone.worldWidthPx,
      zone.worldHeightPx,
    );
  }, [ownedHomeElement, zone.worldHeightPx, zone.worldWidthPx]);

  const resolvedSpawnOverride = spawnOverrideProp ?? homeSpawn;

  const homeWorldPos = useMemo(() => {
    if (!ownedHomeElement) return null;
    return homeCenterWorld(ownedHomeElement, zone.worldWidthPx, zone.worldHeightPx);
  }, [ownedHomeElement, zone.worldHeightPx, zone.worldWidthPx]);

  const partyIdSet = useMemo(() => new Set(partyMemberGuestIds), [partyMemberGuestIds]);

  const minimapMarkers = useMemo(() => {
    const markers: ExplorationMapMarker[] = [...extraMapMarkers, ...gatherMapMarkers];
    for (const el of zone.elements) {
      if (el.kind !== "MAP_LABEL") continue;
      const label = el.label.trim();
      if (!label) continue;
      markers.push({
        id: `map-label-${el.id}`,
        x: ((el.leftPct + el.widthPct / 2) / 100) * zone.worldWidthPx,
        y: ((el.topPct + el.heightPct / 2) / 100) * zone.worldHeightPx,
        kind: "label",
        label,
        labelSizePx: el.mapLabelSizePx || 12,
      });
    }
    for (const p of remotePeers) {
      const inParty = partyIdSet.has(p.id);
      markers.push({
        id: `peer-${p.id}`,
        x: p.x,
        y: p.y,
        kind: inParty ? "party" : "player",
        label: inParty ? p.name : undefined,
      });
    }
    if (simPos) {
      markers.push({
        id: "sim-player",
        x: simPos.x,
        y: simPos.y,
        kind: "player",
      });
    }
    if (npcPos) {
      markers.push({
        id: "sim-npc",
        x: npcPos.x,
        y: npcPos.y,
        kind: "npc",
      });
    }
    if (homeWorldPos) {
      markers.push({
        id: "owned-home",
        x: homeWorldPos.x,
        y: homeWorldPos.y,
        kind: "home",
        label: ownedHomeElement?.label || homeLease?.houseLabel || "Home",
      });
    }
    return markers;
  }, [
    extraMapMarkers,
    gatherMapMarkers,
    remotePeers,
    partyIdSet,
    simPos,
    npcPos,
    homeWorldPos,
    ownedHomeElement?.label,
    homeLease?.houseLabel,
    zone.elements,
    zone.worldWidthPx,
    zone.worldHeightPx,
  ]);

  /** Full map: party + owned home + map labels (you + waypoint are drawn separately). */
  const fullMapMarkers = useMemo(
    () =>
      minimapMarkers.filter(
        (m) => m.kind === "party" || m.kind === "home" || m.kind === "label",
      ),
    [minimapMarkers],
  );

  const megaAtlas = useMemo(() => {
    if (!liveMegaMap || liveMegaMap.placements.length === 0 || liveMegaMap.widthPx <= 0) {
      return null;
    }
    return liveMegaMap;
  }, [liveMegaMap]);

  const megaPlayerPos = useMemo(() => {
    if (!megaAtlas || !playerPos) return null;
    const placement = megaAtlas.placements.find((p) => p.zoneId === zone.id);
    if (!placement) return null;
    return zoneLocalToMegaPx(
      playerPos,
      placement,
      megaAtlas.bounds,
      megaAtlas.tileWidthPx,
      megaAtlas.tileHeightPx,
      zone.worldWidthPx,
      zone.worldHeightPx,
    );
  }, [megaAtlas, playerPos, zone.id, zone.worldWidthPx, zone.worldHeightPx]);

  const megaWaypoint = useMemo(() => {
    if (!megaAtlas || !waypoint) return null;
    const placement = megaAtlas.placements.find((p) => p.zoneId === zone.id);
    if (!placement) return null;
    return zoneLocalToMegaPx(
      waypoint,
      placement,
      megaAtlas.bounds,
      megaAtlas.tileWidthPx,
      megaAtlas.tileHeightPx,
      zone.worldWidthPx,
      zone.worldHeightPx,
    );
  }, [megaAtlas, waypoint, zone.id, zone.worldWidthPx, zone.worldHeightPx]);

  const megaFullMapMarkers = useMemo(() => {
    if (!megaAtlas) return fullMapMarkers;
    const markers: ExplorationMapMarker[] = [];

    for (const peer of partyPresence) {
      if (peer.id === guestId) continue;
      const placement = megaAtlas.placements.find((p) => p.zoneId === peer.zoneId);
      if (!placement) continue;
      const peerZone =
        allZones.find((z) => z.id === peer.zoneId) ??
        (zone.id === peer.zoneId ? zone : null);
      const pt = zoneLocalToMegaPx(
        { x: peer.x, y: peer.y },
        placement,
        megaAtlas.bounds,
        megaAtlas.tileWidthPx,
        megaAtlas.tileHeightPx,
        peerZone?.worldWidthPx ?? placement.cols * megaAtlas.tileWidthPx,
        peerZone?.worldHeightPx ?? placement.rows * megaAtlas.tileHeightPx,
      );
      markers.push({
        id: `party-mega-${peer.id}`,
        x: pt.x,
        y: pt.y,
        kind: "party",
        label: peer.name,
      });
    }

    if (homeLease) {
      const homeZone =
        allZones.find((z) => z.id === homeLease.zoneId) ??
        (zone.id === homeLease.zoneId ? zone : null);
      const homeEl =
        homeZone?.elements.find((el) => el.id === homeLease.elementId && el.kind === "HOME") ??
        null;
      const placement = megaAtlas.placements.find((p) => p.zoneId === homeLease.zoneId);
      if (homeZone && homeEl && placement) {
        const local = homeCenterWorld(homeEl, homeZone.worldWidthPx, homeZone.worldHeightPx);
        const pt = zoneLocalToMegaPx(
          local,
          placement,
          megaAtlas.bounds,
          megaAtlas.tileWidthPx,
          megaAtlas.tileHeightPx,
          homeZone.worldWidthPx,
          homeZone.worldHeightPx,
        );
        markers.push({
          id: "owned-home-mega",
          x: pt.x,
          y: pt.y,
          kind: "home",
          label: homeEl.label || homeLease.houseLabel || "Home",
        });
      }
    }

    for (const z of allZones.length > 0 ? allZones : [zone]) {
      const placement = megaAtlas.placements.find((p) => p.zoneId === z.id);
      if (!placement) continue;
      for (const el of z.elements) {
        if (el.kind !== "MAP_LABEL") continue;
        const label = el.label.trim();
        if (!label) continue;
        const local = {
          x: ((el.leftPct + el.widthPct / 2) / 100) * z.worldWidthPx,
          y: ((el.topPct + el.heightPct / 2) / 100) * z.worldHeightPx,
        };
        const pt = zoneLocalToMegaPx(
          local,
          placement,
          megaAtlas.bounds,
          megaAtlas.tileWidthPx,
          megaAtlas.tileHeightPx,
          z.worldWidthPx,
          z.worldHeightPx,
        );
        markers.push({
          id: `map-label-mega-${el.id}`,
          x: pt.x,
          y: pt.y,
          kind: "label",
          label,
          labelSizePx: el.mapLabelSizePx || 12,
        });
      }
    }

    return markers;
  }, [
    megaAtlas,
    fullMapMarkers,
    partyPresence,
    guestId,
    homeLease,
    allZones,
    zone,
  ]);

  function closePlayerMenus() {
    setSimMenuOpen(false);
    setActiveRemotePeer(null);
    // Keep socialTarget so Trade / Trace from the action menu still work.
  }

  useEffect(() => {
    setHoldNodeId(null);
    setPendingGather(null);
    setForceWalkTarget(null);
    selectedGatherNodeRef.current = null;
  }, [zone.id]);

  useEffect(() => {
    // Seed hotbar with first 3 catalog tools only when nothing was persisted yet.
    if (initialHotbar != null) return;
    setHotbarSlots((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next: ExplorationHotbarLoadout = {};
      tools.slice(0, 3).forEach((t, i) => {
        next[i + 1] = { kind: "tool", id: t.id };
      });
      return next;
    });
  }, [tools, initialHotbar]);

  useEffect(() => {
    // Don't persist the pre-seed empty map (would lock in "no hotbar" and skip seeding).
    if (initialHotbar == null && Object.keys(hotbarSlots).length === 0) return;
    hotbarPersistRef.current?.(hotbarSlots);
  }, [hotbarSlots, initialHotbar]);

  /** Menu → quick-bar drops use fixed proxies above modal overlays. */
  useEffect(() => {
    registerExplHudDropHandler((slotIndex, dataTransfer) => {
      const actionRaw =
        dataTransfer.getData(EXPL_ACTION_DRAG_MIME) ||
        (dataTransfer.getData("text/plain").startsWith("action:")
          ? dataTransfer.getData("text/plain").slice("action:".length)
          : "");
      if (isExplorationActionId(actionRaw)) {
        const fromRaw = dataTransfer.getData("application/x-7thleg-expl-tool-slot");
        const fromSlot = fromRaw !== "" ? Number(fromRaw) : -1;
        setHotbarSlots((prev) => {
          const next: Record<number, ExplorationHotbarEntry> = { ...prev };
          next[slotIndex] = { kind: "action", id: actionRaw };
          if (fromSlot >= 0 && fromSlot <= 9 && fromSlot !== slotIndex) {
            delete next[fromSlot];
          }
          return next;
        });
        return;
      }

      const waterId = dataTransfer.getData(EXPL_WATER_DRAG_MIME);
      if (waterId) {
        const fromRaw = dataTransfer.getData("application/x-7thleg-expl-tool-slot");
        const fromSlot = fromRaw !== "" ? Number(fromRaw) : -1;
        setHotbarSlots((prev) => {
          const next: Record<number, ExplorationHotbarEntry> = { ...prev };
          next[slotIndex] = { kind: "water", id: waterId };
          if (fromSlot >= 0 && fromSlot <= 9 && fromSlot !== slotIndex) {
            delete next[fromSlot];
          }
          return next;
        });
        return;
      }

      let toolId =
        dataTransfer.getData(EXPL_TOOL_DRAG_MIME) || dataTransfer.getData("text/plain");
      if (!toolId || toolId.startsWith("action:")) {
        try {
          const invRaw = dataTransfer.getData(EXPL_INV_DRAG_MIME);
          if (invRaw) {
            const payload = JSON.parse(invRaw) as { kind?: string; toolId?: string };
            if (payload.kind === "tool" && typeof payload.toolId === "string") {
              toolId = payload.toolId;
            }
          }
        } catch {
          /* ignore */
        }
      }
      if (!toolId || !tools.some((t) => t.id === toolId)) return;
      const fromRaw = dataTransfer.getData("application/x-7thleg-expl-tool-slot");
      const fromSlot = fromRaw !== "" ? Number(fromRaw) : -1;
      setHotbarSlots((prev) => {
        const next: Record<number, ExplorationHotbarEntry> = { ...prev };
        next[slotIndex] = { kind: "tool", id: toolId };
        if (fromSlot >= 0 && fromSlot <= 9 && fromSlot !== slotIndex) {
          delete next[fromSlot];
        }
        return next;
      });
    });
    return () => {
      registerExplHudDropHandler(null);
      setExplHudDragArmed(false);
    };
  }, [tools]);

  useEffect(() => {
    if (bagStacksProp != null) setLocalBag(bagStacksProp);
  }, [bagStacksProp]);

  useEffect(() => {
    setHudScalePct(loadHudScalePct());
    setGraphicsQuality(loadGraphicsQuality());
  }, []);

  useEffect(() => {
    const base =
      generalSettings.audio ?? DEFAULT_EXPLORATION_GENERAL_SETTINGS.audio ?? DEFAULT_AUDIO_SETTINGS;
    const prefs = loadAudioBrowserPrefs({
      enabled: base.enabled,
      musicVolume: base.musicVolume,
      ambientVolume: base.ambientVolume ?? base.musicVolume,
      sfxVolume: base.sfxVolume,
      musicMuted: false,
      ambientMuted: false,
    });
    setSessionAudio({
      ...base,
      enabled: prefs.enabled,
      musicVolume: prefs.musicVolume,
      ambientVolume: prefs.ambientVolume,
      sfxVolume: prefs.sfxVolume,
      musicMuted: prefs.musicMuted,
      ambientMuted: prefs.ambientMuted,
    });
  }, [generalSettings.audio]);

  const patchSessionAudio = useCallback(
    (partial: Partial<ExplorationAudioSettings>) => {
      setSessionAudio((prev) => {
        const base =
          generalSettings.audio ??
          DEFAULT_EXPLORATION_GENERAL_SETTINGS.audio ??
          DEFAULT_AUDIO_SETTINGS;
        const next = { ...(prev ?? base), ...partial };
        saveAudioBrowserPrefs({
          enabled: next.enabled,
          musicVolume: next.musicVolume,
          ambientVolume: next.ambientVolume ?? next.musicVolume,
          sfxVolume: next.sfxVolume,
          musicMuted: Boolean(next.musicMuted),
          ambientMuted: Boolean(next.ambientMuted),
        });
        return next;
      });
    },
    [generalSettings.audio],
  );

  useEffect(() => {
    if (ownedToolsProp) {
      setOwnedToolsLocal(ownedToolsProp);
      return;
    }
    setOwnedToolsLocal((prev) => {
      const starters = buildStarterOwnedTools(tools, "owned");
      const byTool = new Map(prev.map((o) => [o.toolId, o]));
      return starters.map((o) => byTool.get(o.toolId) ?? o);
    });
  }, [tools, ownedToolsProp]);

  const ownedTools = ownedToolsProp ?? ownedToolsLocal;
  function setOwnedTools(next: ExplorationOwnedTool[]) {
    setOwnedToolsLocal(next);
    onOwnedToolsChange?.(next);
  }

  useEffect(() => {
    if (ownedWaterProp) {
      setOwnedWaterLocal(ownedWaterProp);
      return;
    }
    setOwnedWaterLocal((prev) => {
      const starters = buildStarterOwnedWaterContainers(waterCatalog, "owned");
      const byContainer = new Map(prev.map((o) => [o.containerId, o]));
      return starters.map((o) => byContainer.get(o.containerId) ?? o);
    });
  }, [waterCatalog, ownedWaterProp]);

  const ownedWater = ownedWaterProp ?? ownedWaterLocal;
  function setOwnedWater(next: ExplorationOwnedWaterContainer[]) {
    setOwnedWaterLocal(next);
    onOwnedWaterChange?.(next);
  }

  /** Ensure a catalog tool has an owned instance before equipping into hand/hotbar. */
  function ensureOwnedTool(toolId: string, list: ExplorationOwnedTool[] = ownedTools): ExplorationOwnedTool[] {
    if (list.some((o) => o.toolId === toolId || o.instanceId === toolId)) return list;
    const tool = tools.find((t) => t.id === toolId);
    if (!tool) return list;
    const next = [
      ...list,
      {
        instanceId: `owned-${tool.id}`,
        toolId: tool.id,
        durability: tool.durabilityMax,
      },
    ];
    setOwnedTools(next);
    return next;
  }

  useEffect(() => {
    if (ownedClothingProp) {
      setOwnedClothingLocal(ownedClothingProp);
      return;
    }
    // Clothing is granted from character creation picks (or shop) — not the full catalog.
    setOwnedClothingLocal([]);
  }, [clothing, ownedClothingProp]);

  const ownedClothing = ownedClothingProp ?? ownedClothingLocal;
  function setOwnedClothing(next: ExplorationOwnedClothing[]) {
    setOwnedClothingLocal(next);
    onOwnedClothingChange?.(next);
  }

  useEffect(() => {
    if (!initialEquipment) return;
    setEquipment(initialEquipment);
  }, [initialEquipment]);

  useEffect(() => {
    setLocalAppearance(avatarAppearance);
  }, [avatarAppearance]);

  const playAppearance = localAppearance ?? avatarAppearance;

  function patchAppearance(next: ExplorationAvatarAppearance) {
    setLocalAppearance(next);
    onAppearanceChange?.(next);
  }

  function applyEquipment(next: ExplorationEquipmentLoadout) {
    setEquipment(next);
    equipmentPersistRef.current?.(next);
    const toolId = equippedToolIdFromLoadout(next, tools);
    const current = equippedToolId;
    if (toolId && toolId !== current) onEquipTool?.(toolId);
    if (!toolId && current) onUnequipTool?.();
  }

  function handleEquipToSlot(slot: ExplorationEquipSlot, payload: ExplorationInvDragPayload) {
    const next = equipInventoryItem({
      equipment,
      slot,
      payload,
      tools,
      ownedTools,
      clothing,
      ownedClothing,
    });
    if (next) {
      applyEquipment(next);
      return;
    }
    if (payload.kind === "clothing") {
      const item = clothing.find((c) => c.id === payload.clothingId);
      if (item && item.slot !== slot) {
        showEmoteSpeech(`Goes on ${item.slot.replace(/_/g, " ").toLowerCase()}`);
        return;
      }
    }
    if (payload.kind === "tool") {
      if (slot !== "HAND_LEFT" && slot !== "HAND_RIGHT") {
        showEmoteSpeech("Tools go in a hand slot");
      }
    }
  }

  function handleUnequipSlot(slot: ExplorationEquipSlot) {
    const entry = equipment[slot];
    if (
      gmLockedEquipment &&
      entry?.kind === "clothing" &&
      isGmClothingId(entry.clothingId)
    ) {
      showEmoteSpeech("GM gear is locked");
      return;
    }
    const next = { ...equipment };
    delete next[slot];
    applyEquipment(next);
  }

  const bagStacks = localBag;
  /** Bag item qty + owned tools + water fill vs carry capacity (weightPoints × 10). */
  const weightLoadPct = useMemo(() => {
    if (gmFlags?.godMode) return 0;
    const bagWeight = bagStacks.reduce((sum, s) => sum + Math.max(0, s.quantity), 0);
    const toolWeight = ownedToolsCarryWeight(ownedTools, tools);
    const waterWeightPerPts =
      generalSettings.hydration?.waterWeightPerPts ??
      DEFAULT_EXPLORATION_GENERAL_SETTINGS.hydration.waterWeightPerPts;
    const waterWeight = ownedWater.reduce(
      (sum, o) => sum + waterFillWeight(o.fillPts, waterWeightPerPts),
      0,
    );
    const total = bagWeight + toolWeight + waterWeight;
    if (carryMax <= 0) return 0;
    return (total / carryMax) * 100;
  }, [
    bagStacks,
    carryMax,
    ownedTools,
    ownedWater,
    tools,
    generalSettings.hydration?.waterWeightPerPts,
    gmFlags?.godMode,
  ]);
  function setBagStacks(
    next: ExplorationBagStack[] | ((prev: ExplorationBagStack[]) => ExplorationBagStack[]),
  ) {
    setLocalBag((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      onBagStacksChange?.(resolved);
      return resolved;
    });
  }

  const gatherToolId = equippedGatherToolIdFromLoadout(equipment, tools);
  const lightToolId = equippedLightToolIdFromLoadout(equipment, tools);
  const primaryToolId = gatherToolId || lightToolId || equippedToolId;
  const equippedOwned =
    ownedTools.find((o) => o.toolId === primaryToolId) ??
    ownedTools.find((o) => o.instanceId === primaryToolId) ??
    ownedTools.find((o) => o.toolId === equippedToolId) ??
    ownedTools.find((o) => o.instanceId === equippedToolId) ??
    null;
  const gatherTool = tools.find((t) => t.id === gatherToolId) ?? null;
  const lightTool = tools.find((t) => t.id === lightToolId) ?? null;
  const equippedTool =
    gatherTool ??
    lightTool ??
    tools.find((t) => t.id === (equippedOwned?.toolId ?? equippedToolId)) ??
    null;
  const dualWieldLight = Boolean(gatherToolId && lightToolId && lightTool);
  const heldToolImageUrl = (gatherTool ?? lightTool ?? equippedTool)?.imageUrl ?? "";
  const heldToolImageSizePx =
    (gatherTool ?? lightTool ?? equippedTool)?.heldImageSizePx ?? 20;
  const heldToolPose = (gatherTool ?? lightTool ?? equippedTool)?.heldPose ?? null;
  const heldToolFx = (gatherTool ?? lightTool ?? equippedTool)?.heldFx ?? null;
  const heldHand =
    heldHandFromLoadout(equipment, tools) ||
    (gatherTool ?? lightTool ?? equippedTool)?.heldHand ||
    "right";
  const heldLightHand = heldHand === "right" ? "left" : "right";
  const heldLightImageUrl = dualWieldLight ? (lightTool?.imageUrl ?? "") : "";
  const heldLightImageSizePx = dualWieldLight ? (lightTool?.heldImageSizePx ?? 20) : 20;
  const heldLightPose = dualWieldLight ? (lightTool?.heldPose ?? null) : null;
  const heldLightFx = dualWieldLight ? (lightTool?.heldFx ?? null) : null;
  /** Hand that actually holds the light tool (primary hand when light-only). */
  const lightOriginHand: "left" | "right" = dualWieldLight
    ? heldLightHand
    : lightToolId
      ? (heldHand === "left" ? "left" : "right")
      : "left";

  // Warm browser image cache for tool sprites (SVG <image> remounts otherwise flash broken).
  useEffect(() => {
    const urls: string[] = [];
    for (const t of tools) urls.push(...collectToolImageUrls(t));
    if (heldToolImageUrl) urls.push(heldToolImageUrl);
    if (heldLightImageUrl) urls.push(heldLightImageUrl);
    preloadExplorationImages(urls);
  }, [tools, heldToolImageUrl, heldLightImageUrl]);

  const playerLightOrigin = useMemo(() => {
    if (!playerPos || !lightToolId) return null;
    return explorationHeldLightOrigin({
      playerX: playerPos.x,
      playerY: playerPos.y,
      facingDeg: playerFacingDeg,
      hand: lightOriginHand,
    });
  }, [playerPos, lightToolId, playerFacingDeg, lightOriginHand]);

  useEffect(() => {
    if (!onActivityChange) return;
    const gatherId = (gatherToolId || "").trim();
    const lightId = (lightToolId || "").trim();
    const fallbackId = (equippedOwned?.toolId || equippedToolId || "").trim();
    const primaryId = gatherId || (lightId ? "" : fallbackId);
    const activity: CoopPresenceActivity = {
      ...(primaryId ? { toolId: primaryId } : {}),
      ...(lightId ? { lightToolId: lightId } : {}),
      heldHand,
      ...(lightId ? { lightHand: lightOriginHand } : {}),
      emote: localEmote,
      ...(localSpeech?.trim() ? { speech: localSpeech.trim().slice(0, 120) } : {}),
      ...(localZoneChat ? { zoneChat: localZoneChat } : {}),
      ...(chatTyping ? { typing: true } : {}),
    };
    onActivityChange(activity);
  }, [
    onActivityChange,
    gatherToolId,
    lightToolId,
    equippedOwned?.toolId,
    equippedToolId,
    heldHand,
    lightOriginHand,
    localEmote,
    localSpeech,
    localZoneChat,
    chatTyping,
  ]);

  useEffect(() => {
    const next: Array<{ id: string; from: string; body: string; at: number }> = [];
    for (const peer of remotePeers) {
      const at = peer.zoneChatAt ?? 0;
      const body = peer.zoneChatBody?.trim() ?? "";
      if (!at || !body) continue;
      if (seenRemoteZoneChatRef.current.get(peer.id) === at) continue;
      seenRemoteZoneChatRef.current.set(peer.id, at);
      next.push({ id: `${peer.id}-${at}`, from: peer.name, body, at });
    }
    if (next.length === 0) return;
    setRemoteZoneMessages((prev) => [...prev, ...next].slice(-80));
  }, [remotePeers]);

  const typingPeerNames = useMemo(
    () =>
      remotePeers
        .filter((p) => p.typing && !p.speech?.trim())
        .map((p) => p.name)
        .filter(Boolean),
    [remotePeers],
  );

  const playerAvatarLoadout = useMemo(() => {
    if (!playAppearance || !avatarCatalog) return null;
    const base = resolveAvatarLoadout(playAppearance, avatarCatalog);
    return mergeEquipmentIntoAvatarLoadout(base, equipment, clothing);
  }, [playAppearance, avatarCatalog, equipment, clothing]);

  const npcAvatarLoadout = useMemo(() => {
    if (!npcAppearance || !avatarCatalog) return null;
    return resolveAvatarLoadout(npcAppearance, avatarCatalog);
  }, [npcAppearance, avatarCatalog]);

  const [toolChopNonce, setToolChopNonce] = useState(0);
  const baseAudio =
    generalSettings.audio ?? DEFAULT_EXPLORATION_GENERAL_SETTINGS.audio ?? DEFAULT_AUDIO_SETTINGS;
  const effectiveAudio = sessionAudio ?? baseAudio;
  const regionMusicUrl = activeRegion
    ? (effectiveAudio.regionMusicByElementId?.[activeRegion.id] ?? "").trim()
    : "";
  const playSfx = useExplorationAudioPlayer(effectiveAudio, {
    regionMusicUrl: regionMusicUrl || null,
    bugChasing: Boolean(chaseBugId),
    bugChaseCutNonce,
  });
  const menuOpenRef = useRef(false);
  const anyMenuOpen =
    escapeMenuOpen ||
    escapeSettingsOpen ||
    bagOpen ||
    actionMenuOpen ||
    Boolean(customMenuOpen) ||
    cargoOpen ||
    companionMenuOpen ||
    fullMapOpen ||
    simMenuOpen ||
    Boolean(activeRemotePeer) ||
    npcMenuOpen ||
    Boolean(activeTeleporter) ||
    Boolean(activeStable) ||
    Boolean(activeStore) ||
    Boolean(activeHome) ||
    Boolean(activeSign) ||
    Boolean(activeFountain);

  useEffect(() => {
    if (anyMenuOpen === menuOpenRef.current) return;
    menuOpenRef.current = anyMenuOpen;
    playSfx(anyMenuOpen ? "menuOpen" : "menuClose");
  }, [anyMenuOpen, playSfx]);

  const zoneCollectAreas = useMemo(
    () => collectAreas.filter((a) => a.zoneId === zone.id),
    [collectAreas, zone.id],
  );

  const gatheringSettings =
    generalSettings.gathering ?? DEFAULT_EXPLORATION_GENERAL_SETTINGS.gathering;

  useEffect(() => {
    if (!sharedBugsActive || !onBugsSubscribe) return;
    onBugsSubscribe({
      zoneId: zone.id,
      worldW: zone.worldWidthPx,
      worldH: zone.worldHeightPx,
      areas: serializeRoamAreasForRealtime(zoneCollectAreas),
      escapeMissesMin: gatheringSettings.bugEscapeMissesMin,
      escapeMissesMax: gatheringSettings.bugEscapeMissesMax,
      wrongToolChancePct: gatheringSettings.wrongToolChancePct,
      isNight,
    });
  }, [
    sharedBugsActive,
    onBugsSubscribe,
    zone.id,
    zone.worldWidthPx,
    zone.worldHeightPx,
    zoneCollectAreas,
    gatheringSettings.bugEscapeMissesMin,
    gatheringSettings.bugEscapeMissesMax,
    gatheringSettings.wrongToolChancePct,
    isNight,
  ]);

  useEffect(() => {
    if (!sharedBugsActive || !onBugsEnv) return;
    onBugsEnv({ isNight });
  }, [sharedBugsActive, onBugsEnv, isNight]);

  const playerWaterState = useMemo(() => {
    if (!playerPos) return null;
    return resolvePlayerWaterState(
      zoneCollectAreas,
      playerPos.x,
      playerPos.y,
      zone.worldWidthPx,
      zone.worldHeightPx,
    );
  }, [playerPos, zoneCollectAreas, zone.worldWidthPx, zone.worldHeightPx]);

  const playerInWaterArea = (playerWaterState?.wade ?? 0) > 0;

  function refillAllWaterContainers() {
    if (ownedWater.length === 0) return;
    const next = ownedWater.map((o) => {
      const catalog = waterCatalog.find((c) => c.id === o.containerId);
      const cap = catalog?.capacityPts ?? DEFAULT_WATER_CONTAINER_CAPACITY;
      return { ...o, fillPts: cap };
    });
    setOwnedWater(next);
  }

  const nightLights = useMemo((): ExplorationShineLight[] => {
    const lights: ExplorationShineLight[] = [];
    const ww = zone.worldWidthPx;
    const wh = zone.worldHeightPx;
    if (ww <= 0 || wh <= 0) return lights;
    for (const el of zone.elements) {
      if (el.kind !== "LIGHT") continue;
      const zl = el.zoneLight;
      lights.push({
        id: el.id,
        x: ((el.leftPct + el.widthPct / 2) / 100) * ww,
        y: ((el.topPct + el.heightPct / 2) / 100) * wh,
        radiusPx: zl.shineDistancePx,
        pattern: zl.shinePattern,
        colorHex: zl.colorHex,
        coneHalfAngleDeg: zl.coneHalfAngleDeg,
      });
    }
    const lightToolIdEquipped = equippedLightToolIdFromLoadout(equipment, tools);
    if (lightToolIdEquipped && playerLightOrigin) {
      const tool = tools.find((t) => t.id === lightToolIdEquipped);
      const light = tool?.light;
      if (light?.enabled) {
        lights.push({
          id: `player-light-${lightToolIdEquipped}`,
          x: playerLightOrigin.x,
          y: playerLightOrigin.y,
          radiusPx: light.shineDistancePx,
          pattern: light.shinePattern,
          colorHex: light.colorHex,
          facingDeg: playerFacingDeg,
          coneHalfAngleDeg: light.coneHalfAngleDeg,
        });
      }
    }
    for (const peer of remotePeers) {
      const peerLightId = peer.lightToolId?.trim() ?? "";
      if (!peerLightId) continue;
      const tool = tools.find((t) => t.id === peerLightId);
      const light = tool?.light;
      if (!light?.enabled) continue;
      const hand = peer.lightHand === "left" ? "left" : "right";
      const origin = explorationHeldLightOrigin({
        playerX: peer.x,
        playerY: peer.y,
        facingDeg: peer.facingDeg,
        hand,
      });
      lights.push({
        id: `peer-light-${peer.id}-${peerLightId}`,
        x: origin.x,
        y: origin.y,
        radiusPx: light.shineDistancePx,
        pattern: light.shinePattern,
        colorHex: light.colorHex,
        facingDeg: peer.facingDeg,
        coneHalfAngleDeg: light.coneHalfAngleDeg,
      });
    }
    return lights;
  }, [
    zone.elements,
    zone.worldWidthPx,
    zone.worldHeightPx,
    equipment,
    tools,
    playerLightOrigin,
    playerFacingDeg,
    remotePeers,
  ]);

  const allNightLights = useMemo(
    () => [...nightLights, ...bugGlowLights],
    [nightLights, bugGlowLights],
  );

  const playerLight = useMemo(() => {
    if (!lightToolId || !playerLightOrigin) return null;
    const tool = tools.find((t) => t.id === lightToolId);
    const light = tool?.light;
    if (!light?.enabled) return null;
    return {
      x: playerLightOrigin.x,
      y: playerLightOrigin.y,
      radiusPx: light.shineDistancePx,
      bugScareMult: light.bugScareMult,
      pattern: light.shinePattern as "directional" | "omni",
      facingDeg: playerFacingDeg,
      coneHalfAngleDeg: light.coneHalfAngleDeg,
      colorHex: light.colorHex,
    };
  }, [lightToolId, playerLightOrigin, tools, playerFacingDeg]);

  const clearBugLights = useMemo(() => {
    return allNightLights
      .filter((l) => isLightColorClear(l.colorHex))
      .map((l) => ({
        x: l.x,
        y: l.y,
        radiusPx: l.radiusPx,
        pattern: l.pattern as "directional" | "omni",
        facingDeg: l.facingDeg ?? 0,
        coneHalfAngleDeg: l.coneHalfAngleDeg ?? 45,
      }));
  }, [allNightLights]);

  const partyMembersInGatherRange = useMemo(() => {
    if (!partyItemSharing || !playerPos || partyMemberIdsInRange.length === 0) return [];
    const sharePx = generalSettings.experience.shareDistancePx;
    return partyMemberIdsInRange.filter((id) => {
      const peer = remotePeers.find((p) => p.id === id);
      if (!peer) return false;
      if (sharePx <= 0) return true;
      return Math.hypot(peer.x - playerPos.x, peer.y - playerPos.y) <= sharePx;
    });
  }, [
    partyItemSharing,
    partyMemberIdsInRange,
    playerPos,
    remotePeers,
    generalSettings.experience.shareDistancePx,
  ]);

  const partyMemberNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of party?.members ?? []) {
      map[m.guestId] = m.displayName;
    }
    for (const p of remotePeers) {
      if (!map[p.id] && p.name) map[p.id] = p.name;
    }
    return map;
  }, [party?.members, remotePeers]);

  const localGuestKey = chatGuestId || housingGuestId || guestId || "local";

  useEffect(() => {
    const prev = partySnapshotRef.current;
    const next = party ?? null;
    const lines = partyActivityLogLines(prev, next, localGuestKey);
    partySnapshotRef.current = next;
    if (lines.length) {
      setActivityLogLines((cur) => appendActivityLogLines(cur, lines));
    }
  }, [party, localGuestKey]);

  const pushActivityLog = useCallback((lines: ExplorationActivityLogLine[]) => {
    setActivityLogLines((cur) => appendActivityLogLines(cur, lines));
  }, []);

  const handleAddBagLoot = useCallback((stacks: ExplorationBagStack[]) => {
    setBagStacks((prev) => {
      let next = prev;
      for (const stack of stacks) {
        let remaining = stack.quantity;
        const hit = next.findIndex((s) => s.itemId === stack.itemId);
        if (hit >= 0) {
          const cur = next[hit]!;
          const room = Math.max(0, cur.stackMax - cur.quantity);
          const take = Math.min(room, remaining);
          if (take > 0) {
            next = next.map((s, i) =>
              i === hit ? { ...s, quantity: s.quantity + take } : s,
            );
            remaining -= take;
          }
        }
        while (remaining > 0) {
          const take = Math.min(stack.stackMax, remaining);
          next = [...next, { ...stack, quantity: take }];
          remaining -= take;
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!pendingGather || !playerPos) return;
    const reach = toolWorkInRangePx(equippedTool?.workDistancePx);
    if (Math.hypot(playerPos.x - pendingGather.x, playerPos.y - pendingGather.y) <= reach) {
      setHoldNodeId(pendingGather.nodeId);
      setPendingGather(null);
    }
  }, [playerPos, pendingGather, equippedTool?.workDistancePx]);

  const onRequestHitNode = useCallback(
    (node: ExplorationWorldNode) => {
      selectedGatherNodeRef.current = node;
      setChaseBugId(null);
      const reach = toolWorkInRangePx(equippedTool?.workDistancePx);
      if (
        playerPos &&
        Math.hypot(playerPos.x - node.x, playerPos.y - node.y) <= reach
      ) {
        setHoldNodeId(node.id);
        setPendingGather(null);
        return;
      }
      // Walk to stand-off range; lock auto-hit once close enough for the tool.
      setHoldNodeId(null);
      setPendingGather({ nodeId: node.id, x: node.x, y: node.y });
      const stand =
        playerPos != null
          ? gatherStandOffPoint(playerPos, node, equippedTool?.workDistancePx)
          : { x: node.x, y: node.y };
      setForceWalkTarget({ x: stand.x, y: stand.y, nonce: Date.now() });
    },
    [playerPos, equippedTool?.workDistancePx],
  );

  const cancelGatherTarget = useCallback(() => {
    setHoldNodeId(null);
    setPendingGather(null);
    setChaseBugId(null);
    setForceWalkTarget(null);
  }, []);

  const zoneWalkBlockers = useMemo(
    () =>
      blockersFromZoneElements(zone.elements, zone.worldWidthPx, zone.worldHeightPx),
    [zone.elements, zone.worldHeightPx, zone.worldWidthPx],
  );

  const gatherOverlay =
    zoneCollectAreas.length > 0 ? (
      <ArcadeExplorationGatherLayer
        areas={zoneCollectAreas}
        worldWidthPx={zone.worldWidthPx}
        worldHeightPx={zone.worldHeightPx}
        playerPos={playerPos}
        guestId={localGuestKey}
        localPlayerName={localPlayerName}
        gathering={gatheringSettings}
        experience={generalSettings.experience}
        tools={tools}
        ownedTools={ownedTools}
        equippedToolId={equippedOwned?.toolId || equippedToolId || ""}
        equippedToolInstanceId={equippedOwned?.instanceId ?? ""}
        onOwnedToolsChange={setOwnedTools}
        onAddBagLoot={handleAddBagLoot}
        onCatchBug={(bug: ExplorationFleeingBug) => {
          const catalog = bugsCatalog.find((b) => b.id === bug.bugId) ?? null;
          if (!catalog) {
            showEmoteSpeech("No container space");
            return false;
          }
          const next = placeBugInContainer(bagStacks, catalog, bugContainers);
          if (!next) {
            showEmoteSpeech("No container space");
            return false;
          }
          setBagStacks(next);
          return true;
        }}
        onActivityLog={pushActivityLog}
        onToolSwing={() => {
          setToolChopNonce((n) => n + 1);
          playSfx("toolSwing");
        }}
        onPlaySfx={(kind) => playSfx(kind)}
        onLocalXpGain={(xp) => setTotalXp((cur) => cur + xp)}
        holdNodeId={holdNodeId}
        onHoldNodeIdChange={setHoldNodeId}
        onRequestHitNode={onRequestHitNode}
        chaseBugId={chaseBugId}
        onChaseBugIdChange={setChaseBugId}
        onBugChaseMusicCut={() => setBugChaseCutNonce((n) => n + 1)}
        onWalkToward={(x, y) => setForceWalkTarget({ x, y, nonce: Date.now() })}
        onCancelWalk={() => setForceWalkTarget(null)}
        blockers={zoneWalkBlockers}
        partyItemSharing={partyItemSharing}
        partyMemberIdsInRange={partyMembersInGatherRange}
        partyMemberNameById={partyMemberNameById}
        partyXp={
          party
            ? {
                memberCount: party.memberCount,
                maxMembers: party.maxMembers,
                xpSharing: party.xpSharing,
              }
            : null
        }
        partyMemberPositions={[
          ...remotePeers
            .filter((p) => partyMemberGuestIds.includes(p.id))
            .map((p) => ({
              guestId: p.id,
              x: p.x,
              y: p.y,
              zoneId: zone.id,
            })),
        ]}
        zoneId={zone.id}
        isNight={isNight}
        playerLight={playerLight}
        clearBugLights={clearBugLights}
        graphicsQuality={graphicsQuality}
        onGlowLightsChange={setBugGlowLights}
        sharedBugsActive={sharedBugsActive}
        sharedAmbientBugs={sharedAmbientBugs}
        onSharedCatchAttempt={onSharedCatchAttempt}
        realtimeTrafficCut={realtimeTrafficCut}
        worldNodePatch={worldNodePatch}
        worldNodePatchSeq={worldNodePatchSeq}
        onPublishWorldNodesPatch={onPublishWorldNodesPatch}
        onMapMarkersChange={setGatherMapMarkers}
      />
    ) : null;

  useEffect(() => {
    const n = followerCompanion?.inventorySlots ?? 0;
    setCargoSlots(Array.from({ length: n }, () => null));
  }, [followerCompanion?.id, followerCompanion?.inventorySlots]);

  const rideableCompanion = useMemo(
    () => resolveRideableCompanion(mountCompanion, followerCompanion),
    [mountCompanion, followerCompanion],
  );
  const cargoCompanion =
    followerCompanion && followerCompanion.inventorySlots > 0 ? followerCompanion : null;
  const hasCompanion = Boolean(followerCompanion?.canFollow || rideableCompanion?.canRide);
  const overlayHasMountPin = overlayHasHotspotKind(overlay, "EXPL_MOUNT");
  const overlayHasCargoPin = overlayHasHotspotKind(overlay, "EXPL_COMPANION_CARGO");
  const overlayHasPartyPin = overlayHasHotspotKind(overlay, "EXPL_PARTY_MATCH");

  function flashToolSlot(slotIndex: number) {
    if (toolSlotFlashTimerRef.current) {
      window.clearTimeout(toolSlotFlashTimerRef.current);
      toolSlotFlashTimerRef.current = null;
    }
    setFlashingToolSlot(slotIndex);
    toolSlotFlashTimerRef.current = window.setTimeout(() => {
      setFlashingToolSlot((cur) => (cur === slotIndex ? null : cur));
      toolSlotFlashTimerRef.current = null;
    }, 160);
  }

  function toggleToolSlot(slotIndex: number) {
    flashToolSlot(slotIndex);
    const entry = hotbarSlots[slotIndex];
    if (!entry) {
      const currentId = equippedOwned?.toolId || equippedToolId;
      if (currentId) {
        // applyEquipment syncs onUnequipTool / onEquipTool from the loadout.
        applyEquipment(unequipToolFromLoadout(equipment, currentId));
      }
      return;
    }
    if (entry.kind === "action") {
      runExplorationAction(entry.id);
      return;
    }
    if (entry.kind === "water") {
      const owned = ownedWater.find((o) => o.instanceId === entry.id);
      if (!owned) return;
      if (playerInWaterArea) {
        refillAllWaterContainers();
        showEmoteSpeech("Refilled");
        return;
      }
      const catalog = waterCatalog.find((c) => c.id === owned.containerId);
      const cap = catalog?.capacityPts ?? DEFAULT_WATER_CONTAINER_CAPACITY;
      if (owned.fillPts <= 0) {
        showEmoteSpeech("Empty");
        return;
      }
      const hydCfg = generalSettings.hydration ?? DEFAULT_EXPLORATION_GENERAL_SETTINGS.hydration;
      const hydMax = hydrationMaxRef.current;
      const room = Math.max(0, hydMax - hydrationHud.value);
      if (room <= 0) {
        showEmoteSpeech("Full");
        return;
      }
      const sip = Math.min(hydCfg.sipPts, owned.fillPts, room);
      if (!gmFlags?.godMode) {
        setOwnedWater(
          ownedWater.map((o) =>
            o.instanceId === owned.instanceId ? { ...o, fillPts: o.fillPts - sip } : o,
          ),
        );
      }
      setHydrationInject({ amount: sip, nonce: Date.now() });
      showEmoteSpeech("Sip");
      return;
    }
    const toolId = entry.id;
    const currentId = equippedOwned?.toolId || equippedToolId;
    if (currentId === toolId) {
      applyEquipment(unequipToolFromLoadout(equipment, toolId));
    } else {
      const tool = tools.find((t) => t.id === toolId);
      const owned = ensureOwnedTool(toolId);
      const instance = owned.find((o) => o.toolId === toolId);
      if (instance && instance.durability <= 0) {
        showEmoteSpeech("Tool is broken");
        pushActivityLog([makeActivityLogLine("gather", "Tool is broken — repair it first")]);
        return;
      }
      applyEquipment(
        equipToolOntoLoadout(equipment, toolId, owned, tool?.heldHand, tools),
      );
    }
  }

  function clearLocalEmoteTimer() {
    if (localEmoteTimerRef.current) {
      window.clearTimeout(localEmoteTimerRef.current);
      localEmoteTimerRef.current = null;
    }
  }

  function playEmote(kind: ExplorationPawnEmote) {
    clearLocalEmoteTimer();
    setLocalEmote(kind);
    if (kind === "sit") return;
    const ms =
      kind === "celebrate" ? 3800 : kind === "dance" || kind === "laugh" ? 3200 : 2200;
    localEmoteTimerRef.current = window.setTimeout(() => {
      setLocalEmote((cur) => (cur === kind ? null : cur));
      localEmoteTimerRef.current = null;
    }, ms);
  }

  function runExplorationAction(actionId: ExplorationActionId) {
    switch (actionId) {
      case "wave":
        playEmote("wave");
        break;
      case "sit":
        if (localEmote === "sit") {
          clearLocalEmoteTimer();
          setLocalEmote(null);
        } else {
          playEmote("sit");
        }
        break;
      case "dance":
        playEmote("dance");
        break;
      case "laugh":
        playEmote("laugh");
        showEmoteSpeech("Ha ha!");
        break;
      case "celebrate":
        playEmote("celebrate");
        break;
      case "walk":
      case "run":
        setMoveGait((g) => (g === "walk" ? "run" : "walk"));
        showEmoteSpeech(moveGait === "walk" ? "Run" : "Walk");
        break;
      case "autorun":
        setMoveGait((g) => (g === "autorun" ? "run" : "autorun"));
        showEmoteSpeech(moveGait === "autorun" ? "Auto Run Off" : "Auto Run On");
        break;
      case "attack": {
        if (!equippedTool) {
          showEmoteSpeech("Equip a weapon first");
          break;
        }
        if (equippedOwned && equippedOwned.durability <= 0) {
          showEmoteSpeech("Weapon is broken");
          break;
        }
        const node = selectedGatherNodeRef.current;
        if (!node) {
          playSfx("toolSwing");
          showEmoteSpeech("Select a resource first");
          break;
        }
        onRequestHitNode(node);
        break;
      }
      case "trade": {
        if (!socialTarget) {
          showEmoteSpeech("Select a player first");
          break;
        }
        showEmoteSpeech(`Trade with ${socialTarget.name}`);
        setActivityLogLines((prev) =>
          appendActivityLogLines(prev, [
            makeActivityLogLine("system", `Trade requested with ${socialTarget.name}.`),
          ]),
        );
        break;
      }
      case "trace": {
        if (!socialTarget) {
          showEmoteSpeech("Select a player first");
          break;
        }
        if (socialTarget.kind === "peer") {
          setTraceTarget({ kind: "peer", id: socialTarget.id });
        } else {
          setTraceTarget({ kind: "sim" });
        }
        break;
      }
      default:
        break;
    }
  }

  function nudgeMinimapZoom(dir: "in" | "out") {
    const lo = generalSettings.minimapViewPctMin;
    const hi = generalSettings.minimapViewPctMax;
    setMinimapViewPct((prev) => {
      const step = Math.max(2, Math.round((hi - lo) / 8));
      const next = dir === "in" ? prev - step : prev + step;
      return Math.min(hi, Math.max(lo, next));
    });
  }

  function showEmoteSpeech(label: string) {
    if (localSpeechTimerRef.current) window.clearTimeout(localSpeechTimerRef.current);
    setLocalSpeech(label);
    localSpeechTimerRef.current = window.setTimeout(() => {
      setLocalSpeech(null);
      localSpeechTimerRef.current = null;
    }, generalSettings.speechBubble.durationMs);
  }

  const handleCustomMenuAction = useCallback(
    (actionId: ExplorationMenuActionId, meta?: { targetMenuId?: string }) => {
      switch (actionId) {
        case "close":
          setCustomMenuOpen(null);
          break;
        case "open_menu": {
          const menuId = meta?.targetMenuId?.trim() ?? "";
          const next = menus.find((m) => m.id === menuId) ?? null;
          if (next) {
            setEscapeMenuOpen(false);
            setEscapeSettingsOpen(false);
            setCustomMenuOpen(next);
          }
          break;
        }
        case "logout":
          setCustomMenuOpen(null);
          setEscapeMenuOpen(false);
          setEscapeSettingsOpen(false);
          onLogout?.();
          break;
        case "open_bag":
          setCustomMenuOpen(null);
          setBagOpen(true);
          break;
        case "open_actions":
          setCustomMenuOpen(null);
          setActionMenuOpen(true);
          break;
        case "open_tools":
          setCustomMenuOpen(null);
          setBagOpen(true);
          break;
        case "open_companion":
          setCustomMenuOpen(null);
          setCompanionMenuOpen(true);
          break;
        case "open_cargo":
          setCustomMenuOpen(null);
          if (cargoCompanion) setCargoOpen(true);
          else setCompanionMenuOpen(true);
          break;
        case "toggle_mount":
          if (rideableCompanion?.canRide) setMounted((m) => !m);
          break;
        case "open_map":
          setCustomMenuOpen(null);
          setFullMapOpen(true);
          break;
        case "open_party":
          setCustomMenuOpen(null);
          onOpenPartyMatching?.();
          break;
        case "emote_wave":
        case "action_wave":
          runExplorationAction("wave");
          setCustomMenuOpen(null);
          break;
        case "emote_sit":
        case "action_sit":
          runExplorationAction("sit");
          setCustomMenuOpen(null);
          break;
        case "emote_dance":
        case "action_dance":
          runExplorationAction("dance");
          setCustomMenuOpen(null);
          break;
        case "emote_laugh":
        case "action_laugh":
          runExplorationAction("laugh");
          setCustomMenuOpen(null);
          break;
        case "emote_celebrate":
        case "action_celebrate":
          runExplorationAction("celebrate");
          setCustomMenuOpen(null);
          break;
        case "action_attack":
          runExplorationAction("attack");
          setCustomMenuOpen(null);
          break;
        case "action_walk":
          runExplorationAction("walk");
          setCustomMenuOpen(null);
          break;
        case "action_run":
          runExplorationAction("run");
          setCustomMenuOpen(null);
          break;
        case "action_autorun":
          runExplorationAction("autorun");
          setCustomMenuOpen(null);
          break;
        case "action_trade":
          runExplorationAction("trade");
          setCustomMenuOpen(null);
          break;
        case "action_trace":
          runExplorationAction("trace");
          setCustomMenuOpen(null);
          break;
        default:
          setCustomMenuOpen(null);
      }
    },
    [cargoCompanion, menus, onLogout, onOpenPartyMatching, rideableCompanion?.canRide],
  );

  /** Quick keys: Esc pause, M map, P party, T bag, 1–9 tool slots; I/WASD free for custom Open menu hotkeys. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === "Escape") {
        e.preventDefault();
        if (escapeSettingsOpen) {
          setEscapeSettingsOpen(false);
          return;
        }
        if (escapeMenuOpen) {
          setEscapeMenuOpen(false);
          return;
        }
        const otherMenuOpen =
          bagOpen ||
          actionMenuOpen ||
          Boolean(customMenuOpen) ||
          cargoOpen ||
          companionMenuOpen ||
          fullMapOpen ||
          simMenuOpen ||
          Boolean(activeRemotePeer) ||
          npcMenuOpen ||
          Boolean(activeTeleporter) ||
          Boolean(activeStable) ||
          Boolean(activeStore) ||
          Boolean(activeHome) ||
          Boolean(activeSign);
        // Other menus dismiss themselves via useDismissOnEscape — don't open pause on top.
        if (otherMenuOpen) return;
        const escapeMenuId = generalSettings.escapeMenuId?.trim() ?? "";
        if (escapeMenuId) {
          const built = menus.find((m) => m.id === escapeMenuId) ?? null;
          if (built) {
            setCustomMenuOpen(built);
            return;
          }
        }
        setEscapeMenuOpen(true);
        return;
      }

      const k = e.key.toLowerCase();

      const menuHotkeyPins = [
        ...(overlay?.hotspots ?? []),
        ...(overlay?.sections ?? []).flatMap((s) => s.hotspots),
      ];
      const menuHotkeyPin = menuHotkeyPins.find((h) => {
        if (h.kind !== "EXPL_OPEN_MENU" && h.kind !== "EXPL_ACTION_MENU") return false;
        const hotkey = h.openMenu?.hotkey?.trim().toLowerCase() || "";
        if (!hotkey || hotkey !== k) return false;
        return Boolean(h.openMenu.menuId?.trim());
      });
      if (menuHotkeyPin) {
        const menuId = menuHotkeyPin.openMenu.menuId.trim();
        const menu = menus.find((m) => m.id === menuId);
        if (menu) {
          e.preventDefault();
          setEscapeMenuOpen(false);
          setEscapeSettingsOpen(false);
          setCustomMenuOpen((prev) => (prev?.id === menu.id ? null : menu));
          setActionMenuOpen(false);
          setFullMapOpen(false);
          setBagOpen(false);
          setBagOpen(false);
          setCompanionMenuOpen(false);
          return;
        }
      }

      if (k >= "1" && k <= "9") {
        e.preventDefault();
        toggleToolSlot(Number(k));
        return;
      }
      if (k === "m") {
        e.preventDefault();
        setEscapeMenuOpen(false);
        setEscapeSettingsOpen(false);
        setFullMapOpen((o) => !o);
        setBagOpen(false);
        setBagOpen(false);
        setCompanionMenuOpen(false);
        setActionMenuOpen(false);
        setCustomMenuOpen(null);
        return;
      }
      if (k === "p" && onOpenPartyMatching) {
        e.preventDefault();
        setEscapeMenuOpen(false);
        setEscapeSettingsOpen(false);
        setFullMapOpen(false);
        setBagOpen(false);
        setBagOpen(false);
        setCompanionMenuOpen(false);
        setActionMenuOpen(false);
        setCustomMenuOpen(null);
        onOpenPartyMatching();
        return;
      }
      if (k === "t") {
        e.preventDefault();
        setEscapeMenuOpen(false);
        setEscapeSettingsOpen(false);
        setBagOpen((o) => !o);
        setFullMapOpen(false);
        setCompanionMenuOpen(false);
        setActionMenuOpen(false);
        setCustomMenuOpen(null);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    onOpenPartyMatching,
    hotbarSlots,
    equippedToolId,
    equippedOwned?.toolId,
    onEquipTool,
    onUnequipTool,
    overlay,
    menus,
    generalSettings.escapeMenuId,
    escapeMenuOpen,
    escapeSettingsOpen,
    bagOpen,
    actionMenuOpen,
    customMenuOpen,
    cargoOpen,
    companionMenuOpen,
    fullMapOpen,
    simMenuOpen,
    activeRemotePeer,
    npcMenuOpen,
    activeTeleporter,
    activeStable,
    activeStore,
    activeHome,
    activeSign,
  ]);

  /** Scroll-wheel click (browser middle button) activates EXPL_MIDDLE_CLICK slot. */
  useEffect(() => {
    const hasMiddlePin = overlayHasHotspotKind(overlay, "EXPL_MIDDLE_CLICK");
    if (!hasMiddlePin) return;

    const activateFromScrollWheel = (e: PointerEvent) => {
      // button 1 = middle button = pressing the scroll wheel in (not scrolling).
      if (e.pointerType === "touch" || e.pointerType === "pen") return;
      if (e.button !== 1) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      toggleToolSlot(EXPLORATION_MIDDLE_CLICK_SLOT);
    };
    const blockBrowserAutoscroll = (e: MouseEvent) => {
      if (e.button !== 1) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
    };

    // Capture so we win over page autoscroll / link-middle-click defaults.
    window.addEventListener("pointerdown", activateFromScrollWheel, true);
    window.addEventListener("mousedown", blockBrowserAutoscroll, true);
    window.addEventListener("auxclick", blockBrowserAutoscroll, true);
    return () => {
      window.removeEventListener("pointerdown", activateFromScrollWheel, true);
      window.removeEventListener("mousedown", blockBrowserAutoscroll, true);
      window.removeEventListener("auxclick", blockBrowserAutoscroll, true);
    };
  }, [
    overlay,
    hotbarSlots,
    equippedToolId,
    equippedOwned?.toolId,
    onEquipTool,
    onUnequipTool,
  ]);

  useEffect(() => {
    return () => {
      if (localSpeechTimerRef.current) window.clearTimeout(localSpeechTimerRef.current);
      if (simSpeechTimerRef.current) window.clearTimeout(simSpeechTimerRef.current);
      if (toolSlotFlashTimerRef.current) window.clearTimeout(toolSlotFlashTimerRef.current);
      if (localEmoteTimerRef.current) window.clearTimeout(localEmoteTimerRef.current);
    };
  }, []);

  // Counter browser page zoom so the map coverage stays stable; game zoom is wheel-driven.
  useEffect(() => {
    const sync = () => {
      const el = browserZoomRootRef.current;
      if (!el) return;
      const scale = window.visualViewport?.scale ?? 1;
      if (!Number.isFinite(scale) || Math.abs(scale - 1) < 0.01) {
        el.style.transform = "";
        el.style.width = "100%";
        el.style.height = "100%";
        return;
      }
      el.style.transformOrigin = "0 0";
      el.style.transform = `scale(${1 / scale})`;
      el.style.width = `${scale * 100}%`;
      el.style.height = `${scale * 100}%`;
    };
    sync();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const root = browserZoomRootRef.current;
      if (!root) return;
      const t = e.target;
      if (t instanceof Node && root.contains(t)) e.preventDefault();
    };
    // Capture ctrl+wheel browser zoom over the play area.
    document.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      document.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions);
    };
  }, []);

  const handleZoneSay = useCallback(
    (payload: { from: string; body: string }) => {
      const body = payload.body.trim();
      if (!body) return;
      const durationMs = generalSettings.speechBubble.durationMs;
      if (payload.from === localPlayerName || payload.from === "You") {
        setLocalSpeech(body);
        setLocalZoneChat({ body: body.slice(0, 280), at: Date.now() });
        if (localSpeechTimerRef.current) window.clearTimeout(localSpeechTimerRef.current);
        localSpeechTimerRef.current = window.setTimeout(() => {
          setLocalSpeech(null);
          localSpeechTimerRef.current = null;
        }, durationMs);
        return;
      }
      if (payload.from === simPlayerName) {
        setSimSpeech(body);
        if (simSpeechTimerRef.current) window.clearTimeout(simSpeechTimerRef.current);
        simSpeechTimerRef.current = window.setTimeout(() => {
          setSimSpeech(null);
          simSpeechTimerRef.current = null;
        }, durationMs);
      }
    },
    [localPlayerName, simPlayerName, generalSettings.speechBubble.durationMs],
  );

  useEffect(() => {
    if (!waypoint || !playerPos) return;
    if (
      Math.hypot(playerPos.x - waypoint.x, playerPos.y - waypoint.y) <= WAYPOINT_ARRIVE_PX
    ) {
      setWaypoint(null);
    }
  }, [playerPos, waypoint]);

  const minimapPinHit = findOverlayHotspot(overlay, "EXPL_MINIMAP");
  const mapChrome = {
    ...(minimapPinHit?.hotspot.minimap ?? DEFAULT_MINIMAP_CONFIG),
    viewPct: Math.min(
      generalSettings.minimapViewPctMax,
      Math.max(generalSettings.minimapViewPctMin, minimapViewPct),
    ),
  };

  const chatPinHit = findOverlayHotspot(overlay, "EXPL_CHAT");
  const chatPin = chatPinHit?.hotspot;
  const chatBox = chatPinHit
    ? stagePinBoxPct(chatPinHit.hotspot, chatPinHit.section, hudScalePct)
    : null;
  const chatLayout = chatBox
    ? {
        leftPct: chatBox.leftPct,
        topPct: chatBox.topPct,
        widthPct: chatBox.widthPct,
        heightPct: chatBox.heightPct,
        shape: chatPin?.shape,
      }
    : DEFAULT_CHAT_LAYOUT;
  const chatStyle = chatPin?.chat ?? DEFAULT_CHAT_CONFIG;

  const activityLogPinHit = findOverlayHotspot(overlay, "EXPL_ACTIVITY_LOG");
  const activityLogPin = activityLogPinHit?.hotspot;
  const activityLogBox = activityLogPinHit
    ? stagePinBoxPct(activityLogPinHit.hotspot, activityLogPinHit.section, hudScalePct)
    : null;
  const activityLogLayout = activityLogBox
    ? {
        leftPct: activityLogBox.leftPct,
        topPct: activityLogBox.topPct,
        widthPct: activityLogBox.widthPct,
        heightPct: activityLogBox.heightPct,
        shape: activityLogPin?.shape,
      }
    : DEFAULT_ACTIVITY_LOG_LAYOUT;
  const activityLogStyle = activityLogPin?.chat ?? DEFAULT_CHAT_CONFIG;

  const teleporterMenu = (
    <ArcadeExplorationTeleporterMenu
      open={Boolean(activeTeleporter)}
      teleporterLabel={activeTeleporter?.label ?? ""}
      destinations={activeTeleporter?.teleporter.destinations ?? []}
      zoneNameById={zoneNameById}
      onClose={() => setActiveTeleporter(null)}
      onSelect={(destination) => {
        setActiveTeleporter(null);
        onTeleport?.(destination);
      }}
    />
  );

  const stableMenu = (
    <ArcadeExplorationStableMenu
      open={Boolean(activeStable)}
      stableLabel={activeStable?.label ?? ""}
      listings={stableListings}
      coinsCents={playtestCoinsCents}
      ownedCompanionIds={ownedCompanionIds}
      companionNicknames={companionNicknames}
      activeFollowerId={activeFollowerId || followerCompanion?.id || ""}
      activeMountId={activeMountId || mountCompanion?.id || ""}
      onClose={() => setActiveStable(null)}
      onBuy={(listing) => onBuyStableListing?.(listing)}
      onEquip={(listing, role) => {
        if (homeLease?.storedCompanionIds.includes(listing.companionId)) return;
        onEquipStableCompanion?.(listing, role);
      }}
      onUnequip={(role) => onUnequipStableCompanion?.(role)}
      onRename={(companionId, name) => onRenameCompanion?.(companionId, name)}
    />
  );

  const storeMenu = (
    <ArcadeExplorationStoreMenu
      open={Boolean(activeStore)}
      storeLabel={activeStore?.label ?? ""}
      listings={storeListings}
      coinsCents={playtestCoinsCents}
      onClose={() => setActiveStore(null)}
      onBuy={(listing) => {
        if (onBuyStoreListing) {
          onBuyStoreListing(listing);
          return;
        }
        if (playtestCoinsCents < listing.priceCents) return;
        setBagStacks(addStorePurchaseToBag(bagStacks, listing));
        onPlaytestCoinsChange?.(playtestCoinsCents - listing.priceCents);
      }}
    />
  );

  const activeHomeBoard =
    activeHome != null
      ? zoneHomes.find((h) => h.elementId === activeHome.id) ?? {
          elementId: activeHome.id,
          zoneId: zone.id,
          label: activeHome.label || "House",
          monthlyFeeCents: activeHome.monthlyFeeCents,
          rotateDeg: activeHome.rotateDeg,
          leftPct: activeHome.leftPct,
          topPct: activeHome.topPct,
          widthPct: activeHome.widthPct,
          heightPct: activeHome.heightPct,
          imageUrl: activeHome.imageUrl,
          resident: null,
        }
      : null;

  const companionsOwnedForHome = useMemo(() => {
    const byId = new Map(stableListings.map((l) => [l.companionId, l]));
    return ownedCompanionIds.map((id) => {
      const listing = byId.get(id);
      const nick = companionNicknames[id]?.trim();
      return {
        id,
        name: nick || listing?.companion.name || "Companion",
      };
    });
  }, [ownedCompanionIds, stableListings, companionNicknames]);

  async function housingPost(body: Record<string, unknown>): Promise<{
    ok: boolean;
    error?: string;
    lease?: ExplorationHomeLeaseView;
    companionId?: string;
    dueCents?: number;
  }> {
    const id = guestId || housingGuestId;
    if (!id) return { ok: false, error: "Missing guest id." };
    try {
      const res = await fetch("/api/arcade/playtest/housing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, guestId: id, displayName: localPlayerName }),
      });
      const data = (await res.json()) as {
        error?: string;
        lease?: ExplorationHomeLeaseView;
        companionId?: string;
        dueCents?: number;
      };
      if (!res.ok) return { ok: false, error: data.error || "Request failed." };
      return { ok: true, ...data };
    } catch {
      return { ok: false, error: "Network error." };
    }
  }

  const homeMenu = (
    <ArcadeExplorationHomeMenu
      open={Boolean(activeHome)}
      houseLabel={activeHome?.label || activeHomeBoard?.label || "House"}
      boardRow={activeHomeBoard}
      myLease={homeLease}
      guestId={guestId || housingGuestId || ""}
      coinsCents={playtestCoinsCents}
      rentDueCents={
        homeLease && activeHome && homeLease.elementId === activeHome.id ? rentDueCents : 0
      }
      companionsOwned={companionsOwnedForHome}
      activeFollowerId={activeFollowerId || followerCompanion?.id || ""}
      activeMountId={activeMountId || mountCompanion?.id || ""}
      onClose={() => setActiveHome(null)}
      onEnter={() => {
        /* interior handled inside menu */
      }}
      onClaim={async () => {
        if (!activeHome) return "No house selected.";
        const res = await housingPost({ action: "claim", elementId: activeHome.id });
        if (!res.ok) return res.error || "Could not claim house.";
        if (res.lease) setHomeLease(res.lease);
        await refreshHousing();
        setActiveHome(null);
        return null;
      }}
      onLeave={async () => {
        const res = await housingPost({ action: "leave" });
        if (!res.ok) return res.error || "Could not leave home.";
        setHomeLease(null);
        await refreshHousing();
        setActiveHome(null);
        return null;
      }}
      onStoreCompanion={async (companionId) => {
        const res = await housingPost({ action: "storeCompanion", companionId });
        if (!res.ok) return res.error || "Could not store companion.";
        if (res.lease) setHomeLease(res.lease);
        onUnequipCompanionId?.(companionId);
        return null;
      }}
      onTakeCompanion={async (companionId) => {
        const res = await housingPost({ action: "takeCompanion", companionId });
        if (!res.ok) return res.error || "Could not take companion.";
        if (res.lease) setHomeLease(res.lease);
        return null;
      }}
      onPayRent={async () => {
        if (playtestCoinsCents < rentDueCents) {
          return `Need ${formatStablePriceCents(rentDueCents)}.`;
        }
        const res = await housingPost({ action: "payRent" });
        if (!res.ok) return res.error || "Could not pay rent.";
        const due = typeof res.dueCents === "number" ? res.dueCents : rentDueCents;
        onPlaytestCoinsChange?.(Math.max(0, playtestCoinsCents - due));
        setRentDueCents(0);
        if (res.lease) setHomeLease(res.lease);
        return null;
      }}
    />
  );

  const signDialogue = (
    <ArcadeExplorationSignDialogue
      open={Boolean(activeSign)}
      title={activeSign?.label || "Sign"}
      body={activeSign?.dialogueText || ""}
      imageUrl={activeSign?.imageUrl || ""}
      onClose={() => setActiveSign(null)}
    />
  );

  const simPlayerMenu = (
    <ArcadeExplorationSimPlayerMenu
      open={simMenuOpen || Boolean(activeRemotePeer)}
      name={activeRemotePeer?.name ?? simPlayerName}
      blocked={activeRemotePeer ? false : simBlocked}
      onClose={closePlayerMenus}
      onTrace={() => {
        if (activeRemotePeer) {
          setSocialTarget({
            kind: "peer",
            id: activeRemotePeer.id,
            name: activeRemotePeer.name,
          });
          setTraceTarget({ kind: "peer", id: activeRemotePeer.id });
        } else {
          setSocialTarget({ kind: "sim", name: simPlayerName });
          setTraceTarget({ kind: "sim" });
        }
      }}
      onTrade={() => {
        const target = activeRemotePeer
          ? {
              kind: "peer" as const,
              id: activeRemotePeer.id,
              name: activeRemotePeer.name,
            }
          : { kind: "sim" as const, name: simPlayerName };
        setSocialTarget(target);
        showEmoteSpeech(`Trade with ${target.name}`);
        setActivityLogLines((prev) =>
          appendActivityLogLines(prev, [
            makeActivityLogLine("system", `Trade requested with ${target.name}.`),
          ]),
        );
      }}
      onToggleBlock={
        activeRemotePeer
          ? undefined
          : () => setSimBlocked((v) => !v)
      }
      onPrivateMessage={() => {
        setChatFocusDm(activeRemotePeer?.name ?? simPlayerName);
        closePlayerMenus();
      }}
      onAddToParty={
        activeRemotePeer && onInviteToParty
          ? () => onInviteToParty(activeRemotePeer)
          : undefined
      }
    />
  );

  const menuNpc = pinNpc;
  const menuNpcName = menuNpc?.name ?? npcName;
  const menuNpcNotes = menuNpc?.notes ?? npcNotes;
  const menuNpcRole = menuNpc?.npcRole ?? npcRole;
  const menuNpcOffers = menuNpc?.offerItems ?? npcOfferItems;
  const menuNpcCompanions = menuNpc?.offerCompanions ?? npcOfferCompanions;
  const menuNpcRepairFee = menuNpc?.repairFeeCents ?? 500;

  const npcMenu = (
    <ArcadeExplorationNpcMenu
      open={npcMenuOpen}
      name={menuNpcName}
      notes={menuNpcNotes}
      npcRole={menuNpcRole}
      offerItems={menuNpcOffers}
      offerCompanions={menuNpcCompanions}
      coinsCents={playtestCoinsCents}
      ownedCompanionIds={ownedCompanionIds}
      repairFeeCents={menuNpcRepairFee}
      toolsForSale={tools}
      ownedTools={ownedTools}
      onClose={() => {
        setNpcMenuOpen(false);
        setPinNpc(null);
      }}
      onBuyOffer={(offer) => {
        if (onBuyNpcOffer) {
          onBuyNpcOffer(offer);
          return;
        }
        if (playtestCoinsCents < offer.priceCents) return;
        setBagStacks(addNpcOfferToBag(bagStacks, offer));
        onPlaytestCoinsChange?.(playtestCoinsCents - offer.priceCents);
      }}
      onBuyCompanionOffer={(offer) => {
        onBuyNpcCompanionOffer?.(offer);
      }}
      onTakeGift={(offer) => {
        if (onTakeNpcGift) {
          onTakeNpcGift(offer);
          return;
        }
        setBagStacks(addNpcOfferToBag(bagStacks, offer));
      }}
      onBuyTool={(tool, priceCents) => {
        if (playtestCoinsCents < priceCents) return;
        onPlaytestCoinsChange?.(playtestCoinsCents - priceCents);
        setOwnedTools([
          ...ownedTools,
          {
            instanceId: `owned-${tool.id}-${Date.now()}`,
            toolId: tool.id,
            durability: tool.durabilityMax,
          },
        ]);
      }}
      onRepairTool={(instanceId) => {
        if (playtestCoinsCents < menuNpcRepairFee) return;
        const catalogById = new Map(tools.map((t) => [t.id, t]));
        const owned = ownedTools.find((o) => o.instanceId === instanceId);
        if (!owned) return;
        const max = catalogById.get(owned.toolId)?.durabilityMax ?? owned.durability;
        onPlaytestCoinsChange?.(playtestCoinsCents - menuNpcRepairFee);
        setOwnedTools(
          ownedTools.map((o) =>
            o.instanceId === instanceId ? { ...o, durability: max } : o,
          ),
        );
      }}
    />
  );

  const bagMenu = (
    <ArcadeExplorationBagPanel
      open={bagOpen}
      stacks={bagStacks}
      avatarAppearance={playAppearance}
      avatarHairStyle={avatarHairStyle}
      tools={tools}
      ownedTools={ownedTools}
      clothing={clothing}
      ownedClothing={ownedClothing}
      equipment={equipment}
      avatarCatalog={avatarCatalog}
      onAppearanceChange={patchAppearance}
      avatarLoadout={playerAvatarLoadout}
      waterCatalog={waterCatalog}
      ownedWater={ownedWater}
      onClose={() => setBagOpen(false)}
    />
  );

  const fountainEmptyOrPartialCount = useMemo(
    () =>
      ownedWater.filter((o) => {
        const catalog = waterCatalog.find((c) => c.id === o.containerId);
        const cap = catalog?.capacityPts ?? DEFAULT_WATER_CONTAINER_CAPACITY;
        return o.fillPts < cap;
      }).length,
    [ownedWater, waterCatalog],
  );

  const fountainMenu = (
    <ArcadeExplorationFountainMenu
      open={Boolean(activeFountain)}
      containerCount={ownedWater.length}
      emptyOrPartialCount={fountainEmptyOrPartialCount}
      onClose={() => setActiveFountain(null)}
      onRefillAll={() => {
        refillAllWaterContainers();
        showEmoteSpeech("Refilled");
      }}
    />
  );

  const nightFilter = (
    <ArcadeExplorationNightFilter
      darkness01={nightDarkness01}
      lights={allNightLights}
      worldWidthPx={zone.worldWidthPx}
      worldHeightPx={zone.worldHeightPx}
      quality={graphicsQuality}
    />
  );

  const actionMenu = (
    <ArcadeExplorationActionMenu
      open={actionMenuOpen}
      onClose={() => setActionMenuOpen(false)}
      onAction={runExplorationAction}
      actionIcons={generalSettings.actionIcons}
      actionIconsAlt={generalSettings.actionIconsAlt}
      actionIconStretch={generalSettings.actionIconStretch}
      actionIconContext={{ emote: localEmote, moveGait }}
      selectedPlayerName={socialTarget?.name ?? null}
    />
  );

  const escapeMenus = (
    <>
      <ArcadeExplorationEscapeMenu
        open={escapeMenuOpen && !escapeSettingsOpen}
        onlineCount={onlineCount}
        onResume={() => {
          setEscapeMenuOpen(false);
          setEscapeSettingsOpen(false);
        }}
        onOpenSettings={() => setEscapeSettingsOpen(true)}
        onLogout={
          onLogout
            ? () => {
                setEscapeMenuOpen(false);
                setEscapeSettingsOpen(false);
                onLogout();
              }
            : undefined
        }
      />
      <ArcadeExplorationEscapeSettings
        open={escapeSettingsOpen}
        audio={effectiveAudio}
        onAudioChange={(next) => patchSessionAudio(next)}
        onBack={() => setEscapeSettingsOpen(false)}
      />
    </>
  );

  const customMenuPanel = (
    <ArcadeExplorationMenuPanel
      menu={customMenuOpen}
      open={Boolean(customMenuOpen)}
      onClose={() => setCustomMenuOpen(null)}
      onAction={handleCustomMenuAction}
      character={{
        name: localPlayerName,
        appearance: playAppearance,
        hairStyle: avatarHairStyle,
        level: xpProgress.level,
        xpText: `${xpProgress.xpIntoLevel} / ${xpProgress.xpForNext}`,
        unspentStatPoints,
        weightPoints,
        staminaPoints,
        hydrationPoints,
        carryMax,
        staminaMax,
        hydrationMax,
        onAddWeight: spendWeightStat,
        onAddStamina: spendStaminaStat,
        onAddHydration: spendHydrationStat,
      }}
      partyMatching={partyMatching}
      tools={{
        tools,
        ownedTools,
        equippedToolId: equippedOwned?.toolId || equippedToolId || "",
        onEquip: (id) => {
          const tool = tools.find((t) => t.id === id);
          const owned = ensureOwnedTool(id);
          const instance = owned.find((o) => o.toolId === id);
          if (instance && instance.durability <= 0) {
            showEmoteSpeech("Tool is broken");
            return;
          }
          applyEquipment(equipToolOntoLoadout(equipment, id, owned, tool?.heldHand, tools));
        },
        onUnequip: () => {
          applyEquipment(unequipToolFromLoadout(equipment));
        },
      }}
      inventory={{
        stacks: bagStacks,
        appearance: playAppearance,
        hairStyle: avatarHairStyle,
        tools,
        ownedTools,
        clothing,
        ownedClothing,
        equipment,
        avatarCatalog,
        avatarLoadout: playerAvatarLoadout,
        waterCatalog,
        ownedWater,
        onAppearanceChange: patchAppearance,
        onEquip: handleEquipToSlot,
        onUnequip: handleUnequipSlot,
        coinsCents: playtestCoinsCents,
      }}
      actionIcons={generalSettings.actionIcons}
      actionIconsAlt={generalSettings.actionIconsAlt}
      actionIconStretch={generalSettings.actionIconStretch}
      actionIconContext={{ emote: localEmote, moveGait }}
      hudScalePct={hudScalePct}
      onHudScalePctChange={(pct) => {
        const next = clampHudScalePct(pct);
        setHudScalePct(next);
        saveHudScalePct(next);
      }}
      graphicsQuality={graphicsQuality}
      onGraphicsQualityChange={(quality) => {
        setGraphicsQuality(quality);
        saveGraphicsQuality(quality);
      }}
      menuSafePad={generalSettings.menuSafePad}
      musicVolume={effectiveAudio.musicVolume}
      ambientVolume={effectiveAudio.ambientVolume ?? effectiveAudio.musicVolume}
      sfxVolume={effectiveAudio.sfxVolume}
      musicMuted={Boolean(effectiveAudio.musicMuted)}
      ambientMuted={Boolean(effectiveAudio.ambientMuted)}
      onMusicVolumeChange={(volume) => {
        patchSessionAudio({ musicVolume: Math.max(0, Math.min(1, volume)) });
      }}
      onAmbientVolumeChange={(volume) => {
        patchSessionAudio({ ambientVolume: Math.max(0, Math.min(1, volume)) });
      }}
      onSfxVolumeChange={(volume) => {
        patchSessionAudio({ sfxVolume: Math.max(0, Math.min(1, volume)) });
      }}
      onMusicMutedChange={(muted) => {
        patchSessionAudio({ musicMuted: muted });
      }}
      onAmbientMutedChange={(muted) => {
        patchSessionAudio({ ambientMuted: muted });
      }}
    />
  );

  const cargoMenu = cargoCompanion ? (
    <ArcadeExplorationCompanionCargoPanel
      open={cargoOpen}
      companionName={cargoCompanion.name}
      slots={cargoSlots}
      bagStacks={bagStacks}
      onClose={() => setCargoOpen(false)}
      onMoveBagToSlot={(stackIndex, slotIndex) => {
        const stack = bagStacks[stackIndex];
        if (!stack) return;
        const existing = cargoSlots[slotIndex];
        if (existing && existing.itemId !== stack.itemId) return;
        const stackMax = Math.max(1, existing?.stackMax || stack.stackMax || 1);
        const currentQty = existing?.quantity ?? 0;
        const room = stackMax - currentQty;
        if (room <= 0) return;
        const moveQty = Math.min(stack.quantity, room);
        const nextSlots = [...cargoSlots];
        nextSlots[slotIndex] = {
          itemId: stack.itemId,
          name: stack.name,
          imageUrl: stack.imageUrl,
          quantity: currentQty + moveQty,
          stackMax,
        };
        setCargoSlots(nextSlots);
        const nextBag = [...bagStacks];
        if (stack.quantity <= moveQty) nextBag.splice(stackIndex, 1);
        else nextBag[stackIndex] = { ...stack, quantity: stack.quantity - moveQty };
        setBagStacks(nextBag);
      }}
      onMoveSlotToBag={(slotIndex) => {
        const slot = cargoSlots[slotIndex];
        if (!slot) return;
        const nextSlots = [...cargoSlots];
        nextSlots[slotIndex] = null;
        setCargoSlots(nextSlots);
        const existing = bagStacks.findIndex((s) => s.itemId === slot.itemId);
        if (existing >= 0) {
          const nextBag = [...bagStacks];
          const cur = nextBag[existing]!;
          nextBag[existing] = {
            ...cur,
            quantity: Math.min(cur.stackMax, cur.quantity + slot.quantity),
          };
          setBagStacks(nextBag);
        } else {
          setBagStacks([
            ...bagStacks,
            {
              itemId: slot.itemId,
              name: slot.name,
              imageUrl: slot.imageUrl,
              quantity: slot.quantity,
              stackMax: slot.stackMax,
            },
          ]);
        }
      }}
    />
  ) : null;

  const companionMenu = (
    <ArcadeExplorationCompanionMenu
      open={companionMenuOpen}
      companion={followerCompanion ?? rideableCompanion}
      mounted={mounted}
      onClose={() => setCompanionMenuOpen(false)}
      onToggleMount={
        rideableCompanion
          ? () => {
              setMounted((m) => !m);
              setCompanionMenuOpen(false);
            }
          : undefined
      }
      onOpenCargo={cargoCompanion ? () => setCargoOpen(true) : undefined}
    />
  );

  const fullMapModal = (
    <ArcadeExplorationFullMapModal
      open={fullMapOpen}
      zone={zone}
      megaMap={megaAtlas}
      playerPos={megaAtlas ? megaPlayerPos : playerPos}
      waypoint={megaAtlas ? megaWaypoint : waypoint}
      markers={megaAtlas ? megaFullMapMarkers : fullMapMarkers}
      minimap={mapChrome}
      openMapZoomMin={generalSettings.openMapZoomMin}
      openMapZoomMax={generalSettings.openMapZoomMax}
      megaMapLoading={megaMapLoading}
      onSetWaypoint={(pos) => {
        if (!megaAtlas) {
          setWaypoint(pos);
          return;
        }
        // Only allow waypoints inside the current zone footprint on the atlas.
        const placement = megaAtlas.placements.find((p) => p.zoneId === zone.id);
        if (!placement) return;
        const local = megaPxToZoneLocal(
          pos,
          placement,
          megaAtlas.bounds,
          megaAtlas.tileWidthPx,
          megaAtlas.tileHeightPx,
          zone.worldWidthPx,
          zone.worldHeightPx,
        );
        if (!local) return;
        setWaypoint(local);
      }}
      onClearWaypoint={() => setWaypoint(null)}
      onClose={() => setFullMapOpen(false)}
    />
  );

  const hud = (
    <>
      {overlay?.backgroundImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={overlay.backgroundImageUrl}
          alt=""
          draggable={false}
          className={`${arcadeStageBackgroundClass} z-20`}
        />
      ) : null}

      {(overlay?.sections ?? []).map((section) => {
        const bgUrl = section.backgroundImageUrl?.trim() ?? "";
        if (!bgUrl) return null;
        const scaled = scaleHudSectionBox(
          {
            leftPct: section.leftPct,
            topPct: section.topPct,
            widthPct: section.widthPct,
            heightPct: section.heightPct,
          },
          parseHudAnchor(section.anchor),
          hudScalePct,
        );
        return (
          <div
            key={`hud-sec-bg-${section.id}`}
            className="pointer-events-none absolute z-[21] overflow-hidden"
            style={{
              left: `${scaled.leftPct}%`,
              top: `${scaled.topPct}%`,
              width: `${scaled.widthPct}%`,
              height: `${scaled.heightPct}%`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bgUrl}
              alt=""
              draggable={false}
              className={arcadeStageBackgroundClass}
            />
          </div>
        );
      })}

      {[
        ...(overlay?.hotspots ?? []).map((h) => ({
          h,
          box: {
            leftPct: h.leftPct,
            topPct: h.topPct,
            widthPct: h.widthPct,
            heightPct: h.heightPct,
          },
        })),
        ...(overlay?.sections ?? []).flatMap((section) =>
          section.hotspots.map((h) => ({
            h,
            box: stagePinBoxPct(h, section, hudScalePct),
          })),
        ),
      ].map(({ h, box }) => {
        const pinChrome = h.chrome ?? DEFAULT_OVERLAY_PIN_CHROME;
        const pinFrame: React.CSSProperties = {
          left: `${box.leftPct}%`,
          top: `${box.topPct}%`,
          width: `${box.widthPct}%`,
          height: `${box.heightPct}%`,
          ...overlayPinFrameStyle(h.shape ?? DEFAULT_OVERLAY_PIN_SHAPE, pinChrome),
        };
        const characterDisplayName = (() => {
          const n = localPlayerName.trim();
          if (!n || n.toLowerCase() === "you") return "Player";
          return n;
        })();
        if (h.kind === "EXPL_EXIT") {
          return (
            <button
              key={h.id}
              type="button"
              className="absolute z-30 flex items-center justify-center px-1 text-center font-black uppercase tracking-wide shadow-md hover:brightness-110"
              style={pinFrame}
              onClick={() => onExit?.()}
            >
              {h.label.trim() || "Exit"}
            </button>
          );
        }
        if (h.kind === "EXPL_OPEN_MAP") {
          return (
            <button
              key={h.id}
              type="button"
              className="absolute z-30 flex items-center justify-center px-1 text-center font-black uppercase tracking-wide shadow-md hover:brightness-110"
              style={pinFrame}
              onClick={() => setFullMapOpen(true)}
            >
              {h.label.trim() || "Map"}
            </button>
          );
        }
        if (h.kind === "EXPL_BAG") {
          return (
            <button
              key={h.id}
              type="button"
              className="absolute z-30 flex items-center justify-center px-1 text-center font-black uppercase tracking-wide shadow-md hover:brightness-110"
              style={pinFrame}
              onClick={() => setBagOpen(true)}
            >
              {h.label.trim() || "Bag"}
            </button>
          );
        }
        if (h.kind === "EXPL_MOUNT") {
          if (!rideableCompanion?.canRide) return null;
          return (
            <button
              key={h.id}
              type="button"
              className="absolute z-30 flex items-center justify-center px-1 text-center font-black uppercase tracking-wide shadow-md hover:brightness-110"
              style={pinFrame}
              onClick={() => setMounted((m) => !m)}
            >
              {h.label.trim() || (mounted ? "Dismount" : "Mount")}
            </button>
          );
        }
        if (h.kind === "EXPL_COMPANION_CARGO") {
          if (!hasCompanion) return null;
          return (
            <button
              key={h.id}
              type="button"
              className="absolute z-30 flex items-center justify-center px-1 text-center font-black uppercase tracking-wide shadow-md hover:brightness-110"
              style={pinFrame}
              onClick={() => {
                if (cargoCompanion) setCargoOpen(true);
                else setCompanionMenuOpen(true);
              }}
            >
              {h.label.trim() || (cargoCompanion ? "Cargo" : "Companion")}
            </button>
          );
        }
        if (h.kind === "EXPL_ACTION_MENU") {
          const menuId = h.openMenu?.menuId?.trim() || "";
          const customActions = menuId ? menus.find((m) => m.id === menuId) : null;
          return (
            <button
              key={h.id}
              type="button"
              className="absolute z-30 flex items-center justify-center px-1 text-center font-black uppercase tracking-wide shadow-md hover:brightness-110"
              style={pinFrame}
              onClick={() => {
                if (customActions) setCustomMenuOpen(customActions);
                else setActionMenuOpen(true);
              }}
            >
              {h.label.trim() || "Actions"}
            </button>
          );
        }
        if (h.kind === "EXPL_OPEN_MENU") {
          const menuId = h.openMenu.menuId;
          if (!menuId) return null;
          const menu = menus.find((m) => m.id === menuId);
          if (!menu) return null;
          return (
            <button
              key={h.id}
              type="button"
              className="absolute z-30 flex items-center justify-center px-1 text-center font-black uppercase tracking-wide shadow-md hover:brightness-110"
              style={pinFrame}
              onClick={() => setCustomMenuOpen(menu)}
            >
              {h.label.trim() || menu.name || "Menu"}
            </button>
          );
        }
        if (h.kind === "EXPL_PARTY_MATCH") {
          if (!onOpenPartyMatching) return null;
          return (
            <button
              key={h.id}
              type="button"
              className="absolute z-30 flex items-center justify-center px-1 text-center font-black uppercase tracking-wide shadow-md hover:brightness-110"
              style={pinFrame}
              onClick={() => onOpenPartyMatching()}
            >
              {h.label.trim() || "Party"}
            </button>
          );
        }
        if (h.kind === "EXPL_PORTRAIT") {
          if (!avatarAppearance) {
            return (
              <div
                key={h.id}
                className="pointer-events-none absolute z-30 flex items-center justify-center text-center font-black uppercase"
                style={pinFrame}
              >
                Face
              </div>
            );
          }
          return (
            <ArcadeExplorationHudPortrait
              key={h.id}
              appearance={avatarAppearance}
              hairStyle={avatarHairStyle}
              className="absolute z-30 shadow-md"
              style={pinFrame}
            />
          );
        }
        if (h.kind === "EXPL_STAMINA" || h.kind === "EXPL_HYDRATION" || h.kind === "EXPL_WEIGHT" || h.kind === "EXPL_XP") {
          const cfg = h.staminaBar;
          const hydrationEmpty =
            h.kind === "EXPL_HYDRATION" && hydrationHud.value <= 0;
          const pct = hydrationEmpty
            ? 100
            : h.kind === "EXPL_WEIGHT"
              ? Math.max(0, Math.min(100, weightLoadPct))
              : h.kind === "EXPL_XP"
                ? Math.max(0, Math.min(100, xpProgress.pct))
                : h.kind === "EXPL_HYDRATION"
                  ? Math.max(
                      0,
                      Math.min(
                        100,
                        (hydrationHud.value / Math.max(1, hydrationHud.max)) * 100,
                      ),
                    )
                  : Math.max(
                      0,
                      Math.min(100, (staminaHud.value / Math.max(1, staminaHud.max)) * 100),
                    );
          const ariaLabel =
            h.kind === "EXPL_WEIGHT"
              ? "Weight"
              : h.kind === "EXPL_XP"
                ? "Experience"
                : h.kind === "EXPL_HYDRATION"
                  ? "Hydration"
                  : "Stamina";
          const bgColor = hydrationEmpty
            ? hexToRgba(
                HYDRATION_EMPTY_WARNING.backgroundColor,
                HYDRATION_EMPTY_WARNING.backgroundOpacity,
              )
            : hexToRgba(cfg.backgroundColor, cfg.backgroundOpacity);
          const trackColor = hydrationEmpty
            ? hexToRgba(
                HYDRATION_EMPTY_WARNING.trackColor,
                HYDRATION_EMPTY_WARNING.trackOpacity,
              )
            : hexToRgba(cfg.trackColor, cfg.trackOpacity);
          const fillColor = hydrationEmpty
            ? HYDRATION_EMPTY_WARNING.fillColor
            : cfg.fillColor;
          return (
            <div
              key={h.id}
              className={`pointer-events-none absolute z-[45] ${hydrationEmpty ? "overflow-visible" : "overflow-hidden"} border-2`}
              style={{
                ...pinFrame,
                overflow: hydrationEmpty ? "visible" : "hidden",
                backgroundColor: bgColor,
                borderColor: hydrationEmpty
                  ? HYDRATION_EMPTY_WARNING.fillColor
                  : hexToRgba(cfg.borderColor, cfg.borderOpacity),
              }}
              aria-label={ariaLabel}
              role="progressbar"
              aria-valuenow={hydrationEmpty ? 0 : Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ backgroundColor: trackColor }}
              >
                <div
                  className="h-full transition-[width] duration-100"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: fillColor,
                  }}
                />
              </div>
              {hydrationEmpty ? (
                <div
                  className="pointer-events-none absolute left-0 top-[calc(100%+2px)] z-[46] w-max max-w-[min(280px,90vw)] rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight text-white shadow-md"
                  style={{
                    backgroundColor: hexToRgba(
                      HYDRATION_EMPTY_WARNING.backgroundColor,
                      0.95,
                    ),
                  }}
                >
                  {HYDRATION_EMPTY_WARNING.message}
                </div>
              ) : null}
            </div>
          );
        }
        if (h.kind === "EXPL_XP_TEXT") {
          const into = xpProgress.xpIntoLevel;
          const need = xpProgress.xpForNext;
          const align = overlayPinTextAlignStyles(pinChrome.textAlign ?? "center");
          return (
            <div
              key={h.id}
              className="pointer-events-none absolute z-30 flex items-center px-1 font-bold tabular-nums shadow"
              style={{ ...pinFrame, ...align }}
              aria-label="Experience"
              title={`Level ${xpProgress.level} · ${into} / ${need} XP to next`}
            >
              {into}/{need}
            </div>
          );
        }
        if (h.kind === "EXPL_COORDS") {
          const x = Math.round(
            playerPos?.x ?? (zone.spawnXPct / 100) * zone.worldWidthPx,
          );
          const y = Math.round(
            playerPos?.y ?? (zone.spawnYPct / 100) * zone.worldHeightPx,
          );
          return (
            <div
              key={h.id}
              className="pointer-events-none absolute z-30 flex items-center justify-center px-1 text-center font-bold tabular-nums shadow"
              style={pinFrame}
              aria-label="Coordinates"
            >
              {x}, {y}
            </div>
          );
        }
        if (h.kind === "EXPL_ZONE_NAME") {
          return (
            <div
              key={h.id}
              className="pointer-events-none absolute z-30 flex items-center justify-center px-1 text-center font-black uppercase tracking-wide shadow"
              style={pinFrame}
              title={zone.name}
            >
              <span className="truncate">{zone.name}</span>
            </div>
          );
        }
        if (h.kind === "EXPL_REGION_NAME") {
          return (
            <div
              key={h.id}
              className="pointer-events-none absolute z-30 flex items-center justify-center px-1 text-center font-black uppercase tracking-wide shadow"
              style={pinFrame}
              title={activeRegionName || "Outside named regions"}
              aria-label="Region name"
            >
              <span className="truncate">{activeRegionName || "—"}</span>
            </div>
          );
        }
        if (h.kind === "EXPL_CHAR_NAME") {
          const align = overlayPinTextAlignStyles(pinChrome.textAlign ?? "center");
          return (
            <div
              key={h.id}
              className="pointer-events-none absolute z-30 flex items-center px-1 font-black tracking-wide shadow"
              style={{ ...pinFrame, ...align }}
              title={characterDisplayName}
            >
              <span className="truncate">{characterDisplayName}</span>
            </div>
          );
        }
        if (h.kind === "EXPL_MINIMAP_ZOOM_IN") {
          return (
            <button
              key={h.id}
              type="button"
              className="absolute z-30 flex items-center justify-center font-black shadow-md hover:brightness-110"
              style={pinFrame}
              aria-label="Zoom minimap in"
              onClick={() => nudgeMinimapZoom("in")}
            >
              {h.label.trim() || "+"}
            </button>
          );
        }
        if (h.kind === "EXPL_MINIMAP_ZOOM_OUT") {
          return (
            <button
              key={h.id}
              type="button"
              className="absolute z-30 flex items-center justify-center font-black shadow-md hover:brightness-110"
              style={pinFrame}
              aria-label="Zoom minimap out"
              onClick={() => nudgeMinimapZoom("out")}
            >
              {h.label.trim() || "−"}
            </button>
          );
        }
        if (h.kind === "EXPL_TOOL_SLOT" || h.kind === "EXPL_MIDDLE_CLICK") {
          const isMiddleClick = h.kind === "EXPL_MIDDLE_CLICK";
          const slotIndex = isMiddleClick
            ? EXPLORATION_MIDDLE_CLICK_SLOT
            : h.toolSlot.slotIndex;
          const entry = hotbarSlots[slotIndex] ?? null;
          const tool =
            entry?.kind === "tool" ? tools.find((t) => t.id === entry.id) ?? null : null;
          const waterOwned =
            entry?.kind === "water"
              ? ownedWater.find((o) => o.instanceId === entry.id) ?? null
              : null;
          const waterContainer =
            waterOwned != null
              ? waterCatalog.find((c) => c.id === waterOwned.containerId) ?? null
              : null;
          const actionAltActive =
            entry?.kind === "action"
              ? explorationActionAltActive(entry.id, {
                  emote: localEmote,
                  moveGait,
                })
              : false;
          const actionHasAlt =
            entry?.kind === "action"
              ? Boolean(generalSettings.actionIconsAlt[entry.id]?.trim())
              : false;
          const actionIcon =
            entry?.kind === "action"
              ? resolveExplorationActionIcon({
                  actionId: entry.id,
                  icons: generalSettings.actionIcons,
                  iconsAlt: generalSettings.actionIconsAlt,
                  altActive: actionAltActive,
                })
              : "";
          const actionLabel =
            entry?.kind === "action"
              ? resolveExplorationActionLabel(entry.id, actionAltActive, actionHasAlt)
              : "";
          const equipped = Boolean(tool && tool.id === equippedToolId);
          const owned = tool ? ownedTools.find((o) => o.toolId === tool.id) : null;
          const broken = Boolean(owned && owned.durability <= 0);
          const flashing = flashingToolSlot === slotIndex;
          const iconSrc = tool
            ? explorationToolIconUrl(tool)
            : waterContainer
              ? explorationWaterIconUrl(waterContainer)
            : actionIcon;
          const iconStretch = tool
            ? tool.iconStretch
            : waterContainer
              ? waterContainer.iconStretch
            : entry?.kind === "action"
              ? Boolean(generalSettings.actionIconStretch[entry.id])
              : false;
          const waterFillLabel =
            waterOwned && waterContainer
              ? `${waterOwned.fillPts}/${Math.max(1, waterContainer.capacityPts)}`
              : null;
          const slotKey = isMiddleClick ? "Wheel" : String(slotIndex);
          const slotTitle = tool
            ? `${tool.name} (${slotKey}) · right-click clear`
            : waterContainer
              ? `${waterContainer.name} (${slotKey}) · ${playerInWaterArea ? "tap to refill" : "sip"} · right-click clear`
            : actionLabel
              ? `${actionLabel} (${slotKey}) · right-click clear`
              : isMiddleClick
                ? `Scroll wheel click · drop tool/action/water · right-click clear`
                : `Slot ${slotIndex} · drop tool/action/water · right-click clear`;
          return (
            <div
              key={h.id}
              data-expl-tool-slot={slotIndex}
              className={`absolute z-30 flex flex-col items-center justify-center shadow-md ${
                equipped ? "ring-2 ring-mango ring-offset-1" : ""
              } ${broken ? "ring-2 ring-red-500" : ""} ${
                entry?.kind === "action" ? "ring-1 ring-sky-400/50" : ""
              } ${entry?.kind === "water" ? "ring-1 ring-cyan-400/50" : ""}`}
              style={pinFrame}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const actionRaw =
                  e.dataTransfer.getData(EXPL_ACTION_DRAG_MIME) ||
                  (e.dataTransfer.getData("text/plain").startsWith("action:")
                    ? e.dataTransfer.getData("text/plain").slice("action:".length)
                    : "");
                if (isExplorationActionId(actionRaw)) {
                  const fromRaw = e.dataTransfer.getData("application/x-7thleg-expl-tool-slot");
                  const fromSlot = fromRaw !== "" ? Number(fromRaw) : -1;
                  setHotbarSlots((prev) => {
                    const next: Record<number, ExplorationHotbarEntry> = { ...prev };
                    next[slotIndex] = { kind: "action", id: actionRaw };
                    if (fromSlot >= 0 && fromSlot <= 9 && fromSlot !== slotIndex) {
                      delete next[fromSlot];
                    }
                    return next;
                  });
                  return;
                }
                const waterId = e.dataTransfer.getData(EXPL_WATER_DRAG_MIME);
                if (waterId && ownedWater.some((o) => o.instanceId === waterId)) {
                  const fromRaw = e.dataTransfer.getData("application/x-7thleg-expl-tool-slot");
                  const fromSlot = fromRaw !== "" ? Number(fromRaw) : -1;
                  setHotbarSlots((prev) => {
                    const next: Record<number, ExplorationHotbarEntry> = { ...prev };
                    next[slotIndex] = { kind: "water", id: waterId };
                    if (fromSlot >= 0 && fromSlot <= 9 && fromSlot !== slotIndex) {
                      delete next[fromSlot];
                    }
                    return next;
                  });
                  return;
                }
                const id =
                  e.dataTransfer.getData(EXPL_TOOL_DRAG_MIME) ||
                  e.dataTransfer.getData("text/plain");
                if (!id || !tools.some((t) => t.id === id)) return;
                const fromRaw = e.dataTransfer.getData("application/x-7thleg-expl-tool-slot");
                const fromSlot = fromRaw !== "" ? Number(fromRaw) : -1;
                setHotbarSlots((prev) => {
                  const next: Record<number, ExplorationHotbarEntry> = { ...prev };
                  next[slotIndex] = { kind: "tool", id };
                  if (fromSlot >= 0 && fromSlot <= 9 && fromSlot !== slotIndex) {
                    delete next[fromSlot];
                  }
                  return next;
                });
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setHotbarSlots((prev) => {
                  const next = { ...prev };
                  delete next[slotIndex];
                  return next;
                });
                if (tool && equippedToolId === tool.id) onUnequipTool?.();
              }}
              title={slotTitle}
            >
              <button
                type="button"
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
                onClick={() => toggleToolSlot(slotIndex)}
                draggable={Boolean(entry)}
                onDragStart={(e) => {
                  if (!entry) {
                    e.preventDefault();
                    return;
                  }
                  if (entry.kind === "action") {
                    e.dataTransfer.setData(EXPL_ACTION_DRAG_MIME, entry.id);
                    e.dataTransfer.setData("text/plain", `action:${entry.id}`);
                  } else if (tool) {
                    e.dataTransfer.setData(EXPL_TOOL_DRAG_MIME, tool.id);
                    e.dataTransfer.setData("text/plain", tool.id);
                  } else if (entry.kind === "water") {
                    e.dataTransfer.setData(EXPL_WATER_DRAG_MIME, entry.id);
                    e.dataTransfer.setData("text/plain", entry.id);
                  } else {
                    e.preventDefault();
                    return;
                  }
                  e.dataTransfer.setData(
                    "application/x-7thleg-expl-tool-slot",
                    String(slotIndex),
                  );
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={(e) => {
                  if (e.dataTransfer.dropEffect === "none") {
                    setHotbarSlots((prev) => {
                      const next = { ...prev };
                      delete next[slotIndex];
                      return next;
                    });
                  }
                }}
              >
                {iconSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={iconSrc}
                    alt=""
                    className={
                      iconStretch
                        ? `h-full w-full ${explorationIconFitClass(true)}`
                        : `max-h-[70%] max-w-[70%] ${explorationIconFitClass(false)}`
                    }
                    draggable={false}
                  />
                ) : actionLabel ? (
                  <span className="text-[9px] font-black uppercase text-white/80">
                    {actionLabel.slice(0, 4)}
                  </span>
                ) : null}
                {broken ? (
                  <div className="pointer-events-none absolute inset-0 bg-red-500/40" />
                ) : null}
                {flashing ? (
                  <div className="pointer-events-none absolute inset-0 bg-sky-400/75" />
                ) : null}
                {waterFillLabel ? (
                  <span className="pointer-events-none absolute bottom-0 right-0 rounded-tl bg-sky-800/90 px-0.5 text-[7px] font-black text-white">
                    {waterFillLabel}
                  </span>
                ) : null}
              </button>
            </div>
          );
        }
        if (h.kind === "EXPL_CHAT" || h.kind === "EXPL_ACTIVITY_LOG") {
          // Live chat panel is rendered once below; pin only places it.
          return null;
        }
        if (h.kind === "EXPL_MINIMAP") {
          const from = playerPos ?? {
            x: (zone.spawnXPct / 100) * zone.worldWidthPx,
            y: (zone.spawnYPct / 100) * zone.worldHeightPx,
          };
          const liveMinimap = { ...h.minimap, viewPct: mapChrome.viewPct };
          const waypointOnMinimap = waypoint
            ? isWaypointOnMinimap(
                from,
                waypoint,
                zone.worldWidthPx,
                zone.worldHeightPx,
                liveMinimap.viewPct,
                liveMinimap.shape,
              )
            : false;
          const homeOnMinimap = homeWorldPos
            ? isWaypointOnMinimap(
                from,
                homeWorldPos,
                zone.worldWidthPx,
                zone.worldHeightPx,
                liveMinimap.viewPct,
                liveMinimap.shape,
              )
            : false;
          const rim =
            waypoint && !fullMapOpen && !waypointOnMinimap
              ? minimapRimArrowStyle(from, waypoint, liveMinimap.shape)
              : null;
          const homeRim =
            homeWorldPos && !fullMapOpen && !homeOnMinimap
              ? minimapRimArrowStyle(from, homeWorldPos, liveMinimap.shape)
              : null;
          return (
            <div
              key={h.id}
              className="pointer-events-none absolute z-30"
              style={{ ...pinFrame, backgroundColor: "transparent" }}
              aria-label={h.label.trim() || "Minimap"}
            >
              <div
                className="absolute inset-0 shadow-md"
                style={{
                  ...overlayPinShapeStyle(h.shape ?? DEFAULT_OVERLAY_PIN_SHAPE),
                  borderStyle: "solid",
                  borderWidth: pinChrome.borderWidthPx,
                  borderColor: pinFrame.borderColor,
                }}
              >
                <ArcadeExplorationMapFace
                  zone={zone}
                  playerPos={playerPos}
                  waypoint={waypoint}
                  markers={minimapMarkers}
                  className="size-full"
                  mode="follow"
                  minimap={liveMinimap}
                />
              </div>
              {rim ? (
                <div
                  className="absolute z-10 drop-shadow"
                  style={{
                    left: `${rim.leftPct}%`,
                    top: `${rim.topPct}%`,
                    transform: `translate(-50%, -50%) rotate(${rim.rotateDeg}deg)`,
                  }}
                  aria-hidden
                >
                  <svg
                    width={liveMinimap.arrowSizePx}
                    height={liveMinimap.arrowSizePx}
                    viewBox="0 0 14 14"
                    className="overflow-visible"
                  >
                    <path
                      d="M2 2 L12 7 L2 12 L4.5 7 Z"
                      fill={liveMinimap.arrowColor}
                      stroke="#fff"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              ) : null}
              {homeRim ? (
                <div
                  className="absolute z-10 drop-shadow"
                  style={{
                    left: `${homeRim.leftPct}%`,
                    top: `${homeRim.topPct}%`,
                    transform: `translate(-50%, -50%) rotate(${homeRim.rotateDeg}deg)`,
                  }}
                  aria-label="Home direction"
                >
                  <svg
                    width={Math.max(18, liveMinimap.arrowSizePx + 4)}
                    height={Math.max(18, liveMinimap.arrowSizePx + 4)}
                    viewBox="0 0 20 20"
                    className="overflow-visible"
                  >
                    <path
                      d="M2 4 L18 10 L2 16 L5.5 10 Z"
                      fill="#fb7185"
                      stroke="#fff"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                    />
                    <g transform="translate(7.2 6.2) scale(0.55)">
                      <path
                        d="M8 2 L14 7 V14 H10 V10 H6 V14 H2 V7 Z"
                        fill="#fff"
                        stroke="#be123c"
                        strokeWidth="0.8"
                      />
                    </g>
                  </svg>
                </div>
              ) : null}
            </div>
          );
        }
        return (
          <div
            key={h.id}
            className="pointer-events-none absolute z-30 flex items-center justify-center text-center font-black uppercase tracking-wide drop-shadow"
            style={pinFrame}
          >
            {h.label}
          </div>
        );
      })}

      {overlay?.overheadImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={overlay.overheadImageUrl}
          alt=""
          draggable={false}
          className={`${arcadeStageBackgroundClass} pointer-events-none z-40`}
        />
      ) : null}

      {(overlay?.sections ?? []).map((section) => {
        const fgUrl = section.overheadImageUrl?.trim() ?? "";
        if (!fgUrl) return null;
        const scaled = scaleHudSectionBox(
          {
            leftPct: section.leftPct,
            topPct: section.topPct,
            widthPct: section.widthPct,
            heightPct: section.heightPct,
          },
          parseHudAnchor(section.anchor),
          hudScalePct,
        );
        return (
          <div
            key={`hud-sec-fg-${section.id}`}
            className="pointer-events-none absolute z-[41] overflow-hidden"
            style={{
              left: `${scaled.leftPct}%`,
              top: `${scaled.topPct}%`,
              width: `${scaled.widthPct}%`,
              height: `${scaled.heightPct}%`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fgUrl}
              alt=""
              draggable={false}
              className={arcadeStageBackgroundClass}
            />
          </div>
        );
      })}
      <ArcadeExplorationChatPanel
        key={`chat-${zone.id}`}
        layout={chatLayout}
        styleConfig={chatStyle}
        zoneName={zone.name}
        zoneId={zone.id}
        localName={localPlayerName}
        chatGuestId={chatGuestId || guestId}
        simPlayerName={simPlayerName}
        simulateOtherPlayer={simulateOtherPlayer}
        onZoneSay={handleZoneSay}
        focusDmUser={chatFocusDm}
        onFocusDmConsumed={() => setChatFocusDm(null)}
        partyId={partyId}
        partyChatMessages={partyChatMessages}
        onPartySay={onPartySay}
        remoteZoneMessages={remoteZoneMessages}
        typingPeerNames={typingPeerNames}
        onTypingChange={setChatTyping}
        realtimeChatActive={realtimeChatActive}
        realtimeChatMessages={realtimeChatMessages}
        onRealtimeChatSay={onRealtimeChatSay}
        highlightSpeakerNames={[
          ...(gmFlags?.highlight ? [localPlayerName] : []),
          ...remotePeers
            .filter((p) => p.highlight || p.isGm)
            .map((p) => p.name),
        ]}
      />
      <ArcadeExplorationActivityLogPanel
        key={`activity-log-${zone.id}`}
        layout={activityLogLayout}
        styleConfig={activityLogStyle}
        lines={activityLogLines}
      />

      {onOpenPartyMatching && !overlayHasPartyPin ? (
        <div className="absolute bottom-3 left-3 z-30">
          <button
            type="button"
            className={`${btnSecondarySm} bg-white/90 shadow`}
            onClick={onOpenPartyMatching}
          >
            Parties (P)
            {partyFindBoostPct != null && partyFindBoostPct > 0
              ? ` (+${partyFindBoostPct}%)`
              : ""}
          </button>
        </div>
      ) : null}

      {!overlayHasMountPin && !overlayHasCargoPin && (rideableCompanion?.canRide || cargoCompanion) ? (
        <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-2">
          {rideableCompanion?.canRide ? (
            <button
              type="button"
              className={`${btnSecondarySm} bg-white/90 shadow`}
              onClick={() => setMounted((m) => !m)}
            >
              {mounted ? "Dismount" : `Mount ${rideableCompanion.name}`}
            </button>
          ) : null}
          {cargoCompanion ? (
            <button
              type="button"
              className={`${btnSecondarySm} bg-white/90 shadow`}
              onClick={() => setCargoOpen(true)}
            >
              {cargoCompanion.name} cargo
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const viewport = (
    <ArcadeExplorationViewport
      key={zone.id}
      zone={zone}
      graphicsQuality={graphicsQuality}
      spawnOverride={resolvedSpawnOverride}
      logoutMarkers={logoutMarkers}
      logoutMarkerImageUrl={generalSettings.logoutMarkerImageUrl ?? ""}
      logoutMarkerImageSizePx={
        generalSettings.logoutMarkerImageSizePx ?? 40
      }
      onTeleporterActivate={(el) => {
        closePlayerMenus();
        setNpcMenuOpen(false);
        setActiveStable(null);
        setActiveStore(null);
        setActiveHome(null);
        setActiveTeleporter(el);
      }}
      onStableActivate={(el) => {
        closePlayerMenus();
        setNpcMenuOpen(false);
        setActiveTeleporter(null);
        setActiveStore(null);
        setActiveHome(null);
        setCompanionMenuOpen(false);
        setActiveStable(el);
      }}
      onStoreActivate={(el) => {
        closePlayerMenus();
        setNpcMenuOpen(false);
        setActiveTeleporter(null);
        setActiveStable(null);
        setActiveHome(null);
        setCompanionMenuOpen(false);
        setActiveStore(el);
      }}
      onHomeActivate={(el) => {
        closePlayerMenus();
        setNpcMenuOpen(false);
        setActiveTeleporter(null);
        setActiveStable(null);
        setActiveStore(null);
        setCompanionMenuOpen(false);
        setActiveSign(null);
        setActiveHome(el);
        void refreshHousing();
      }}
      onSignActivate={(el) => {
        closePlayerMenus();
        setNpcMenuOpen(false);
        setActiveTeleporter(null);
        setActiveStable(null);
        setActiveStore(null);
        setActiveHome(null);
        setCompanionMenuOpen(false);
        setActiveSign(el);
      }}
      onFountainActivate={(el) => {
        closePlayerMenus();
        setNpcMenuOpen(false);
        setActiveTeleporter(null);
        setActiveStable(null);
        setActiveStore(null);
        setActiveHome(null);
        setActiveSign(null);
        setCompanionMenuOpen(false);
        setActiveFountain(el);
      }}
      hydrationSettings={generalSettings.hydration}
      hydrationMax={hydrationMax}
      regionDehydrationRatePerSec={activeRegionElement?.dehydrationRatePerSec ?? null}
      bodySettings={generalSettings.body}
      onHydrationChange={(value, max) => setHydrationHud({ value, max })}
      hydrationInject={hydrationInject}
      onCompanionActivate={() => {
        setActiveTeleporter(null);
        setActiveStable(null);
        setActiveStore(null);
        setActiveHome(null);
        setActiveSign(null);
        closePlayerMenus();
        setNpcMenuOpen(false);
        setCompanionMenuOpen(true);
      }}
      onPositionChange={setPlayerPos}
      onPoseChange={(pose) => {
        setPlayerFacingDeg(pose.facingDeg);
        if (pose.walking && localEmote === "sit") {
          clearLocalEmoteTimer();
          setLocalEmote(null);
        }
        onPoseChange?.(pose);
      }}
      avatarAppearance={playAppearance}
      avatarHairStyle={avatarHairStyle}
      avatarCatalog={avatarCatalog}
      localPlayerName={localPlayerName}
      remotePeers={remotePeers}
      onRemotePeerActivate={(peer) => {
        setActiveTeleporter(null);
        setActiveStable(null);
        setActiveStore(null);
        setActiveHome(null);
        setActiveSign(null);
        setCompanionMenuOpen(false);
        setNpcMenuOpen(false);
        setSimMenuOpen(false);
        setSocialTarget({ kind: "peer", id: peer.id, name: peer.name });
        setActiveRemotePeer(peer);
      }}
      onSocialTargetSelect={(target) => {
        setSocialTarget(target);
      }}
      onSimPositionChange={setSimPos}
      onNpcPositionChange={setNpcPos}
      simulateOtherPlayer={simulateOtherPlayer}
      simAppearance={simAppearance}
      simHairStyle={simHairStyle}
      simPlayerName={simPlayerName}
      localSpeech={localSpeech}
      simSpeech={simSpeech}
      simulateNpc={simulateNpc}
      npcAppearance={npcAppearance}
      npcHairStyle={npcHairStyle}
      npcName={npcName}
      npcAvatarLoadout={npcAvatarLoadout}
      npcWanderEnabled={npcWanderEnabled}
      npcWanderDistancePx={npcWanderDistancePx}
      npcIdleFacingDeg={npcIdleFacingDeg}
      onSimPlayerActivate={() => {
        setActiveTeleporter(null);
        setActiveStable(null);
        setActiveStore(null);
        setActiveHome(null);
        setCompanionMenuOpen(false);
        setNpcMenuOpen(false);
        setActiveRemotePeer(null);
        setSocialTarget({ kind: "sim", name: simPlayerName });
        setSimMenuOpen(true);
      }}
      simInteractOpen={simMenuOpen || Boolean(activeRemotePeer)}
      onNpcActivate={() => {
        setActiveTeleporter(null);
        setActiveStable(null);
        setActiveStore(null);
        setActiveHome(null);
        setCompanionMenuOpen(false);
        closePlayerMenus();
        setPinNpc(null);
        setNpcMenuOpen(true);
      }}
      onNpcPinActivate={(el) => {
        setActiveTeleporter(null);
        setActiveStable(null);
        setActiveStore(null);
        setActiveHome(null);
        setCompanionMenuOpen(false);
        closePlayerMenus();
        const linked = npcs.find((n) => n.id === el.npcId) ?? null;
        setPinNpc(linked);
        setNpcMenuOpen(true);
      }}
      npcInteractOpen={npcMenuOpen}
      zoomMin={generalSettings.zoomMin}
      zoomMax={generalSettings.zoomMax}
      characterCollisionRadiusPx={generalSettings.characterCollisionRadiusPx}
      characterCollisionMode={generalSettings.characterCollisionMode}
      staminaSettings={staminaSettings}
      weightSettings={generalSettings.weight}
      weightLoadPct={weightLoadPct}
      onStaminaChange={(value, max, running) => setStaminaHud({ value, max, running })}
      followerCompanion={followerCompanion}
      mountCompanion={mountCompanion}
      mounted={mounted}
      onMountedChange={setMounted}
      simFollowerCompanion={simulateOtherPlayer ? SIM_PLAYER_CAT_COMPANION : null}
      speechBubbleStyle={generalSettings.speechBubble}
      nameplatePlayerStyle={generalSettings.nameplatePlayer}
      nameplateNpcStyle={generalSettings.nameplateNpc}
      worldOverlay={gatherOverlay}
      nightFilter={nightFilter}
      heldToolImageUrl={heldToolImageUrl}
      heldToolImageSizePx={heldToolImageSizePx}
      heldToolPose={heldToolPose}
      heldToolFx={heldToolFx}
      heldLightImageUrl={heldLightImageUrl}
      heldLightImageSizePx={heldLightImageSizePx}
      heldLightPose={heldLightPose}
      heldLightFx={heldLightFx}
      heldLightHand={heldLightHand}
      avatarLoadout={playerAvatarLoadout}
      heldHand={heldHand}
      localEmote={localEmote}
      moveGait={moveGait}
      toolChopNonce={toolChopNonce}
      forceWalkTarget={forceWalkTarget}
      onCancelGather={cancelGatherTarget}
      onFootstep={() => playSfx("footstep")}
      traceTarget={traceTarget}
      onCancelTrace={() => setTraceTarget(null)}
      waterSpeedMult={playerWaterState?.speedMult ?? 1}
      playerWaterVisual={
        playerWaterState
          ? {
              wade: playerWaterState.wade,
              sinkPx: playerWaterState.sinkPx,
              tintHex: playerWaterState.settings.submergedTintHex,
              bodyOpacity: playerWaterState.settings.submergedBodyOpacity,
              depthPct: playerWaterState.settings.depthPct,
            }
          : null
      }
      gmNoclip={gmNoclip}
      gmFlySpeedMult={gmFlySpeedMult}
      gmGodMode={Boolean(gmFlags?.godMode)}
      teleportFxNonce={teleportFxNonce}
      localNameplateHighlight={Boolean(gmFlags?.highlight)}
    />
  );

  if (mobileFill) {
    return (
      <>
        <div className={`relative h-full w-full overflow-hidden bg-black ${className}`.trim()}>
          <div
            ref={browserZoomRootRef}
            className={`${arcadeStageMobileFillClass} size-full overflow-hidden`}
          >
            <div className="absolute inset-0 z-0">{viewport}</div>
            {hud}
          </div>
        </div>
        {teleporterMenu}
        {stableMenu}
        {storeMenu}
        {homeMenu}
        {signDialogue}
        {fountainMenu}
        {companionMenu}
        {simPlayerMenu}
        {npcMenu}
        {bagMenu}
        {actionMenu}
        {customMenuPanel}
        {cargoMenu}
        {fullMapModal}
        {escapeMenus}
      </>
    );
  }

  return (
    <>
      <div className={`flex min-h-0 w-full flex-col ${className}`.trim()}>
        <ArcadeStageViewport
          className={(viewportClassName || "min-h-[min(70vh,520px)] w-full").trim()}
        >
          <ArcadeStage fill={fill} className="overflow-hidden border-2 border-palm/30 bg-black shadow-lg">
            <div ref={browserZoomRootRef} className="absolute inset-0 z-0 size-full overflow-hidden">
              <div className="absolute inset-0 z-0 size-full">{viewport}</div>
              {hud}
            </div>
          </ArcadeStage>
        </ArcadeStageViewport>
      </div>
      {teleporterMenu}
      {stableMenu}
      {storeMenu}
      {homeMenu}
      {signDialogue}
      {fountainMenu}
      {companionMenu}
      {simPlayerMenu}
      {npcMenu}
      {bagMenu}
      {actionMenu}
      {customMenuPanel}
      {cargoMenu}
      {fullMapModal}
      {escapeMenus}
    </>
  );
}
