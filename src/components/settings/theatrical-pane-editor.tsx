"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { uploadThemeDecorImage } from "@/app/actions/theme-admin";
import { uploadTheatricalPaneVideo } from "@/lib/theatrical-video-upload-client";
import { TheatricalElementView } from "@/components/panes/theatrical-pane";
import { TheatricalStageFrame } from "@/components/panes/theatrical-stage-frame";
import { RichTextEditor } from "@/components/rich-text-editor";
import { btnSecondaryMd, btnSecondarySm } from "@/lib/btn-theme-classes";
import {
  DEFAULT_THEATRICAL_FONT_SIZE_PX,
  DEFAULT_THEATRICAL_STAGE_BG_HEX,
  DEFAULT_THEATRICAL_TEXT_BG_HEX,
  DEFAULT_THEATRICAL_TEXT_COLOR_HEX,
  THEATRICAL_STAGE_REF_WIDTH_PX,
  THEATRICAL_STAGE_ASPECT_OPTIONS,
  THEATRICAL_STAGE_MAX_HEIGHT_OPTIONS,
  defaultTheatricalElements,
  newTheatricalElementId,
  normalizeTheatricalColorHex,
  theatricalElementStyle,
  theatricalTextBoxStyle,
  type TheatricalElementKind,
  type TheatricalPaneElement,
  type TheatricalStageAspect,
} from "@/lib/theatrical-pane";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const DEFAULT_TEXT_BG_PICKER_HEX = "#faf6ef";

function safeColorForInput(hex: string | undefined, fallback: string) {
  return normalizeTheatricalColorHex(hex) ?? fallback;
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
  optional,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (hex: string) => void;
  optional?: boolean;
}) {
  const pickerValue = optional && !value.trim() ? fallback : safeColorForInput(value, fallback);
  return (
    <label className="theatrical-pane-editor__label block text-xs font-bold">
      {label}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded border-2 border-palm-mid bg-white p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={optional ? "Transparent" : fallback}
          spellCheck={false}
          className="theatrical-pane-editor__input min-w-[6rem] flex-1 border-2 px-2 py-1 font-mono text-sm"
        />
        {optional ? (
          <button type="button" className={btnSecondarySm} onClick={() => onChange(DEFAULT_THEATRICAL_TEXT_BG_HEX)}>
            Transparent
          </button>
        ) : null}
      </div>
    </label>
  );
}

function kindLabel(kind: TheatricalElementKind) {
  switch (kind) {
    case "video":
      return "Video";
    case "image":
      return "Image";
    case "text":
      return "Text";
    case "link":
      return "Link";
  }
}

function newElement(kind: TheatricalElementKind, zIndex: number): TheatricalPaneElement {
  const base = {
    id: newTheatricalElementId(),
    kind,
    leftPct: 10,
    topPct: 10,
    widthPct: 40,
    heightPct: 25,
    zIndex,
  };
  switch (kind) {
    case "video":
      return {
        ...base,
        leftPct: 0,
        topPct: 0,
        widthPct: 100,
        heightPct: 100,
        videoUrl: "",
        videoAutoplay: true,
        videoMuted: true,
        videoLoop: true,
        videoStabilize: false,
      };
    case "image":
      return { ...base, imageUrl: "" };
    case "text":
      return {
        ...base,
        html: "<p>New text block</p>",
        textBgHex: DEFAULT_THEATRICAL_TEXT_BG_HEX,
        textColorHex: DEFAULT_THEATRICAL_TEXT_COLOR_HEX,
        fontSizePx: DEFAULT_THEATRICAL_FONT_SIZE_PX,
      };
    case "link":
      return { ...base, widthPct: 28, heightPct: 14, linkHref: "/store", linkLabel: "Shop now" };
  }
}

function StageElementPreview({
  el,
  selected,
  onSelect,
  onDragStart,
}: {
  el: TheatricalPaneElement;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.PointerEvent) => void;
}) {
  const style = el.kind === "text" ? theatricalTextBoxStyle(el) : theatricalElementStyle(el);

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        onDragStart(e);
      }}
      className={`theatrical-pane-editor__element overflow-hidden active:cursor-grabbing ${
        selected ? "theatrical-pane-editor__element--selected" : ""
      }`}
      style={style}
    >
      <div className="pointer-events-none h-full w-full">
        <TheatricalElementView el={el} positioned={false} />
      </div>
      <span className="theatrical-pane-editor__badge pointer-events-none absolute left-0 top-0 z-10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
        {kindLabel(el.kind)}
      </span>
    </div>
  );
}

export function TheatricalPaneEditor({
  stageAspect,
  stageMaxHeightPx,
  stageBgHex,
  elements,
  onStageAspectChange,
  onStageMaxHeightPxChange,
  onStageBgHexChange,
  onElementsChange,
}: {
  stageAspect: TheatricalStageAspect;
  stageMaxHeightPx: number;
  stageBgHex: string;
  elements: TheatricalPaneElement[];
  onStageAspectChange: (aspect: TheatricalStageAspect) => void;
  onStageMaxHeightPxChange: (px: number) => void;
  onStageBgHexChange: (hex: string) => void;
  onElementsChange: (elements: TheatricalPaneElement[]) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(elements[0]?.id ?? null);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origLeft: number;
    origTop: number;
    widthPct: number;
    heightPct: number;
  } | null>(null);

  const selected = elements.find((e) => e.id === selectedId) ?? null;
  const maxZ = elements.reduce((m, e) => Math.max(m, e.zIndex), 0);

  const updateElement = useCallback(
    (id: string, patch: Partial<TheatricalPaneElement>) => {
      onElementsChange(elements.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    },
    [elements, onElementsChange],
  );

  const removeElement = useCallback(
    (id: string) => {
      const next = elements.filter((e) => e.id !== id);
      onElementsChange(next.length > 0 ? next : defaultTheatricalElements());
      setSelectedId(next[0]?.id ?? null);
    },
    [elements, onElementsChange],
  );

  useEffect(() => {
    if (selectedId && !elements.some((e) => e.id === selectedId)) {
      setSelectedId(elements[0]?.id ?? null);
    }
  }, [elements, selectedId]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      const stage = stageRef.current;
      if (!drag || !stage) return;
      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dx = ((e.clientX - drag.startX) / rect.width) * 100;
      const dy = ((e.clientY - drag.startY) / rect.height) * 100;
      updateElement(drag.id, {
        leftPct: clamp(drag.origLeft + dx, 0, 100 - drag.widthPct),
        topPct: clamp(drag.origTop + dy, 0, 100 - drag.heightPct),
      });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [updateElement]);

  function startDrag(el: TheatricalPaneElement, e: React.PointerEvent) {
    if (e.button !== 0) return;
    dragRef.current = {
      id: el.id,
      startX: e.clientX,
      startY: e.clientY,
      origLeft: el.leftPct,
      origTop: el.topPct,
      widthPct: el.widthPct,
      heightPct: el.heightPct,
    };
  }

  function addElement(kind: TheatricalElementKind) {
    const el = newElement(kind, maxZ + 1);
    onElementsChange([...elements, el]);
    setSelectedId(el.id);
  }

  function uploadImageForSelected(file: File) {
    if (!selected || selected.kind !== "image") return;
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const r = await uploadThemeDecorImage(fd);
      if (r.ok) updateElement(selected.id, { imageUrl: r.url });
    });
  }

  function uploadVideoForSelected(file: File) {
    if (!selected || selected.kind !== "video") return;
    setVideoUploadError(null);
    startTransition(async () => {
      const r = await uploadTheatricalPaneVideo(file);
      if (r.ok) {
        updateElement(selected.id, { videoUrl: r.url });
        return;
      }
      setVideoUploadError(r.error);
    });
  }

  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="theatrical-pane-editor space-y-4">
      <p className="theatrical-pane-editor__hint text-xs">
        Drag elements on the stage. Layout is rendered on a fixed {THEATRICAL_STAGE_REF_WIDTH_PX}px-wide canvas and
        scaled to fit — the same
        positions and text wrapping you see here appear on the storefront (text stays selectable, not an image).
        Upload an .mp4 or .webm, or paste a direct video file URL — no YouTube/Vimeo player chrome.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="theatrical-pane-editor__label block min-w-[12rem] flex-1 text-sm font-bold">
          Stage width ratio
          <select
            value={stageAspect}
            onChange={(e) => onStageAspectChange(e.target.value as TheatricalStageAspect)}
            className="theatrical-pane-editor__select mt-1 block w-full border-2 px-2 py-2 text-sm"
          >
            {THEATRICAL_STAGE_ASPECT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="theatrical-pane-editor__label block min-w-[12rem] flex-1 text-sm font-bold">
          Stage max height
          <select
            value={stageMaxHeightPx}
            onChange={(e) => onStageMaxHeightPxChange(Number(e.target.value))}
            className="theatrical-pane-editor__select mt-1 block w-full border-2 px-2 py-2 text-sm"
          >
            {THEATRICAL_STAGE_MAX_HEIGHT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <div className="min-w-[12rem] flex-1">
          <ColorField
            label="Stage background"
            value={stageBgHex}
            fallback={DEFAULT_THEATRICAL_STAGE_BG_HEX}
            onChange={onStageBgHexChange}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => addElement("video")} className={btnSecondarySm}>
            + Video
          </button>
          <button type="button" onClick={() => addElement("image")} className={btnSecondarySm}>
            + Image
          </button>
          <button type="button" onClick={() => addElement("text")} className={btnSecondarySm}>
            + Text
          </button>
          <button type="button" onClick={() => addElement("link")} className={btnSecondarySm}>
            + Link
          </button>
        </div>
      </div>

      <TheatricalStageFrame
        aspect={stageAspect}
        maxHeightPx={stageMaxHeightPx}
        bgHex={safeColorForInput(stageBgHex, DEFAULT_THEATRICAL_STAGE_BG_HEX)}
        interactRef={stageRef}
        onInteractPointerDown={() => setSelectedId(null)}
        stageClassName="theatrical-pane-editor__stage rounded-lg border-2 border-dashed"
      >
        {sorted.map((el) => (
          <StageElementPreview
            key={el.id}
            el={el}
            selected={el.id === selectedId}
            onSelect={() => setSelectedId(el.id)}
            onDragStart={(e) => startDrag(el, e)}
          />
        ))}
      </TheatricalStageFrame>

      {selected ? (
        <div className="theatrical-pane-editor__inspector rounded border-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="theatrical-pane-editor__inspector-title text-sm font-black">
              {kindLabel(selected.kind)} layer
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnSecondarySm}
                onClick={() => updateElement(selected.id, { zIndex: selected.zIndex + 1 })}
              >
                Bring forward
              </button>
              <button
                type="button"
                className={btnSecondarySm}
                onClick={() => updateElement(selected.id, { zIndex: Math.max(0, selected.zIndex - 1) })}
              >
                Send back
              </button>
              <button type="button" className={`${btnSecondarySm} text-coral`} onClick={() => removeElement(selected.id)}>
                Remove
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            {(["leftPct", "topPct", "widthPct", "heightPct"] as const).map((key) => (
              <label key={key} className="theatrical-pane-editor__label block text-xs font-bold">
                {key === "leftPct" ? "Left %" : key === "topPct" ? "Top %" : key === "widthPct" ? "Width %" : "Height %"}
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={selected[key]}
                  onChange={(e) =>
                    updateElement(selected.id, {
                      [key]: clamp(Number(e.target.value) || 0, 0, 100),
                    })
                  }
                  className="theatrical-pane-editor__input mt-1 w-full border-2 px-2 py-1 text-sm"
                />
              </label>
            ))}
          </div>

          {selected.kind === "video" ? (
            <div className="mt-4 space-y-3">
              <label className="theatrical-pane-editor__label block text-sm font-bold">
                Video URL (.mp4, .webm, or uploaded file)
                <input
                  type="url"
                  value={selected.videoUrl ?? ""}
                  onChange={(e) => updateElement(selected.id, { videoUrl: e.target.value })}
                  className="theatrical-pane-editor__input mt-1 w-full border-2 px-2 py-2 text-sm"
                  placeholder="https://…/clip.mp4"
                />
              </label>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) uploadVideoForSelected(f);
                }}
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => videoInputRef.current?.click()}
                className={btnSecondaryMd}
              >
                {pending ? "Uploading…" : "Upload video"}
              </button>
              {videoUploadError ? (
                <p className="text-sm font-bold text-red-700" role="alert">
                  {videoUploadError}
                </p>
              ) : null}
              <div className="theatrical-pane-editor__checkbox-row flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!selected.videoAutoplay}
                    onChange={(e) => updateElement(selected.id, { videoAutoplay: e.target.checked })}
                  />
                  Autoplay
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.videoMuted !== false}
                    onChange={(e) => updateElement(selected.id, { videoMuted: e.target.checked })}
                  />
                  Muted
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!selected.videoLoop}
                    onChange={(e) => updateElement(selected.id, { videoLoop: e.target.checked })}
                  />
                  Loop
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!selected.videoStabilize}
                    onChange={(e) => updateElement(selected.id, { videoStabilize: e.target.checked })}
                  />
                  Stabilize
                </label>
              </div>
              <p className="theatrical-pane-editor__hint text-xs">
                Stabilize slightly scales and crops the video to reduce visible shake and letterboxing. Autoplay
                requires muted in most browsers.
              </p>
            </div>
          ) : null}

          {selected.kind === "image" ? (
            <div className="mt-4 space-y-3">
              <label className="theatrical-pane-editor__label block text-sm font-bold">
                Image URL
                <input
                  type="url"
                  value={selected.imageUrl ?? ""}
                  onChange={(e) => updateElement(selected.id, { imageUrl: e.target.value })}
                  className="theatrical-pane-editor__input mt-1 w-full border-2 px-2 py-2 text-sm"
                />
              </label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) uploadImageForSelected(f);
                }}
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => imageInputRef.current?.click()}
                className={btnSecondaryMd}
              >
                {pending ? "Uploading…" : "Upload image"}
              </button>
            </div>
          ) : null}

          {selected.kind === "text" ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <ColorField
                  label="Text background"
                  value={selected.textBgHex ?? DEFAULT_THEATRICAL_TEXT_BG_HEX}
                  fallback={DEFAULT_TEXT_BG_PICKER_HEX}
                  onChange={(textBgHex) =>
                    updateElement(selected.id, {
                      textBgHex: normalizeTheatricalColorHex(textBgHex) ?? textBgHex,
                    })
                  }
                  optional
                />
                <ColorField
                  label="Font color"
                  value={selected.textColorHex ?? DEFAULT_THEATRICAL_TEXT_COLOR_HEX}
                  fallback={DEFAULT_THEATRICAL_TEXT_COLOR_HEX}
                  onChange={(textColorHex) =>
                    updateElement(selected.id, {
                      textColorHex: normalizeTheatricalColorHex(textColorHex) ?? textColorHex,
                    })
                  }
                />
                <label className="theatrical-pane-editor__label block text-xs font-bold">
                  Font size (px)
                  <input
                    type="number"
                    min={10}
                    max={72}
                    value={selected.fontSizePx ?? DEFAULT_THEATRICAL_FONT_SIZE_PX}
                    onChange={(e) =>
                      updateElement(selected.id, {
                        fontSizePx: clamp(Number(e.target.value) || DEFAULT_THEATRICAL_FONT_SIZE_PX, 10, 72),
                      })
                    }
                    className="theatrical-pane-editor__input mt-1 w-full border-2 px-2 py-1 text-sm"
                  />
                </label>
              </div>
              <div>
                <p className="theatrical-pane-editor__label mb-2 text-sm font-bold">Rich text</p>
                <RichTextEditor
                  value={selected.html ?? ""}
                  onChange={(html) => updateElement(selected.id, { html })}
                  enableImages
                  onUploadImage={uploadThemeDecorImage}
                />
              </div>
            </div>
          ) : null}

          {selected.kind === "link" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="theatrical-pane-editor__label block text-sm font-bold">
                Link URL
                <input
                  type="text"
                  value={selected.linkHref ?? ""}
                  onChange={(e) => updateElement(selected.id, { linkHref: e.target.value })}
                  className="theatrical-pane-editor__input mt-1 w-full border-2 px-2 py-2 text-sm"
                  placeholder="/store or https://…"
                />
              </label>
              <label className="theatrical-pane-editor__label block text-sm font-bold">
                Button label
                <input
                  type="text"
                  value={selected.linkLabel ?? ""}
                  onChange={(e) => updateElement(selected.id, { linkLabel: e.target.value })}
                  className="theatrical-pane-editor__input mt-1 w-full border-2 px-2 py-2 text-sm"
                />
              </label>
              <label className="theatrical-pane-editor__checkbox-row flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={!!selected.linkOpenInNewTab}
                  onChange={(e) => updateElement(selected.id, { linkOpenInNewTab: e.target.checked })}
                />
                Open in new tab
              </label>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="theatrical-pane-editor__hint text-xs">Select a layer on the stage to edit it, or add a new element above.</p>
      )}
    </div>
  );
}
