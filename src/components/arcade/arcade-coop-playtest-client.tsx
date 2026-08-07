"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  createPlaytestCharacterAction,
  selectPlaytestCharacterAction,
  type PlaytestCharacterReady,
} from "@/app/actions/game-arcade-playtest-character";
import { ArcadeExplorationShell } from "@/components/arcade/arcade-exploration-shell";
import { ArcadeExplorationAvatarPreview } from "@/components/arcade/arcade-exploration-avatar-preview";
import { ArcadeExplorationPartyPanel } from "@/components/arcade/arcade-exploration-party-panel";
import { ArcadeExplorationPartyInviteDialog } from "@/components/arcade/arcade-exploration-party-invite-dialog";
import { ArcadeForceLandscape } from "@/components/arcade/arcade-force-landscape";
import { ArcadeInstallAppPrompt } from "@/components/arcade/arcade-install-app-prompt";
import type { ExplorationRemotePeer } from "@/components/arcade/arcade-exploration-viewport";
import { EXPLORATION_PWA_NAME } from "@/lib/game-exploration-pwa-shared";
import {
  COOP_HEARTBEAT_MS,
  sanitizeDisplayName,
  type CoopLogoutMarkerView,
  type CoopPresenceActivity,
  type CoopPresencePeer,
} from "@/lib/game-exploration-coop-shared";
import {
  buildRealtimeCompanion,
  connectExplorationRealtime,
  getExplorationRealtimeWsUrl,
} from "@/lib/game-exploration-realtime-client";
import {
  SESSION_CLOSED_MESSAGE,
  type CoopCommandView,
  type CoopSessionScheduleView,
} from "@/lib/game-exploration-coop-session-shared";
import {
  defaultAppearanceFromCatalog,
  resolveAvatarLoadout,
  simNpcAppearanceFromCatalog,
  simPlayerAppearanceFromCatalog,
  type ExplorationAvatarAppearance,
  type ExplorationAvatarCatalogView,
  type ExplorationAvatarColorSlot,
  type ExplorationAvatarItemSlot,
} from "@/lib/game-exploration-avatar-shared";
import type {
  ExplorationForceTimeOfDay,
  ExplorationGeneralSettings,
} from "@/lib/game-exploration-settings-shared";
import type {
  ExplorationOverlayView,
  ExplorationTeleporterDestination,
  ExplorationZoneView,
} from "@/lib/game-exploration-shared";
import type { ExplorationCompanionView } from "@/lib/game-exploration-companions-shared";
import type { ExplorationStableListingView } from "@/lib/game-exploration-stable-shared";
import type { ExplorationStoreListingView } from "@/lib/game-exploration-store-shared";
import { addStorePurchaseToBag } from "@/lib/game-exploration-store-shared";
import {
  addNpcOfferToBag,
  type ExplorationNpcCompanionOfferView,
  type ExplorationNpcOfferView,
  type ExplorationNpcView,
} from "@/lib/game-exploration-npc-shared";
import type {
  ExplorationPartyBoardRow,
  ExplorationPartyChatMessageView,
  ExplorationPartyInviteView,
  ExplorationPartyView,
} from "@/lib/game-exploration-party-shared";
import type { ExplorationMegaMapView } from "@/lib/game-exploration-mega-map-shared";
import type { ExplorationMenuView } from "@/lib/game-exploration-menu-shared";
import type {
  ExplorationOwnedWaterContainer,
  ExplorationWaterContainerView,
} from "@/lib/game-exploration-water-shared";
import type {
  ExplorationBagStack,
  ExplorationOwnedTool,
  ExplorationToolView,
} from "@/lib/game-exploration-tools-shared";
import type { ArcadeHudClockConfig } from "@/lib/game-hud-clock";
import type { ExplorationCollectAreaView } from "@/lib/game-exploration-gather-shared";
import type {
  ExplorationBugContainerView,
  ExplorationBugView,
} from "@/lib/game-exploration-bugs-shared";
import {
  buildOwnedClothingFromPicks,
  clothingAvailableAtCreation,
  creationClothingPickId,
  creationClothingPickTint,
  defaultCreationClothingPicks,
  equipmentFromClothingPicks,
  EXPLORATION_CREATION_CLOTHING_SLOTS,
  parseCreationClothingPicks,
  setCreationClothingPick,
  type ExplorationClothingView,
  type ExplorationCreationClothingPicks,
  type ExplorationEquipmentLoadout,
  type ExplorationOwnedClothing,
} from "@/lib/game-exploration-equipment-shared";
import { mergeEquipmentIntoAvatarLoadout } from "@/lib/game-exploration-equipment";
import type { ExplorationHotbarLoadout } from "@/lib/game-exploration-shared";
import { formatGameCash } from "@/lib/game-arcade-gate";
import { arcadeCharacterCardClass } from "@/lib/arcade-surface-classes";
import { btnMainMd, btnSecondaryMd } from "@/lib/btn-theme-classes";
import type { GameCharacterSummary } from "@/lib/game-profile-shared";
import { US_STATE_OPTIONS, stateNameForCode } from "@/lib/game-us-states";

const PARTY_POLL_MS = 3000;
const INVENTORY_SAVE_DEBOUNCE_MS = 1500;
const NOTICE_DISMISS_MS = 6000;

type PlaytestNotice = { id: string; text: string };

/** Readable on any theme: uses button palette, not palm/ink (site theme can set those to light-on-light). */
const playtestFieldClass =
  "mt-1 w-full rounded-lg border-2 border-[var(--btn-main-bg)]/35 bg-[var(--btn-secondary-bg)] px-3 py-2 text-sm text-[var(--btn-secondary-fg)] outline-none focus:border-[var(--btn-main-bg)]";

type PartyJoinRequest = {
  id: string;
  partyId: string;
  fromGuestId: string;
  fromName: string;
};

type Step = "select" | "create" | "avatar" | "play";

type Props = {
  overlay: ExplorationOverlayView | null;
  zones: ExplorationZoneView[];
  /** Creation-eligible catalogue for player character step. */
  avatarCatalog: ExplorationAvatarCatalogView;
  /** Full active catalogue so NPC cosmetics resolve. */
  avatarCatalogFull?: ExplorationAvatarCatalogView;
  generalSettings: ExplorationGeneralSettings;
  hudClock?: ArcadeHudClockConfig | null;
  companions?: ExplorationCompanionView[];
  stableListings?: ExplorationStableListingView[];
  storeListings?: ExplorationStoreListingView[];
  tools?: ExplorationToolView[];
  clothing?: ExplorationClothingView[];
  npcs?: ExplorationNpcView[];
  megaMap?: ExplorationMegaMapView | null;
  menus?: ExplorationMenuView[];
  collectAreas?: ExplorationCollectAreaView[];
  bugsCatalog?: ExplorationBugView[];
  bugContainers?: ExplorationBugContainerView[];
  waterCatalog?: ExplorationWaterContainerView[];
  characters: GameCharacterSummary[];
  canCreateMore: boolean;
  sessionEpoch: number;
};

function peersToRemote(
  peers: CoopPresencePeer[],
  catalog: ExplorationAvatarCatalogView,
  companions: ExplorationCompanionView[],
  tools: ExplorationToolView[],
): ExplorationRemotePeer[] {
  return peers.map((p) => {
    const follower =
      companions.find((c) => c.id === p.companion?.followerId) ?? null;
    const mount = companions.find((c) => c.id === p.companion?.mountId) ?? null;
    const activity = p.companion?.activity ?? null;
    const tool = activity?.toolId
      ? (tools.find((t) => t.id === activity.toolId) ?? null)
      : null;
    return {
      id: p.id,
      name: p.displayName,
      appearance: p.appearance,
      hairStyle:
        catalog.hairStyles.find((h) => h.id === p.appearance.hairStyleId) ??
        catalog.hairStyles[0] ??
        null,
      x: p.x,
      y: p.y,
      facingDeg: p.facingDeg,
      walking: p.walking,
      followerCompanion: follower,
      mountCompanion: mount,
      mounted: Boolean(p.companion?.mounted && (mount?.canRide || follower?.canRide)),
      heldToolImageUrl: tool?.imageUrl ?? "",
      heldToolImageSizePx: tool?.heldImageSizePx ?? 20,
      heldToolPose: tool?.heldPose ?? null,
      heldToolFx: tool?.heldFx ?? null,
      heldHand: activity?.heldHand ?? tool?.heldHand ?? "right",
      emote: activity?.emote ?? null,
      speech: activity?.speech?.trim() || null,
      typing: Boolean(activity?.typing),
      zoneChatAt: activity?.zoneChat?.at ?? 0,
      zoneChatBody: activity?.zoneChat?.body ?? "",
    };
  });
}

export function ArcadeCoopPlaytestClient({
  overlay,
  zones,
  avatarCatalog,
  avatarCatalogFull,
  generalSettings,
  hudClock = null,
  companions = [],
  stableListings = [],
  storeListings = [],
  tools = [],
  clothing = [],
  npcs = [],
  megaMap = null,
  menus = [],
  collectAreas = [],
  bugsCatalog = [],
  bugContainers = [],
  waterCatalog = [],
  characters: initialCharacters,
  canCreateMore: initialCanCreateMore,
  sessionEpoch,
}: Props) {
  const [liveGeneralSettings, setLiveGeneralSettings] = useState(generalSettings);
  useEffect(() => {
    setLiveGeneralSettings(generalSettings);
  }, [generalSettings]);

  const playCatalog = avatarCatalogFull ?? avatarCatalog;
  const defaults = useMemo(() => defaultAppearanceFromCatalog(avatarCatalog), [avatarCatalog]);
  const creationClothing = useMemo(() => clothingAvailableAtCreation(clothing), [clothing]);
  const sim = useMemo(() => simPlayerAppearanceFromCatalog(avatarCatalog), [avatarCatalog]);
  const activeNpc = npcs[0] ?? null;
  const npcLook = useMemo(() => {
    if (activeNpc?.appearance) {
      const hair =
        playCatalog.hairStyles.find((h) => h.id === activeNpc.appearance!.hairStyleId) ??
        playCatalog.hairStyles[0] ??
        null;
      return { appearance: activeNpc.appearance, hairStyle: hair };
    }
    return simNpcAppearanceFromCatalog(playCatalog);
  }, [activeNpc, playCatalog]);
  const npcDisplayName = activeNpc?.name ?? "SimNPC";
  const npcNotes = activeNpc?.notes ?? "";
  const npcRole = activeNpc?.npcRole ?? "QUEST";
  const npcOfferItems = activeNpc?.offerItems ?? [];
  const npcOfferCompanions = activeNpc?.offerCompanions ?? [];
  const npcWanderEnabled = activeNpc?.wanderEnabled ?? true;
  const npcWanderDistancePx = activeNpc?.wanderDistance ?? 187;
  const npcIdleFacingDeg = activeNpc?.facingDeg ?? 90;
  const initialZoneId = useMemo(() => {
    const preferred = liveGeneralSettings.coopPlaytestDefaultZoneId?.trim() ?? "";
    if (preferred && zones.some((z) => z.id === preferred)) return preferred;
    return zones[0]?.id ?? "";
  }, [liveGeneralSettings.coopPlaytestDefaultZoneId, zones]);
  const [coinsCents, setCoinsCents] = useState(0);
  const [ownedCompanionIds, setOwnedCompanionIds] = useState<string[]>([]);
  const [companionNicknames, setCompanionNicknames] = useState<Record<string, string>>({});
  const [followerId, setFollowerId] = useState("");
  const [mountId, setMountId] = useState("");
  const [equippedToolId, setEquippedToolId] = useState("");
  const [ownedTools, setOwnedTools] = useState<ExplorationOwnedTool[]>([]);
  const [ownedClothing, setOwnedClothing] = useState<ExplorationOwnedClothing[]>([]);
  const [initialEquipment, setInitialEquipment] = useState<ExplorationEquipmentLoadout | null>(null);
  const [hotbarSlots, setHotbarSlots] = useState<ExplorationHotbarLoadout | null>(null);
  const [liveEquipment, setLiveEquipment] = useState<ExplorationEquipmentLoadout>({});
  const [clothingPicks, setClothingPicks] = useState<ExplorationCreationClothingPicks>(() =>
    defaultCreationClothingPicks(clothing),
  );
  const [bagStacks, setBagStacks] = useState<ExplorationBagStack[]>([]);
  const [ownedWater, setOwnedWater] = useState<ExplorationOwnedWaterContainer[]>([]);

  const followerCompanion = useMemo(() => {
    const c = companions.find((x) => x.id === followerId) ?? null;
    if (!c) return null;
    const nick = companionNicknames[c.id]?.trim();
    return nick ? { ...c, name: nick } : c;
  }, [companions, followerId, companionNicknames]);
  const mountCompanion = useMemo(() => {
    const c = companions.find((x) => x.id === mountId) ?? null;
    if (!c) return null;
    const nick = companionNicknames[c.id]?.trim();
    return nick ? { ...c, name: nick } : c;
  }, [companions, mountId, companionNicknames]);
  const [step, setStep] = useState<Step>(() =>
    initialCharacters.length > 0 ? "select" : "create",
  );
  const [playerId, setPlayerId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [characters, setCharacters] = useState(initialCharacters);
  const [canCreateMore, setCanCreateMore] = useState(initialCanCreateMore);
  const [createUsername, setCreateUsername] = useState("");
  const [createStateCode, setCreateStateCode] = useState("");
  const [characterPending, startCharacterTransition] = useTransition();
  const [appearance, setAppearance] = useState<ExplorationAvatarAppearance>(() => defaults.appearance);
  const [zoneId, setZoneId] = useState(initialZoneId);
  const [playKey, setPlayKey] = useState(0);
  const [notices, setNotices] = useState<PlaytestNotice[]>([]);
  const [remotePeers, setRemotePeers] = useState<ExplorationRemotePeer[]>([]);
  const [logoutMarkers, setLogoutMarkers] = useState<CoopLogoutMarkerView[]>([]);
  const [reclaimSpawn, setReclaimSpawn] = useState<{
    zoneId: string;
    x: number;
    y: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(1);

  const [partyOpen, setPartyOpen] = useState(false);
  const [partyPending, setPartyPending] = useState(false);
  const [myParty, setMyParty] = useState<ExplorationPartyView | null>(null);
  const [partyBoard, setPartyBoard] = useState<ExplorationPartyBoardRow[]>([]);
  const [partyInvites, setPartyInvites] = useState<ExplorationPartyInviteView[]>([]);
  const [joinRequests, setJoinRequests] = useState<PartyJoinRequest[]>([]);
  const [activeInvite, setActiveInvite] = useState<ExplorationPartyInviteView | null>(null);
  const [partyChat, setPartyChat] = useState<ExplorationPartyChatMessageView[]>([]);
  const [partyPresence, setPartyPresence] = useState<
    Array<{ id: string; name: string; zoneId: string; x: number; y: number }>
  >([]);

  useEffect(() => {
    if (step === "play") return;
    setZoneId(initialZoneId);
  }, [initialZoneId, step]);

  useEffect(() => {
    setCharacters(initialCharacters);
    setCanCreateMore(initialCanCreateMore);
  }, [initialCharacters, initialCanCreateMore]);

  const guestIdRef = useRef("");
  const starterGrantedRef = useRef(false);
  const sessionEpochRef = useRef(sessionEpoch);
  const noticeTimersRef = useRef<Map<string, number>>(new Map());
  const poseRef = useRef({ x: 0, y: 0, facingDeg: 0, walking: false, mounted: false });
  const realtimeConnectedRef = useRef(false);
  const realtimePublishRef = useRef<
    | ((snap: {
        x: number;
        y: number;
        facingDeg: number;
        walking: boolean;
        mounted: boolean;
        zoneId: string;
        displayName: string;
        appearance: ExplorationAvatarAppearance;
        companion: ReturnType<typeof buildRealtimeCompanion>;
      }) => void)
    | null
  >(null);
  const realtimePeersRef = useRef<Map<string, CoopPresencePeer>>(new Map());
  const appearanceRef = useRef(appearance);
  const displayNameRef = useRef(displayName);
  const zoneIdRef = useRef(zoneId);
  const followerIdRef = useRef(followerId);
  const mountIdRef = useRef(mountId);
  const activityRef = useRef<CoopPresenceActivity>({});

  appearanceRef.current = appearance;
  displayNameRef.current = displayName;
  zoneIdRef.current = zoneId;
  followerIdRef.current = followerId;
  mountIdRef.current = mountId;

  const avatarCatalogRef = useRef(avatarCatalog);
  const companionsRef = useRef(companions);
  const toolsRef = useRef(tools);
  avatarCatalogRef.current = avatarCatalog;
  companionsRef.current = companions;
  toolsRef.current = tools;

  const partyMemberGuestIds = useMemo(
    () => (myParty?.members.map((m) => m.guestId) ?? []).filter((id) => id !== guestIdRef.current),
    [myParty],
  );

  useEffect(() => {
    if (step !== "play" || !myParty?.members.length) {
      setPartyPresence([]);
      return;
    }
    const ids = myParty.members.map((m) => m.guestId);
    let cancelled = false;
    async function poll() {
      try {
        const q = encodeURIComponent(ids.join(","));
        const res = await fetch(`/api/arcade/playtest/presence?guestIds=${q}`);
        if (!res.ok) return;
        const data = (await res.json()) as { peers?: CoopPresencePeer[] };
        if (cancelled) return;
        setPartyPresence(
          (data.peers ?? []).map((p) => ({
            id: p.id,
            name: p.displayName,
            zoneId: p.zoneId,
            x: p.x,
            y: p.y,
          })),
        );
      } catch {
        /* ignore */
      }
    }
    void poll();
    const t = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [step, myParty]);

  const zone = useMemo(() => zones.find((z) => z.id === zoneId) ?? null, [zones, zoneId]);
  const zoneNameById = useMemo(
    () => Object.fromEntries(zones.map((z) => [z.id, z.name])),
    [zones],
  );
  const spawnOverride = useMemo(() => {
    if (!reclaimSpawn || !zone || reclaimSpawn.zoneId !== zone.id) return null;
    return { x: reclaimSpawn.x, y: reclaimSpawn.y };
  }, [reclaimSpawn, zone]);
  const hairStyle =
    avatarCatalog.hairStyles.find((h) => h.id === appearance.hairStyleId) ?? defaults.hairStyle;

  const creationPreviewLoadout = useMemo(() => {
    const base = resolveAvatarLoadout(appearance, avatarCatalog);
    const equip = equipmentFromClothingPicks(clothing, clothingPicks);
    return mergeEquipmentIntoAvatarLoadout(base, equip, clothing);
  }, [appearance, avatarCatalog, clothing, clothingPicks]);

  const colorsBySlot = useMemo(() => {
    const map: Record<ExplorationAvatarColorSlot, typeof avatarCatalog.colors> = {
      HAIR: [],
      SKIN: [],
      SHIRT: [],
      PANTS: [],
    };
    for (const c of avatarCatalog.colors) map[c.slot].push(c);
    return map;
  }, [avatarCatalog.colors]);

  const itemsBySlot = useMemo(() => {
    const map: Partial<Record<ExplorationAvatarItemSlot, typeof avatarCatalog.items>> = {};
    for (const item of avatarCatalog.items) {
      (map[item.slot] ??= []).push(item);
    }
    return map;
  }, [avatarCatalog.items]);

  useEffect(() => {
    sessionEpochRef.current = sessionEpoch;
  }, [sessionEpoch]);

  const pushNotice = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setNotices((prev) => [...prev.slice(-2), { id, text: trimmed }]);
    const timer = window.setTimeout(() => {
      setNotices((prev) => prev.filter((n) => n.id !== id));
      noticeTimersRef.current.delete(id);
    }, NOTICE_DISMISS_MS);
    noticeTimersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    const timers = noticeTimersRef.current;
    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const applyInventoryFromView = useCallback(
    (inventory: PlaytestCharacterReady["inventory"]) => {
      setCoinsCents(inventory.cashCents);
      setOwnedTools(inventory.tools);
      setOwnedClothing(inventory.clothing);
      setBagStacks(inventory.bagStacks);
      setOwnedWater(inventory.waterContainers ?? []);
      setOwnedCompanionIds(inventory.companionIds);
      setFollowerId(inventory.followerId ?? "");
      setMountId(inventory.mountId ?? "");
      starterGrantedRef.current = inventory.starterGranted;
      setAppearance(inventory.appearance ?? defaults.appearance);
      setClothingPicks(
        inventory.clothingPicks
          ? parseCreationClothingPicks(inventory.clothingPicks)
          : defaultCreationClothingPicks(clothing),
      );
      setInitialEquipment(
        Object.keys(inventory.equipment ?? {}).length > 0 ? inventory.equipment : null,
      );
      setLiveEquipment(inventory.equipment ?? {});
      setHotbarSlots(inventory.hotbar ?? null);
    },
    [clothing, defaults.appearance],
  );

  const resetToCharacterFlow = useCallback(() => {
    setPlayerId("");
    setDisplayName("");
    guestIdRef.current = "";
    setCoinsCents(0);
    setOwnedTools([]);
    setOwnedClothing([]);
    setBagStacks([]);
    setOwnedWater([]);
    setOwnedCompanionIds([]);
    setFollowerId("");
    setMountId("");
    setEquippedToolId("");
    setInitialEquipment(null);
    setLiveEquipment({});
    setHotbarSlots(null);
    setClothingPicks(defaultCreationClothingPicks(clothing));
    setAppearance(defaults.appearance);
    starterGrantedRef.current = false;
    setCompanionNicknames({});
    setReclaimSpawn(null);
    setRemotePeers([]);
    setLogoutMarkers([]);
    setStep(characters.length > 0 ? "select" : "create");
  }, [characters.length, clothing, defaults.appearance]);

  const handleRespawnHome = useCallback(async () => {
    try {
      const res = await fetch("/api/arcade/playtest/housing", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { lease?: { zoneId?: string } | null };
        const homeZoneId = data.lease?.zoneId?.trim();
        if (homeZoneId && zones.some((z) => z.id === homeZoneId)) {
          setZoneId(homeZoneId);
        } else {
          setZoneId(initialZoneId);
        }
      } else {
        setZoneId(initialZoneId);
      }
    } catch {
      setZoneId(initialZoneId);
    }
    setReclaimSpawn(null);
    setRemotePeers([]);
    setLogoutMarkers([]);
    setPlayKey((k) => k + 1);
  }, [initialZoneId, zones]);

  useEffect(() => {
    if (step !== "play") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [step]);

  const leave = useCallback(() => {
    const id = guestIdRef.current;
    if (!id) return;
    const pose = poseRef.current;
    const body = JSON.stringify({
      id,
      displayName: sanitizeDisplayName(displayNameRef.current),
      appearance: appearanceRef.current,
      pose: {
        x: pose.x,
        y: pose.y,
        facingDeg: pose.facingDeg,
        walking: false,
        zoneId: zoneIdRef.current,
      },
    });
    void fetch(`/api/arcade/playtest/presence?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, []);

  const applyCommands = useCallback(
    (commands: CoopCommandView[]) => {
      for (const cmd of commands) {
        switch (cmd.kind) {
          case "NOTICE":
            if (cmd.message) pushNotice(cmd.message);
            break;
          case "KICK":
            leave();
            resetToCharacterFlow();
            setError(cmd.message ?? SESSION_CLOSED_MESSAGE);
            break;
          case "FORCE_RELOAD":
            window.location.reload();
            break;
          case "RESPAWN_ZONE":
            setReclaimSpawn(null);
            setZoneId(initialZoneId);
            setRemotePeers([]);
            setLogoutMarkers([]);
            setPlayKey((k) => k + 1);
            break;
          case "RESPAWN_HOME":
            void handleRespawnHome();
            break;
          case "GRANT_FLASK":
            if (cmd.flask) {
              const granted = cmd.flask;
              setOwnedWater((prev) =>
                prev.some((w) => w.instanceId === granted.instanceId)
                  ? prev
                  : [...prev, granted],
              );
              if (cmd.message) pushNotice(cmd.message);
            }
            break;
          default:
            break;
        }
      }
    },
    [handleRespawnHome, initialZoneId, leave, pushNotice, resetToCharacterFlow],
  );

  const refreshParty = useCallback(async () => {
    const id = guestIdRef.current;
    if (!id) return;
    try {
      const res = await fetch(
        `/api/arcade/playtest/party?guestId=${encodeURIComponent(id)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        party?: ExplorationPartyView | null;
        board?: ExplorationPartyBoardRow[];
        invites?: ExplorationPartyInviteView[];
        joinRequests?: PartyJoinRequest[];
        chat?: ExplorationPartyChatMessageView[];
      };
      setMyParty(data.party ?? null);
      setPartyBoard(data.board ?? []);
      setPartyInvites(data.invites ?? []);
      setJoinRequests(data.joinRequests ?? []);
      setPartyChat(data.chat ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const partyAction = useCallback(
    async (body: Record<string, unknown>) => {
      const id = guestIdRef.current;
      const name = sanitizeDisplayName(displayNameRef.current);
      if (!id || !name) return { ok: false as const, error: "Not ready." };
      setPartyPending(true);
      try {
        const res = await fetch("/api/arcade/playtest/party", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, guestId: id, displayName: name }),
        });
        const data = (await res.json()) as { error?: string; party?: ExplorationPartyView | null };
        if (!res.ok) return { ok: false as const, error: data.error ?? "Request failed." };
        await refreshParty();
        return { ok: true as const, party: data.party ?? null };
      } catch {
        return { ok: false as const, error: "Network error." };
      } finally {
        setPartyPending(false);
      }
    },
    [refreshParty],
  );

  useEffect(() => {
    if (step !== "play") return;
    const onUnload = () => leave();
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      leave();
    };
  }, [step, leave]);

  useEffect(() => {
    if (step !== "play") return;
    let cancelled = false;
    let timer = 0;

    const beat = async () => {
      const id = guestIdRef.current;
      const name = sanitizeDisplayName(displayNameRef.current);
      if (!id || !name || !zoneIdRef.current) return;
      const pose = poseRef.current;
      try {
        const res = await fetch("/api/arcade/playtest/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            displayName: name,
            appearance: appearanceRef.current,
            pose: {
              x: pose.x,
              y: pose.y,
              facingDeg: pose.facingDeg,
              walking: pose.walking,
              zoneId: zoneIdRef.current,
            },
            companion: {
              followerId: followerIdRef.current || undefined,
              mountId: mountIdRef.current || undefined,
              mounted: pose.mounted,
              activity: activityRef.current,
            },
          }),
        });
        let data: {
          peers?: CoopPresencePeer[];
          logoutMarkers?: CoopLogoutMarkerView[];
          commands?: CoopCommandView[];
          session?: { open?: boolean; epoch?: number };
          schedule?: CoopSessionScheduleView | null;
          forceTimeOfDay?: ExplorationForceTimeOfDay | null;
          error?: string;
          code?: string;
        };
        try {
          data = (await res.json()) as typeof data;
        } catch {
          return;
        }
        if (cancelled) return;

        if (Array.isArray(data.commands)) {
          applyCommands(data.commands);
        }

        if ("forceTimeOfDay" in data) {
          const nextForce = data.forceTimeOfDay ?? null;
          setLiveGeneralSettings((prev) => {
            const prevForce = prev.dayNight.forceTimeOfDay;
            const same =
              (prevForce == null && nextForce == null) ||
              (prevForce != null &&
                nextForce != null &&
                prevForce.mode === nextForce.mode &&
                prevForce.setAtBps === nextForce.setAtBps &&
                prevForce.untilBps === nextForce.untilBps &&
                prevForce.startedAtMs === nextForce.startedAtMs &&
                prevForce.transitionMs === nextForce.transitionMs);
            if (same) return prev;
            return {
              ...prev,
              dayNight: { ...prev.dayNight, forceTimeOfDay: nextForce },
            };
          });
        }

        if (
          typeof data.session?.epoch === "number" &&
          data.session.epoch > sessionEpochRef.current
        ) {
          window.location.reload();
          return;
        }

        if (!res.ok) {
          if (data.code === "SESSION_CLOSED") {
            setError(data.error ?? SESSION_CLOSED_MESSAGE);
            leave();
            resetToCharacterFlow();
          }
          return;
        }

        const peers = data.peers ?? [];
        setLogoutMarkers(data.logoutMarkers ?? []);
        // Dedicated WS owns live peer poses when connected; HTTP keeps DB + commands.
        if (!realtimeConnectedRef.current) {
          setRemotePeers(peersToRemote(peers, avatarCatalog, companions, tools));
          setOnlineCount(peers.length + 1);
        } else {
          setOnlineCount(realtimePeersRef.current.size + 1);
        }
      } catch {
        /* ignore transient network errors during playtest */
      }
    };

    void beat();
    timer = window.setInterval(() => void beat(), COOP_HEARTBEAT_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [step, avatarCatalog, companions, tools, applyCommands, leave, resetToCharacterFlow]);

  useEffect(() => {
    if (step !== "play" || !playerId) return;
    const wsUrl = getExplorationRealtimeWsUrl();
    if (!wsUrl) return;

    const name = sanitizeDisplayName(displayNameRef.current);
    if (!name || !zoneIdRef.current) return;

    const applyRealtimePeers = () => {
      const peers = [...realtimePeersRef.current.values()];
      setRemotePeers(
        peersToRemote(
          peers,
          avatarCatalogRef.current,
          companionsRef.current,
          toolsRef.current,
        ),
      );
      setOnlineCount(peers.length + 1);
    };

    const pose = poseRef.current;
    const ctrl = connectExplorationRealtime(
      wsUrl,
      {
        id: playerId,
        displayName: name,
        appearance: appearanceRef.current,
        zoneId: zoneIdRef.current,
        pose: {
          x: pose.x,
          y: pose.y,
          facingDeg: pose.facingDeg,
          walking: pose.walking,
        },
        companion: buildRealtimeCompanion({
          followerId: followerIdRef.current,
          mountId: mountIdRef.current,
          mounted: pose.mounted,
          activity: activityRef.current,
        }),
      },
      {
        onPeers: (peers) => {
          realtimePeersRef.current = new Map(peers.map((p) => [p.id, p]));
          applyRealtimePeers();
        },
        onPeerUpdate: (peer) => {
          if (peer.zoneId && peer.zoneId !== zoneIdRef.current) {
            realtimePeersRef.current.delete(peer.id);
          } else {
            realtimePeersRef.current.set(peer.id, peer);
          }
          applyRealtimePeers();
        },
        onPeerLeft: (id) => {
          realtimePeersRef.current.delete(id);
          applyRealtimePeers();
        },
        onStatus: (ok) => {
          realtimeConnectedRef.current = ok;
          if (!ok) realtimePeersRef.current.clear();
        },
      },
    );

    realtimePublishRef.current = ctrl.publishPose;

    return () => {
      realtimePublishRef.current = null;
      realtimeConnectedRef.current = false;
      realtimePeersRef.current.clear();
      ctrl.stop();
    };
    // Reconnect only on play identity / zone; catalogs via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, playerId, zoneId]);

  useEffect(() => {
    if (step !== "play" || !playerId) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/arcade/playtest/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashCents: coinsCents,
          bagStacks,
          tools: ownedTools,
          clothing: ownedClothing,
          waterContainers: ownedWater,
          companionIds: ownedCompanionIds,
          followerId: followerId || null,
          mountId: mountId || null,
          equipment: liveEquipment,
          ...(hotbarSlots != null ? { hotbar: hotbarSlots } : {}),
        }),
      }).catch(() => {});
    }, INVENTORY_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [
    step,
    playerId,
    coinsCents,
    bagStacks,
    ownedTools,
    ownedClothing,
    ownedWater,
    ownedCompanionIds,
    followerId,
    mountId,
    liveEquipment,
    hotbarSlots,
  ]);

  useEffect(() => {
    if (step !== "play") {
      setPartyOpen(false);
      setActiveInvite(null);
      setMyParty(null);
      setPartyBoard([]);
      setPartyInvites([]);
      setJoinRequests([]);
      setPartyChat([]);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await refreshParty();
    };
    void tick();
    const timer = window.setInterval(() => void tick(), PARTY_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [step, refreshParty]);

  useEffect(() => {
    if (partyInvites.length === 0) {
      setActiveInvite(null);
      return;
    }
    setActiveInvite((prev) => {
      if (prev && partyInvites.some((i) => i.id === prev.id)) return prev;
      return partyInvites[0] ?? null;
    });
  }, [partyInvites]);

  const pushRealtimePose = useCallback(() => {
    const publish = realtimePublishRef.current;
    if (!publish) return;
    const pose = poseRef.current;
    publish({
      x: pose.x,
      y: pose.y,
      facingDeg: pose.facingDeg,
      walking: pose.walking,
      mounted: pose.mounted,
      zoneId: zoneIdRef.current,
      displayName: sanitizeDisplayName(displayNameRef.current),
      appearance: appearanceRef.current,
      companion: buildRealtimeCompanion({
        followerId: followerIdRef.current,
        mountId: mountIdRef.current,
        mounted: pose.mounted,
        activity: activityRef.current,
      }),
    });
  }, []);

  const handlePoseChange = useCallback(
    (pose: {
      x: number;
      y: number;
      facingDeg: number;
      walking: boolean;
      mounted?: boolean;
    }) => {
      poseRef.current = {
        x: pose.x,
        y: pose.y,
        facingDeg: pose.facingDeg,
        walking: pose.walking,
        mounted: Boolean(pose.mounted),
      };
      pushRealtimePose();
    },
    [pushRealtimePose],
  );

  const handleActivityChange = useCallback(
    (activity: CoopPresenceActivity) => {
      activityRef.current = activity;
      pushRealtimePose();
    },
    [pushRealtimePose],
  );

  function handleTeleport(destination: ExplorationTeleporterDestination) {
    const target = zones.find((z) => z.id === destination.zoneId);
    if (!target) return;
    setReclaimSpawn(null);
    setZoneId(target.id);
    setRemotePeers([]);
    setLogoutMarkers([]);
  }

  async function enterWorld(opts: {
    pid: string;
    dname: string;
    inventory?: PlaytestCharacterReady["inventory"];
  }) {
    const { pid, dname, inventory: inv } = opts;
    const name = sanitizeDisplayName(dname);
    if (!name) {
      setError("Character name required.");
      return;
    }
    if (!zone) {
      setError("No active exploration zone is available yet.");
      return;
    }
    displayNameRef.current = name;
    setDisplayName(name);
    const picks = inv?.clothingPicks ?? clothingPicks;
    const app = inv?.appearance ?? appearance;
    let nextOwnedClothing = inv?.clothing ?? ownedClothing;
    let nextEquip =
      (inv && Object.keys(inv.equipment ?? {}).length > 0 ? inv.equipment : null) ??
      initialEquipment ??
      equipmentFromClothingPicks(clothing, picks);

    if (nextOwnedClothing.length === 0) {
      nextOwnedClothing = buildOwnedClothingFromPicks(clothing, picks);
      nextEquip = equipmentFromClothingPicks(clothing, picks);
      setOwnedClothing(nextOwnedClothing);
      setInitialEquipment(nextEquip);
    }

    if (!starterGrantedRef.current) {
      starterGrantedRef.current = true;
    }

    setError(null);

    try {
      const patchRes = await fetch("/api/arcade/playtest/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appearance: app,
          clothingPicks: picks,
          equipment: nextEquip,
          ...(hotbarSlots != null ? { hotbar: hotbarSlots } : {}),
          ...(nextOwnedClothing.length > 0 ? { clothing: nextOwnedClothing } : {}),
        }),
      });
      if (!patchRes.ok) {
        const errData = (await patchRes.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        if (errData.code === "SESSION_CLOSED") {
          setError(errData.error ?? SESSION_CLOSED_MESSAGE);
          resetToCharacterFlow();
          return;
        }
      }
    } catch {
      /* enter world; heartbeat will surface session errors */
    }

    guestIdRef.current = pid;
    try {
      const res = await fetch(
        `/api/arcade/playtest/presence?reclaimId=${encodeURIComponent(pid)}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = (await res.json()) as { marker?: CoopLogoutMarkerView | null };
        const marker = data.marker ?? null;
        if (marker && zones.some((z) => z.id === marker.zoneId)) {
          setZoneId(marker.zoneId);
          setReclaimSpawn({ zoneId: marker.zoneId, x: marker.x, y: marker.y });
        } else {
          setReclaimSpawn(null);
        }
      } else {
        setReclaimSpawn(null);
      }
    } catch {
      setReclaimSpawn(null);
    }

    setPlayKey((k) => k + 1);
    setStep("play");
  }

  const handleCharacterReady = useCallback(
    async (result: PlaytestCharacterReady) => {
      setPlayerId(result.playerId);
      setDisplayName(result.displayName);
      displayNameRef.current = result.displayName;
      guestIdRef.current = result.playerId;
      setCharacters(result.characters);
      setCanCreateMore(result.canCreateMore);
      applyInventoryFromView(result.inventory);
      setError(null);

      if (result.needsAvatar) {
        setStep("avatar");
      } else {
        await enterWorld({
          pid: result.playerId,
          dname: result.displayName,
          inventory: result.inventory,
        });
      }
    },
    [applyInventoryFromView],
  );

  function selectCharacter(id: string) {
    setError(null);
    startCharacterTransition(async () => {
      const res = await selectPlaytestCharacterAction(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await handleCharacterReady(res);
    });
  }

  function submitCreate() {
    setError(null);
    startCharacterTransition(async () => {
      const res = await createPlaytestCharacterAction({
        username: createUsername,
        stateCode: createStateCode,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCreateUsername("");
      setCreateStateCode("");
      await handleCharacterReady(res);
    });
  }

  function startPlay() {
    if (!playerId) {
      setError("Select a character first.");
      return;
    }
    void enterWorld({ pid: playerId, dname: displayName });
  }

  if (zones.length === 0) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-10 text-center">
        <h1 className="text-3xl font-black text-palm">Co-op playtest</h1>
        <p className="mt-4 text-sm text-ink/70">
          No active exploration zones yet. Check back once a zone is published.
        </p>
      </div>
    );
  }

  if (step === "play" && zone) {
    return (
      <ArcadeForceLandscape>
        <div className="fixed inset-0 z-[80] bg-black">
        {notices.length > 0 ? (
          <div className="pointer-events-none fixed left-1/2 top-4 z-[200] flex w-[min(92vw,28rem)] -translate-x-1/2 flex-col gap-2">
            {notices.map((n) => (
              <p
                key={n.id}
                className="rounded-lg bg-black/85 px-4 py-2.5 text-center text-sm font-bold leading-snug text-white shadow-lg"
              >
                {n.text}
              </p>
            ))}
          </div>
        ) : null}
        <div key={playKey} className="h-full">
        <ArcadeExplorationShell
          zone={zone}
          overlay={overlay}
          mobileFill
          fill
          className="h-full"
          onlineCount={onlineCount}
          onLogout={() => {
            leave();
            resetToCharacterFlow();
          }}
          onTeleport={handleTeleport}
          zoneNameById={zoneNameById}
          avatarAppearance={appearance}
          avatarHairStyle={hairStyle}
          avatarCatalog={playCatalog}
          localPlayerName={displayName}
          remotePeers={remotePeers}
          logoutMarkers={logoutMarkers
            .filter((m) => m.zoneId === zone.id)
            .map((m) => ({
              id: m.id,
              displayName: m.displayName,
              x: m.x,
              y: m.y,
            }))}
          spawnOverride={spawnOverride}
          onPoseChange={handlePoseChange}
          onActivityChange={handleActivityChange}
          generalSettings={liveGeneralSettings}
          hudClock={hudClock}
          simulateOtherPlayer
          simAppearance={sim.appearance}
          simHairStyle={sim.hairStyle}
          simPlayerName="SimPlayer"
          simulateNpc
          npcAppearance={npcLook.appearance}
          npcHairStyle={npcLook.hairStyle}
          npcName={npcDisplayName}
          npcNotes={npcNotes}
          npcRole={npcRole}
          npcOfferItems={npcOfferItems}
          npcOfferCompanions={npcOfferCompanions}
          npcWanderEnabled={npcWanderEnabled}
          npcWanderDistancePx={npcWanderDistancePx}
          npcIdleFacingDeg={npcIdleFacingDeg}
          npcs={npcs}
          onBuyNpcOffer={(offer) => {
            if (coinsCents < offer.priceCents) return;
            setCoinsCents((c) => c - offer.priceCents);
            setBagStacks((prev) => addNpcOfferToBag(prev, offer));
          }}
          onBuyNpcCompanionOffer={(offer) => {
            if (ownedCompanionIds.includes(offer.companionId)) return;
            if (coinsCents < offer.priceCents) return;
            setCoinsCents((c) => c - offer.priceCents);
            setOwnedCompanionIds((ids) =>
              ids.includes(offer.companionId) ? ids : [...ids, offer.companionId],
            );
            const c = offer.companion;
            if (c.canFollow && !followerId) setFollowerId(c.id);
            else if (c.canRide && !mountId) setMountId(c.id);
            else if (c.canFollow) setFollowerId(c.id);
            else if (c.canRide) setMountId(c.id);
          }}
          onTakeNpcGift={(offer) => {
            setBagStacks((prev) => addNpcOfferToBag(prev, offer));
          }}
          followerCompanion={followerCompanion}
          mountCompanion={mountCompanion}
          stableListings={stableListings}
          storeListings={storeListings}
          playtestCoinsCents={coinsCents}
          ownedCompanionIds={ownedCompanionIds}
          companionNicknames={companionNicknames}
          activeFollowerId={followerId}
          activeMountId={mountId}
          housingGuestId={guestIdRef.current}
          onPlaytestCoinsChange={setCoinsCents}
          bagStacks={bagStacks}
          onBagStacksChange={setBagStacks}
          onUnequipCompanionId={(companionId) => {
            if (followerId === companionId) setFollowerId("");
            if (mountId === companionId) {
              setMountId("");
              // mount clear handled by shell mounted state via missing mount
            }
          }}
          tools={tools}
          clothing={clothing}
          ownedTools={ownedTools}
          onOwnedToolsChange={setOwnedTools}
          ownedClothing={ownedClothing}
          onOwnedClothingChange={setOwnedClothing}
          initialEquipment={initialEquipment}
          initialHotbar={hotbarSlots}
          onHotbarChange={setHotbarSlots}
          onEquipmentChange={(next) => {
            setLiveEquipment(next);
            setInitialEquipment(next);
          }}
          equippedToolId={equippedToolId}
          onEquipTool={setEquippedToolId}
          onUnequipTool={() => setEquippedToolId("")}
          collectAreas={collectAreas}
          bugsCatalog={bugsCatalog}
          bugContainers={bugContainers}
          waterCatalog={waterCatalog}
          ownedWater={ownedWater}
          onOwnedWaterChange={setOwnedWater}
          partyItemSharing={myParty?.itemSharing ?? false}
          partyMemberIdsInRange={partyMemberGuestIds}
          partyMemberGuestIds={partyMemberGuestIds}
          partyFindBoostPct={myParty?.findBoostPct ?? null}
          partyId={myParty?.id ?? null}
          party={myParty}
          partyChatMessages={partyChat}
          megaMap={megaMap}
          menus={menus}
          allZones={zones}
          partyPresence={partyPresence}
          chatGuestId={guestIdRef.current}
          onPartySay={(body) => {
            void partyAction({ action: "chat", body });
          }}
          onOpenPartyMatching={() => setPartyOpen((o) => !o)}
          partyMatching={{
            party: myParty,
            board: partyBoard,
            joinRequests,
            isLeader: Boolean(myParty && myParty.leaderId === guestIdRef.current),
            pending: partyPending,
            onCreate: (name, itemSharing, xpSharing) => {
              void partyAction({ action: "create", name, itemSharing, xpSharing });
            },
            onLeave: () => {
              void partyAction({ action: "leave" });
            },
            onRequestJoin: (partyId) => {
              void partyAction({ action: "requestJoin", partyId });
            },
            onRespondJoin: (requestId, accept) => {
              void partyAction({ action: "respondJoin", requestId, accept });
            },
            onToggleItemSharing: (itemSharing) => {
              if (!myParty) return;
              void partyAction({ action: "update", partyId: myParty.id, itemSharing });
            },
            onToggleXpSharing: (xpSharing) => {
              if (!myParty) return;
              void partyAction({ action: "update", partyId: myParty.id, xpSharing });
            },
            onToggleOpenMatch: (openMatch) => {
              if (!myParty) return;
              void partyAction({ action: "update", partyId: myParty.id, openMatch });
            },
          }}
          onInviteToParty={(peer) => {
            void partyAction({ action: "invite", toGuestId: peer.id });
          }}
          onBuyStableListing={(listing) => {
            if (ownedCompanionIds.includes(listing.companionId)) return;
            if (coinsCents < listing.priceCents) return;
            setCoinsCents((c) => c - listing.priceCents);
            setOwnedCompanionIds((ids) =>
              ids.includes(listing.companionId) ? ids : [...ids, listing.companionId],
            );
            const c = listing.companion;
            if (c.canFollow && !followerId) setFollowerId(c.id);
            else if (c.canRide && !mountId) setMountId(c.id);
            else if (c.canFollow) setFollowerId(c.id);
            else if (c.canRide) setMountId(c.id);
          }}
          onBuyStoreListing={(listing) => {
            if (coinsCents < listing.priceCents) return;
            setCoinsCents((c) => c - listing.priceCents);
            setBagStacks((prev) => addStorePurchaseToBag(prev, listing));
          }}
          onEquipStableCompanion={(listing, role) => {
            if (!ownedCompanionIds.includes(listing.companionId)) return;
            if (role === "follower" && listing.companion.canFollow) {
              setFollowerId(listing.companionId);
            }
            if (role === "mount" && listing.companion.canRide) {
              setMountId(listing.companionId);
            }
          }}
          onUnequipStableCompanion={(role) => {
            if (role === "follower") setFollowerId("");
            if (role === "mount") setMountId("");
          }}
          onRenameCompanion={(companionId, name) => {
            setCompanionNicknames((prev) => ({
              ...prev,
              [companionId]: name.trim().slice(0, 32),
            }));
          }}
        />
        </div>
        <ArcadeExplorationPartyPanel
          open={partyOpen}
          party={myParty}
          board={partyBoard}
          joinRequests={joinRequests}
          isLeader={Boolean(myParty && myParty.leaderId === guestIdRef.current)}
          pending={partyPending}
          onClose={() => setPartyOpen(false)}
          onCreate={(name, itemSharing, xpSharing) => {
            void partyAction({ action: "create", name, itemSharing, xpSharing });
          }}
          onLeave={() => {
            void partyAction({ action: "leave" });
          }}
          onRequestJoin={(partyId) => {
            void partyAction({ action: "requestJoin", partyId });
          }}
          onRespondJoin={(requestId, accept) => {
            void partyAction({ action: "respondJoin", requestId, accept });
          }}
          onToggleItemSharing={(itemSharing) => {
            if (!myParty) return;
            void partyAction({ action: "update", partyId: myParty.id, itemSharing });
          }}
          onToggleXpSharing={(xpSharing) => {
            if (!myParty) return;
            void partyAction({ action: "update", partyId: myParty.id, xpSharing });
          }}
          onToggleOpenMatch={(openMatch) => {
            if (!myParty) return;
            void partyAction({ action: "update", partyId: myParty.id, openMatch });
          }}
        />
        <ArcadeExplorationPartyInviteDialog
          invite={activeInvite}
          onAccept={() => {
            if (!activeInvite) return;
            const id = activeInvite.id;
            setActiveInvite(null);
            void partyAction({ action: "respondInvite", inviteId: id, accept: true });
          }}
          onDecline={() => {
            if (!activeInvite) return;
            const id = activeInvite.id;
            setActiveInvite(null);
            void partyAction({ action: "respondInvite", inviteId: id, accept: false });
          }}
        />
      </div>
      </ArcadeForceLandscape>
    );
  }

  return (
    <ArcadeForceLandscape>
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col overflow-y-auto overscroll-contain px-4 py-6 sm:py-8">
      <header className="mb-6 shrink-0">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-lagoon-dark">Arcade</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-palm sm:text-4xl">
          Co-op playtest
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink/75">
          {step === "select"
            ? "Choose a Critter Keeper character to explore the world."
            : step === "create"
              ? "Create a Critter Keeper character, then customize your look for exploration."
              : "Customize your look, then enter the world. Logout leaves a marker so you can return to the same spot."}
        </p>
      </header>

      {error ? (
        <p className="mb-4 rounded border border-coral/40 bg-coral/10 px-3 py-2 text-sm font-bold text-coral">
          {error}
        </p>
      ) : null}

      {step === "select" ? (
        <div className="pb-10">
          <h2 className="border-b-4 border-palm pb-2 text-lg font-black text-palm">
            Choose your character
          </h2>
          <p className="mt-2 text-sm text-ink/70">
            Character names come from Critter Keeper — pick one to play as in the co-op world.
          </p>
          <ul className="mt-6 space-y-2">
            {characters.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={characterPending}
                  onClick={() => selectCharacter(c.id)}
                  className={arcadeCharacterCardClass}
                >
                  <span className="block font-bold text-palm">{c.gameUsername}</span>
                  <span className="text-xs text-ink/60">
                    {stateNameForCode(c.gameState)} · {formatGameCash(c.cashCents)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {canCreateMore ? (
            <button
              type="button"
              disabled={characterPending}
              onClick={() => setStep("create")}
              className={`${btnSecondaryMd} mt-6`}
            >
              Create new character
            </button>
          ) : (
            <p className="mt-4 text-xs text-ink/55">Maximum characters reached for this account.</p>
          )}
          {characterPending ? (
            <p className="mt-3 text-sm text-ink/60">Loading character…</p>
          ) : null}
        </div>
      ) : null}

      {step === "create" ? (
        <div className="pb-10">
          <h2 className="border-b-4 border-palm pb-2 text-lg font-black text-palm">
            Create character
          </h2>
          <p className="mt-2 text-sm text-ink/70">
            Pick an in-game username and a general location (US state). Names are shared with Critter
            Keeper — 3–24 characters, letters, numbers, and underscore only.
          </p>
          <label className="mt-6 block text-sm font-bold">
            Username
            <input
              value={createUsername}
              onChange={(e) => setCreateUsername(e.target.value)}
              placeholder="e.g. invert_keeper"
              className={playtestFieldClass}
            />
          </label>
          <label className="mt-4 block text-sm font-bold">
            State
            <select
              value={createStateCode}
              onChange={(e) => setCreateStateCode(e.target.value)}
              className={playtestFieldClass}
            >
              <option value="">Select state…</option>
              {US_STATE_OPTIONS.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={characterPending}
              onClick={submitCreate}
              className={btnMainMd}
            >
              {characterPending ? "Creating…" : "Create Character"}
            </button>
            {characters.length > 0 ? (
              <button
                type="button"
                disabled={characterPending}
                onClick={() => setStep("select")}
                className={btnSecondaryMd}
              >
                Back
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === "avatar" ? (
        <div className="grid gap-6 pb-10 md:grid-cols-[minmax(0,1fr)_min(240px,40vw)] md:items-start">
          <div className="space-y-3">
            <p className="text-sm font-bold text-ink">
              Playing as <span className="text-palm">{displayName}</span>
            </p>
            <p className="text-xs text-ink/55">
              Your name comes from Critter Keeper and cannot be changed here.
            </p>

            <label className="block text-xs font-bold text-[var(--btn-secondary-fg)]">
              Body
              <select
                className={playtestFieldClass}
                value={appearance.bodySex === "female" ? "female" : "male"}
                onChange={(e) =>
                  setAppearance((p) => ({
                    ...p,
                    bodySex: e.target.value === "female" ? "female" : "male",
                  }))
                }
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>

            <label className="block text-xs font-bold text-[var(--btn-secondary-fg)]">
              Hair style
              <select
                className={playtestFieldClass}
                value={appearance.hairStyleId}
                onChange={(e) => setAppearance((p) => ({ ...p, hairStyleId: e.target.value }))}
              >
                {avatarCatalog.hairStyles.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>

            {(
              [
                ["Hair color", "HAIR", "hairColorHex"],
                ["Skin tone", "SKIN", "skinColorHex"],
              ] as const
            ).map(([label, slot, key]) => (
              <label key={slot} className="block text-xs font-bold text-[var(--btn-secondary-fg)]">
                {label}
                <select
                  className={playtestFieldClass}
                  value={appearance[key]}
                  onChange={(e) => setAppearance((p) => ({ ...p, [key]: e.target.value }))}
                >
                  {colorsBySlot[slot].map((c) => (
                    <option key={c.id} value={c.hex}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            <label className="block text-xs font-bold text-[var(--btn-secondary-fg)]">
              Eyes
              <select
                className={playtestFieldClass}
                value={appearance.eyesItemId}
                onChange={(e) => setAppearance((p) => ({ ...p, eyesItemId: e.target.value }))}
              >
                {(itemsBySlot.EYES ?? []).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-bold text-[var(--btn-secondary-fg)]">
              Mouth
              <select
                className={playtestFieldClass}
                value={appearance.mouthItemId}
                onChange={(e) => setAppearance((p) => ({ ...p, mouthItemId: e.target.value }))}
              >
                {(itemsBySlot.MOUTH ?? []).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded border border-[var(--btn-main-bg)]/25 bg-[var(--btn-secondary-bg)]/40 p-2.5">
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-palm">
                Wearables
              </p>
              <p className="mb-2 text-[11px] text-ink/55">
                Pick a piece per slot and tint it — worn look uses procedural shapes until you upload
                art.
              </p>
              {EXPLORATION_CREATION_CLOTHING_SLOTS.map(({ slot, label }) => {
                const options = creationClothing.filter((c) => c.slot === slot);
                const selectedId = creationClothingPickId(clothingPicks[slot]);
                const selected = options.find((c) => c.id === selectedId) ?? null;
                const tint =
                  creationClothingPickTint(clothingPicks[slot], selected?.tintHex ?? "") ||
                  "#888888";
                return (
                  <div key={slot} className="mb-2 last:mb-0">
                    <label className="block text-xs font-bold text-[var(--btn-secondary-fg)]">
                      {label}
                      <select
                        className={playtestFieldClass}
                        value={selectedId}
                        disabled={options.length === 0}
                        onChange={(e) => {
                          const id = e.target.value;
                          const item = options.find((c) => c.id === id);
                          setClothingPicks((p) => ({
                            ...p,
                            [slot]: id
                              ? setCreationClothingPick(id, item?.tintHex)
                              : undefined,
                          }));
                        }}
                      >
                        {options.length === 0 ? (
                          <option value="">None available yet</option>
                        ) : (
                          options.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    {selectedId ? (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-ink/50">
                          Color
                        </span>
                        <input
                          type="color"
                          className="h-8 w-10 cursor-pointer rounded border border-[var(--btn-main-bg)]/35 bg-[var(--btn-secondary-bg)] p-0.5"
                          value={tint}
                          onChange={(e) =>
                            setClothingPicks((p) => ({
                              ...p,
                              [slot]: setCreationClothingPick(selectedId, e.target.value),
                            }))
                          }
                        />
                        <input
                          className={`${playtestFieldClass} !mt-0 font-mono text-xs`}
                          value={tint}
                          onChange={(e) =>
                            setClothingPicks((p) => ({
                              ...p,
                              [slot]: setCreationClothingPick(selectedId, e.target.value),
                            }))
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="button" className={btnMainMd} disabled={characterPending} onClick={startPlay}>
                Enter world
              </button>
            </div>
          </div>

          <div className="md:sticky md:top-2">
            <ArcadeExplorationAvatarPreview
              appearance={appearance}
              hairStyle={hairStyle}
              loadout={creationPreviewLoadout}
              bodySettings={liveGeneralSettings.body}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-8 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <ArcadeInstallAppPrompt appName={EXPLORATION_PWA_NAME} />
      </div>
    </div>
    </ArcadeForceLandscape>
  );
}
