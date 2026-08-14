"use client";

import { useEffect, useState, useTransition } from "react";
import {
  deleteCollectAreaAdminAction,
  saveCollectAreaAdminAction,
} from "@/app/actions/game-arcade-exploration-collect-admin";
import type { ExplorationCollectAreaView } from "@/lib/game-exploration-gather-shared";
import {
  DEFAULT_WATER_AREA_SETTINGS,
  type ExplorationWaterAreaSettings,
} from "@/lib/game-exploration-gather-shared";
import type { ExplorationItemSetAdminRow } from "@/lib/game-exploration-item-sets-shared";
import type { ExplorationBugSetAdminRow } from "@/lib/game-exploration-bugs-shared";
import { collectTypeLabel } from "@/lib/game-exploration-tools-shared";
import { adminInsetPanelClass, adminMutedPanelClass } from "@/lib/admin-surface-classes";
import { btnMainMd, btnSecondarySm } from "@/lib/btn-theme-classes";

type Props = {
  zoneId: string;
  itemSets: ExplorationItemSetAdminRow[];
  bugSets?: ExplorationBugSetAdminRow[];
  areas: ExplorationCollectAreaView[];
  onAreasChange?: (areas: ExplorationCollectAreaView[]) => void;
  focusAreaId?: string | null;
  onFocusAreaIdChange?: (id: string | null) => void;
  compact?: boolean;
  embedded?: boolean;
};

/** Collect-area editor: item sets (COLLECT) or bug sets (ROAM_BUG) + burst %. */
export function GameArcadeExplorationCollectionAdmin({
  zoneId,
  itemSets,
  bugSets = [],
  areas,
  onAreasChange,
  focusAreaId = null,
  onFocusAreaIdChange,
  compact = false,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState("");
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
  const [selectedBugSetIds, setSelectedBugSetIds] = useState<string[]>([]);
  const [maxConcurrent, setMaxConcurrent] = useState(3);
  const [bugBurstChancePct, setBugBurstChancePct] = useState(0);
  const [name, setName] = useState("");
  const [waterSettings, setWaterSettings] = useState<ExplorationWaterAreaSettings>({
    ...DEFAULT_WATER_AREA_SETTINGS,
  });

  const focus = areas.find((a) => a.id === focusAreaId) ?? null;

  useEffect(() => {
    if (!focus) {
      setSelectedSetIds([]);
      setSelectedBugSetIds([]);
      setMaxConcurrent(3);
      setBugBurstChancePct(0);
      setName("");
      setWaterSettings({ ...DEFAULT_WATER_AREA_SETTINGS });
      return;
    }
    setSelectedSetIds(focus.sets.map((s) => s.id));
    setSelectedBugSetIds((focus.bugSets ?? []).map((s) => s.id));
    setMaxConcurrent(focus.maxConcurrent);
    setBugBurstChancePct(focus.bugBurstChancePct ?? 0);
    setName(focus.name);
    setWaterSettings(focus.water ?? { ...DEFAULT_WATER_AREA_SETTINGS });
    setErr("");
  }, [
    focus?.id,
    focus?.sets,
    focus?.bugSets,
    focus?.maxConcurrent,
    focus?.bugBurstChancePct,
    focus?.name,
    focus?.water,
  ]);

  function toggleSet(id: string) {
    setSelectedSetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleBugSet(id: string) {
    setSelectedBugSetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function saveArea() {
    if (!focus) return;
    setErr("");
    startTransition(async () => {
      const res = await saveCollectAreaAdminAction({
        id: focus.id,
        zoneId: focus.zoneId || zoneId,
        kind: focus.kind,
        name: name.trim() || focus.name,
        shape: focus.shape,
        leftPct: focus.leftPct,
        topPct: focus.topPct,
        widthPct: focus.widthPct,
        heightPct: focus.heightPct,
        polyPoints: focus.polyPoints,
        maxConcurrent,
        bugBurstChancePct: focus.kind === "COLLECT" ? bugBurstChancePct : 0,
        active: focus.active,
        sortOrder: focus.sortOrder,
        setIds: focus.kind === "COLLECT" ? selectedSetIds : [],
        bugSetIds:
          focus.kind === "ROAM_BUG" || focus.kind === "WATER" ? selectedBugSetIds : [],
        water: focus.kind === "WATER" ? waterSettings : undefined,
      });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      onAreasChange?.(areas.map((a) => (a.id === res.area.id ? res.area : a)));
    });
  }

  function removeArea() {
    if (!focus) return;
    setErr("");
    startTransition(async () => {
      const res = await deleteCollectAreaAdminAction(focus.id);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      onAreasChange?.(areas.filter((a) => a.id !== focus.id));
      onFocusAreaIdChange?.(null);
    });
  }

  const activeSets = itemSets.filter((s) => s.active);
  const activeBugSets = bugSets.filter((s) => s.active);
  const panelPad = compact ? "p-2" : "p-4";

  return (
    <div className="space-y-3">
      <div className={`${adminMutedPanelClass} ${panelPad}`}>
        <h2 className="text-sm font-black text-palm">Wild spawn areas</h2>
        <p className="mt-1 text-xs text-ink/55">
          Collect areas use item sets. Roam-bug and water areas can use bug sets. Collect nodes can
          burst roam bugs when they overlap a roam area. Water areas support gradual wade-in, tint,
          and speed reduction.
        </p>
        {areas.length === 0 ? (
          <p className="mt-2 text-sm text-ink/60">No areas yet — use Collect / Roam place on the map.</p>
        ) : (
          <ul className="mt-2 divide-y divide-palm/15">
            {areas.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between gap-2 py-1.5 text-left text-sm hover:text-palm ${
                    a.id === focusAreaId ? "font-black text-palm" : ""
                  }`}
                  onClick={() => onFocusAreaIdChange?.(a.id)}
                >
                  <span>{a.name || "Untitled"}</span>
                  <span className="text-[10px] font-bold uppercase text-ink/45">
                    {a.kind === "ROAM_BUG"
                      ? `Roam · ${(a.bugSets ?? []).length} bug set${(a.bugSets ?? []).length === 1 ? "" : "s"}`
                      : a.kind === "WATER"
                        ? `Water · ${Math.round(a.water?.depthPct ?? DEFAULT_WATER_AREA_SETTINGS.depthPct)}% depth`
                        : `Collect · ${a.sets.length} set${a.sets.length === 1 ? "" : "s"} · ${Math.round(a.bugBurstChancePct ?? 0)}% burst`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {focus ? (
        <div className={`${adminInsetPanelClass} space-y-3 ${panelPad}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black text-palm">
              {focus.kind === "ROAM_BUG"
                ? "Roam area"
                : focus.kind === "WATER"
                  ? "Water area"
                  : "Collect area"}
            </h3>
            <button type="button" className={btnSecondarySm} disabled={pending} onClick={removeArea}>
              Delete area
            </button>
          </div>

          <label className="block text-xs font-bold">
            Name
            <input
              className="mt-1 w-full rounded border border-palm/25 px-2 py-1.5 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-xs font-bold">
            Max concurrent
            <input
              type="number"
              min={1}
              max={40}
              className="mt-1 w-24 rounded border border-palm/25 px-2 py-1.5 text-sm"
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent(Number(e.target.value) || 3)}
            />
          </label>

          {focus.kind === "COLLECT" ? (
            <>
              <label className="block text-xs font-bold">
                Bug burst chance % (if node overlaps a roam-bug area)
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1 w-24 rounded border border-palm/25 px-2 py-1.5 text-sm"
                  value={bugBurstChancePct}
                  onChange={(e) => setBugBurstChancePct(Number(e.target.value) || 0)}
                />
              </label>
              <fieldset>
                <legend className="text-xs font-black uppercase text-palm">Item sets</legend>
                {activeSets.length === 0 ? (
                  <p className="mt-2 text-sm text-ink/60">No item sets yet.</p>
                ) : (
                  <ul className="mt-2 max-h-64 space-y-1.5 overflow-auto">
                    {activeSets.map((s) => (
                      <li key={s.id}>
                        <label className="flex cursor-pointer items-start gap-2 rounded border border-palm/15 px-2 py-1.5 text-sm hover:bg-palm/5">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={selectedSetIds.includes(s.id)}
                            onChange={() => toggleSet(s.id)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-bold">{s.name}</span>
                            <span className="mt-0.5 block text-[10px] font-bold uppercase text-ink/45">
                              {collectTypeLabel(s.collectType)} · {s.members.length} item
                              {s.members.length === 1 ? "" : "s"}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </fieldset>
            </>
          ) : focus.kind === "WATER" ? (
            <>
              <fieldset className="space-y-2">
                <legend className="text-xs font-black uppercase text-palm">Wade settings</legend>
                <label className="block text-xs font-bold">
                  Submerge depth % (at full wade)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="mt-1 w-24 rounded border border-palm/25 px-2 py-1.5 text-sm"
                    value={waterSettings.depthPct}
                    onChange={(e) =>
                      setWaterSettings((prev) => ({
                        ...prev,
                        depthPct: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </label>
                <label className="block text-xs font-bold">
                  Speed multiplier at full wade (0.05–1)
                  <input
                    type="number"
                    min={0.05}
                    max={1}
                    step={0.05}
                    className="mt-1 w-24 rounded border border-palm/25 px-2 py-1.5 text-sm"
                    value={waterSettings.speedMult}
                    onChange={(e) =>
                      setWaterSettings((prev) => ({
                        ...prev,
                        speedMult: Number(e.target.value) || DEFAULT_WATER_AREA_SETTINGS.speedMult,
                      }))
                    }
                  />
                </label>
                <label className="block text-xs font-bold">
                  Shore blend distance (world px)
                  <input
                    type="number"
                    min={8}
                    max={400}
                    className="mt-1 w-24 rounded border border-palm/25 px-2 py-1.5 text-sm"
                    value={waterSettings.entryBlendPx}
                    onChange={(e) =>
                      setWaterSettings((prev) => ({
                        ...prev,
                        entryBlendPx: Number(e.target.value) || DEFAULT_WATER_AREA_SETTINGS.entryBlendPx,
                      }))
                    }
                  />
                </label>
                <label className="block text-xs font-bold">
                  Submerged tint
                  <input
                    type="color"
                    className="mt-1 block h-9 w-16 cursor-pointer rounded border border-palm/25"
                    value={waterSettings.submergedTintHex}
                    onChange={(e) =>
                      setWaterSettings((prev) => ({
                        ...prev,
                        submergedTintHex: e.target.value.toLowerCase(),
                      }))
                    }
                  />
                </label>
                <label className="block text-xs font-bold">
                  Submerged body visibility % (0 = mud shadow only)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="mt-1 w-24 rounded border border-palm/25 px-2 py-1.5 text-sm"
                    value={waterSettings.submergedBodyOpacity}
                    onChange={(e) =>
                      setWaterSettings((prev) => ({
                        ...prev,
                        submergedBodyOpacity: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </label>
              </fieldset>
              <fieldset>
                <legend className="text-xs font-black uppercase text-palm">Bug sets (optional)</legend>
                <p className="mt-1 text-[11px] text-ink/55">
                  Water bugs and other roam spawns for this zone.
                </p>
                {activeBugSets.length === 0 ? (
                  <p className="mt-2 text-sm text-ink/60">
                    No bug sets yet — create them under Exploration → Bug sets.
                  </p>
                ) : (
                  <ul className="mt-2 max-h-64 space-y-1.5 overflow-auto">
                    {activeBugSets.map((s) => (
                      <li key={s.id}>
                        <label className="flex cursor-pointer items-start gap-2 rounded border border-palm/15 px-2 py-1.5 text-sm hover:bg-palm/5">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={selectedBugSetIds.includes(s.id)}
                            onChange={() => toggleBugSet(s.id)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-bold">{s.name}</span>
                            <span className="mt-0.5 block text-[10px] font-bold uppercase text-ink/45">
                              {s.members.length} bug{s.members.length === 1 ? "" : "s"}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </fieldset>
            </>
          ) : (
            <fieldset>
              <legend className="text-xs font-black uppercase text-palm">Bug sets</legend>
              <p className="mt-1 text-[11px] text-ink/55">
                Check sets that should spawn here, then click <strong>Save area</strong>. Sets need at
                least one active bug member.
              </p>
              {activeBugSets.length === 0 ? (
                <p className="mt-2 text-sm text-ink/60">
                  No bug sets yet — create them under Exploration → Bug sets.
                </p>
              ) : (
                <ul className="mt-2 max-h-64 space-y-1.5 overflow-auto">
                  {activeBugSets.map((s) => (
                    <li key={s.id}>
                      <label className="flex cursor-pointer items-start gap-2 rounded border border-palm/15 px-2 py-1.5 text-sm hover:bg-palm/5">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={selectedBugSetIds.includes(s.id)}
                          onChange={() => toggleBugSet(s.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="font-bold">{s.name}</span>
                          <span className="mt-0.5 block text-[10px] font-bold uppercase text-ink/45">
                            {s.members.length} bug{s.members.length === 1 ? "" : "s"}
                            {s.members.length === 0 ? " · empty — won’t spawn" : ""}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
          )}

          {err ? <p className="text-sm font-bold text-coral">{err}</p> : null}
          <button type="button" className={btnMainMd} disabled={pending} onClick={saveArea}>
            {pending ? "Saving…" : "Save area"}
          </button>
        </div>
      ) : (
        <p className="text-xs text-ink/55">Select a collect or roam area on the map or in the list above.</p>
      )}
    </div>
  );
}
