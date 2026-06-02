"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  deleteCustomerLabelUpload,
  listCustomerLabelUploads,
  uploadLabelEditorImage,
} from "@/app/actions/label-designs";
import { DataColumnMapper } from "@/components/labels/data-column-mapper";
import { LabelDataPanel } from "@/components/labels/label-data-panel";
import { LabelTableProperties } from "@/components/labels/label-table-properties";
import { LabelEditorHelpPanel } from "@/components/labels/label-editor-help-panel";
import { LabelEditorLayersPanel } from "@/components/labels/label-editor-layers-panel";
import { LabelEditorMobileBottomSheet } from "@/components/labels/label-editor-mobile-palette";
import { LabelEditorSavedDesignsPanel } from "@/components/labels/label-editor-saved-designs-panel";
import { LabelTemplatePanel } from "@/components/labels/label-template-panel";
import {
  LABEL_PALETTE_TOOL_ORDER,
  LABEL_TOOL_LABELS,
  type LabelEditorHelpConfig,
} from "@/lib/label-editor-help";
import { useLabelEditor } from "@/components/labels/label-editor-context";
import {
  btnChip,
  btnChipActive,
  btnImportantLink,
  btnMainSm,
  btnSecondaryMd,
  btnSecondarySm,
} from "@/lib/btn-theme-classes";
import {
  defaultImageElement,
  defaultImageStickerElement,
  defaultStickerElement,
  defaultTableElement,
  defaultTextElement,
  LABEL_FONT_FAMILIES,
  LABEL_FONT_FAMILY_LABELS,
  type CustomerLabelUploadItem,
  type LabelPaletteTool,
  type LabelVerticalAlign,
  type StickerShape,
} from "@/lib/label-editor/document";
import {
  findBagNameSourceTextElement,
  previewBagLabelDisplayName,
} from "@/lib/label-bag-display-name";
import { LABEL_REMOVAL_MESSAGES, confirmLabelRemoval } from "@/lib/label-editor/confirm-removal";
import { resolveTextContent } from "@/lib/label-editor/document";
import { addGuestUpload, readGuestUploads, removeGuestUpload } from "@/lib/label-editor/guest-uploads";
import { normalizeFontSizePercent } from "@/lib/label-editor/typography";
import { editableRegionPx } from "@/lib/label-template-canvas";
import {
  getSelectedElement,
  isImageElement,
  isStickerElement,
  isTableElement,
  isTextElement,
} from "@/lib/label-editor/reducer";

const TOOL_ICONS: Record<(typeof LABEL_PALETTE_TOOL_ORDER)[number], string> = {
  template: "▢",
  data: "▦",
  draw: "✏️",
  text: "T",
  stickers: "◆",
  upload: "🖼",
  layers: "☰",
  saved: "★",
};

const ALL_TOOLS: { id: LabelPaletteTool; label: string; icon: string }[] = LABEL_PALETTE_TOOL_ORDER.map((id) => ({
  id,
  label: LABEL_TOOL_LABELS[id],
  icon: TOOL_ICONS[id],
}));

type PaletteSheetMode = "tools" | "info";

export function LabelEditorPalette({
  open,
  onOpenChange,
  onMobileHeightChange,
  helpConfig,
  initialUploads = [],
  isLoggedInCustomer = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMobileHeightChange?: (px: number) => void;
  helpConfig: LabelEditorHelpConfig;
  initialUploads?: CustomerLabelUploadItem[];
  isLoggedInCustomer?: boolean;
}) {
  const {
    state,
    dispatch,
    template,
    canAdd,
    stickerAssets,
    canUndo,
    canRedo,
    undo,
    redo,
    bagItems,
    isAdminLayoutMode,
  } = useLabelEditor();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [uploadLibrary, setUploadLibrary] = useState<CustomerLabelUploadItem[]>(initialUploads);
  const [sheetMode, setSheetMode] = useState<PaletteSheetMode>("tools");
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(true);
  const [toolsSheetHeight, setToolsSheetHeight] = useState(88);
  const [infoSheetHeight, setInfoSheetHeight] = useState(88);
  useEffect(() => {
    setUploadLibrary(initialUploads);
  }, [initialUploads]);

  useEffect(() => {
    if (!isLoggedInCustomer) {
      setUploadLibrary(readGuestUploads());
    }
  }, [isLoggedInCustomer]);

  const { inset } = editableRegionPx(template.canvasWidthPx, template.canvasHeightPx, template.marginPx);
  const selected = getSelectedElement(state);
  const addText = () => {
    if (!canAdd) {
      setMsg(`Maximum ${template.maxElements} elements on this template.`);
      return;
    }
    dispatch({
      type: "ADD_ELEMENT",
      element: defaultTextElement(inset, template.canvasWidthPx, template.canvasHeightPx),
    });
    dispatch({ type: "SET_TOOL", tool: "text" });
  };

  const addSticker = (shape: StickerShape) => {
    if (!canAdd) {
      setMsg(`Maximum ${template.maxElements} elements.`);
      return;
    }
    dispatch({ type: "ADD_ELEMENT", element: defaultStickerElement(inset, shape) });
  };

  const addImageSticker = (imageUrl: string, name?: string) => {
    if (!canAdd) {
      setMsg(`Maximum ${template.maxElements} elements.`);
      return;
    }
    dispatch({ type: "ADD_ELEMENT", element: defaultImageStickerElement(inset, imageUrl, name) });
  };

  const addTable = () => {
    if (!canAdd) {
      setMsg(`Maximum ${template.maxElements} elements.`);
      return;
    }
    dispatch({ type: "ADD_ELEMENT", element: defaultTableElement(inset) });
    dispatch({ type: "SET_TOOL", tool: "text" });
  };

  const addImageFromLibrary = (url: string) => {
    if (!canAdd) {
      setMsg(`Maximum ${template.maxElements} elements.`);
      return;
    }
    dispatch({ type: "ADD_ELEMENT", element: defaultImageElement(inset, url) });
    dispatch({ type: "SET_TOOL", tool: "upload" });
  };

  const removeUploadFromLibrary = (item: CustomerLabelUploadItem) => {
    if (!confirmLabelRemoval(LABEL_REMOVAL_MESSAGES.deleteUpload)) return;
    startTransition(async () => {
      if (isLoggedInCustomer) {
        const r = await deleteCustomerLabelUpload(item.id);
        if (!r.ok) {
          setMsg(r.error);
          return;
        }
        setUploadLibrary((prev) => prev.filter((u) => u.id !== item.id));
      } else {
        removeGuestUpload(item.id);
        setUploadLibrary(readGuestUploads());
      }
    });
  };

  const panel = state.activeTool;
  const isSavedPanel = panel === "saved";
  const tools = ALL_TOOLS.filter((t) => {
    if (isAdminLayoutMode && (t.id === "saved" || t.id === "bag")) return false;
    if (t.id === "finish" || t.id === "bag") return false;
    return true;
  });

  const selectTool = (id: LabelPaletteTool) => {
    dispatch({ type: "SET_TOOL", tool: id });
  };

  const pickTool = (id: LabelPaletteTool) => {
    selectTool(id);
    setSheetMode("tools");
    setInfoOpen(false);
    setInfoExpanded(false);
    onOpenChange(true);
  };

  const pickToolInInfo = (id: LabelPaletteTool) => {
    selectTool(id);
    setSheetMode("info");
    const mobile =
      typeof globalThis.matchMedia === "function" &&
      globalThis.matchMedia("(max-width: 767px)").matches;
    if (mobile) {
      setInfoOpen(true);
      setInfoExpanded(true);
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };

  const closeInfoSheet = () => {
    setInfoOpen(false);
    setInfoExpanded(false);
    setSheetMode("tools");
  };

  const openInfoSheet = () => {
    setSheetMode("info");
    setInfoOpen(true);
    setInfoExpanded(true);
    onOpenChange(false);
  };

  const closeHelp = () => setSheetMode("tools");

  useEffect(() => {
    onMobileHeightChange?.(infoOpen ? infoSheetHeight : toolsSheetHeight);
  }, [infoOpen, infoSheetHeight, toolsSheetHeight, onMobileHeightChange]);

  const toggleInfo = () => {
    const mobile =
      typeof globalThis.matchMedia === "function" &&
      globalThis.matchMedia("(max-width: 767px)").matches;
    if (mobile) {
      if (infoOpen) closeInfoSheet();
      else openInfoSheet();
      return;
    }
    setSheetMode((m) => (m === "info" ? "tools" : "info"));
    onOpenChange(true);
  };

  const infoActive = infoOpen || sheetMode === "info";

  const infoTabButton = (
    <button
      type="button"
      title="Tool guide"
      aria-pressed={infoActive}
      onClick={toggleInfo}
      className={`flex shrink-0 flex-col items-center justify-center max-md:min-h-9 max-md:min-w-11 max-md:px-1.5 max-md:py-1 md:mt-1 md:w-full md:border-0 md:px-1 md:py-2 ${
        infoActive ? btnMainSm : btnSecondarySm
      }`}
    >
      <span className="text-sm font-black leading-none md:text-base">i</span>
      <span className="max-md:not-sr-only whitespace-nowrap text-[9px] font-bold md:sr-only">Info</span>
    </button>
  );

  const toolNav = (
    <nav
      className="flex min-w-0 flex-1 shrink-0 gap-0.5 overflow-x-auto border-palm/15 p-1 max-md:flex-row max-md:border-b-0 md:w-[3.75rem] md:flex-col md:gap-1 md:overflow-visible md:border-b-0 md:border-r md:p-1.5 dark:border-zinc-700"
      aria-label="Label tools"
    >
      {tools.map((t) => {
        const isData = t.id === "data";
        const active = state.activeTool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            title={t.label}
            data-label-tour={t.id}
            onClick={() => (sheetMode === "info" ? pickToolInInfo(t.id) : pickTool(t.id))}
            className={`flex shrink-0 flex-col items-center justify-center max-md:min-h-9 max-md:min-w-9 max-md:px-1 max-md:py-1 md:px-1 md:py-2 ${
              active
                ? btnMainSm
                : isData
                  ? "text-mango ring-2 ring-mango/70 hover:bg-mango/15 dark:text-mango"
                  : btnSecondarySm
            }`}
          >
            <span className="text-lg leading-none md:text-base">{t.icon}</span>
            <span
              className={`whitespace-nowrap text-[10px] font-bold ${
                isData ? "max-md:inline" : "max-md:sr-only"
              }`}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );

  const toolNavRow = (
    <div className="flex w-full items-stretch border-b border-palm/10 dark:border-zinc-700">
      {toolNav}
      <div className="max-md:flex md:hidden">{infoTabButton}</div>
    </div>
  );

  function PalettePanels() {
    return (
      <>
{panel === "template" ? <LabelTemplatePanel /> : null}


        {panel === "draw" ? (
          <div className="mt-4 space-y-4">
            <h2 className="text-sm font-black text-palm">Draw</h2>
            <p className="text-xs text-ink/65">Click and drag on the canvas to draw.</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_DRAW_MODE", mode: "brush" })}
                className={state.drawMode === "brush" ? btnChipActive : btnChip}
              >
                Brush
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_DRAW_MODE", mode: "eraser" })}
                className={state.drawMode === "eraser" ? btnChipActive : btnChip}
              >
                Eraser
              </button>
              <button
                type="button"
                disabled={!canUndo}
                onClick={undo}
                className={btnSecondarySm}
              >
                Undo
              </button>
              <button
                type="button"
                disabled={!canRedo}
                onClick={redo}
                className={btnSecondarySm}
              >
                Redo
              </button>
            </div>
            {state.drawMode === "brush" ? (
              <>
                <label className="block text-xs font-bold text-ink/55">
                  Color
                  <input
                    type="color"
                    value={state.brushColor}
                    onChange={(e) => dispatch({ type: "SET_BRUSH", color: e.target.value })}
                    className="mt-1 h-9 w-full cursor-pointer"
                  />
                </label>
                <label className="block text-xs font-bold text-ink/55">
                  Style
                  <select
                    value={state.brushStyle}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_BRUSH",
                        style: e.target.value as typeof state.brushStyle,
                      })
                    }
                    className="mt-1 w-full border-2 border-palm/30 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                  </select>
                </label>
              </>
            ) : null}
            <label className="block text-xs font-bold text-ink/55">
              {state.drawMode === "eraser" ? "Eraser size" : "Thickness"} ({state.brushWidth}px)
              <input
                type="range"
                min={1}
                max={32}
                value={state.brushWidth}
                onChange={(e) => dispatch({ type: "SET_BRUSH", width: Number(e.target.value) })}
                className="mt-2 w-full accent-palm"
              />
            </label>
            <button
              type="button"
              className={btnImportantLink}
              onClick={() => {
                if (!confirmLabelRemoval(LABEL_REMOVAL_MESSAGES.clearDraws)) return;
                dispatch({ type: "CLEAR_DRAWS" });
              }}
            >
              Clear all drawing
            </button>
          </div>
        ) : null}

        {panel === "text" ? (
          <div className="mt-4 space-y-4">
            <h2 className="text-sm font-black text-palm">Text</h2>
            <button
              type="button"
              disabled={!canAdd}
              onClick={addText}
              className={`w-full ${btnSecondaryMd}`}
            >
              + Text box
            </button>
            <button
              type="button"
              disabled={!canAdd}
              onClick={addTable}
              className={`w-full ${btnSecondaryMd}`}
            >
              + Table
            </button>
            <p className="text-[10px] text-ink/55">
              Double-click text on the canvas to edit. Use the Data tab for CSV mail merge.
            </p>

            {selected && isTextElement(selected) ? (
              <TextProperties id={selected.id} el={selected} />
            ) : null}
            {selected && isTableElement(selected) ? (
              <LabelTableProperties id={selected.id} el={selected} />
            ) : null}
          </div>
        ) : null}

        {panel === "data" ? <LabelDataPanel onMessage={setMsg} /> : null}

        {panel === "stickers" ? (
          <div className="mt-4 space-y-3">
            <h2 className="text-sm font-black text-palm">Stickers</h2>
            <p className="text-xs text-ink/65">Add a shape or shop sticker, then drag it on the canvas.</p>
            <div className="grid grid-cols-2 gap-2">
              {(["rect", "circle", "triangle", "star"] as StickerShape[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={!canAdd}
                  onClick={() => addSticker(s)}
                  className="rounded border-2 border-palm/25 py-3 text-xs font-bold capitalize hover:border-palm disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            {stickerAssets.length > 0 ? (
              <div className="space-y-2 border-t border-palm/15 pt-3 dark:border-zinc-700">
                <p className="text-xs font-bold text-ink/55">Shop stickers</p>
                <ul className="grid grid-cols-3 gap-2">
                  {stickerAssets.map((asset) => (
                    <li key={asset.id}>
                      <button
                        type="button"
                        disabled={!canAdd}
                        title={asset.name}
                        onClick={() => addImageSticker(asset.imageUrl, asset.name)}
                        className="w-full rounded border border-palm/20 p-1 hover:border-palm disabled:opacity-50 dark:border-zinc-600"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.imageUrl}
                          alt={asset.name}
                          className="aspect-square w-full object-contain"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {selected && isStickerElement(selected) ? (
              <StickerProperties id={selected.id} el={selected} />
            ) : null}
          </div>
        ) : null}

        {panel === "layers" ? <LabelEditorLayersPanel /> : null}

        {panel === "bag" ? (
          <div className="mt-4 space-y-2">
            <h2 className="text-sm font-black text-blue-600 dark:text-blue-400">Label bag</h2>
            <p className="text-xs text-ink/65">
              {bagItems.length === 0
                ? "No saved labels yet. Add from the canvas with the Add button."
                : `${bagItems.length} saved label${bagItems.length === 1 ? "" : "s"}. Open View bag to manage your bag and checkout.`}
            </p>
          </div>
        ) : null}

        {panel === "upload" ? (
          <div className="mt-4 space-y-3">
            <h2 className="text-sm font-black text-palm">Upload image</h2>
            <input
              type="file"
              accept="image/png,image/webp,image/jpeg,image/gif,image/avif"
              disabled={pending}
              className="text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                startTransition(async () => {
                  const fd = new FormData();
                  fd.set("file", file);
                  const r = await uploadLabelEditorImage(fd);
                  if (!r.ok) {
                    setMsg(r.error);
                    return;
                  }
                  if (isLoggedInCustomer) {
                    if (r.uploadId) {
                      setUploadLibrary((prev) => [
                        { id: r.uploadId!, imageUrl: r.url, createdAt: new Date().toISOString() },
                        ...prev.filter((u) => u.imageUrl !== r.url),
                      ]);
                    } else {
                      const list = await listCustomerLabelUploads();
                      setUploadLibrary(list);
                    }
                  } else {
                    addGuestUpload(r.url);
                    setUploadLibrary(readGuestUploads());
                  }
                  if (canAdd) {
                    dispatch({
                      type: "ADD_ELEMENT",
                      element: defaultImageElement(inset, r.url),
                    });
                  }
                  dispatch({ type: "SET_TOOL", tool: "upload" });
                });
              }}
            />
            {uploadLibrary.length > 0 ? (
              <div className="space-y-2 border-t border-palm/15 pt-3 dark:border-zinc-700">
                <p className="text-xs font-bold text-ink/55">Your uploads</p>
                <ul className="grid grid-cols-2 gap-2">
                  {uploadLibrary.map((item) => (
                    <li key={item.id} className="rounded border border-palm/20 p-1 dark:border-zinc-600">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="aspect-square w-full object-contain bg-zinc-100 dark:bg-zinc-800"
                      />
                      <div className="mt-1 flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={!canAdd}
                          className={`w-full ${btnSecondarySm}`}
                          onClick={() => addImageFromLibrary(item.imageUrl)}
                        >
                          Add to canvas
                        </button>
                        <button
                          type="button"
                          className={btnImportantLink}
                          onClick={() => removeUploadFromLibrary(item)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-ink/50">
                  {isLoggedInCustomer
                    ? "Saved to your account for future visits."
                    : "Saved in this browser until you clear site data."}
                </p>
              </div>
            ) : null}
            {selected && isImageElement(selected) ? <ImageProperties id={selected.id} el={selected} /> : null}
          </div>
        ) : null}

        {isSavedPanel ? (
          <LabelEditorSavedDesignsPanel onMessage={setMsg} className="mt-2 min-h-0 flex-1" />
        ) : null}

        {!isSavedPanel && state.selectedId ? (
          <div className="mt-4 border-t border-palm/15 pt-4 dark:border-zinc-700">
            <button
              type="button"
              className={btnImportantLink}
              onClick={() => {
                if (!confirmLabelRemoval(LABEL_REMOVAL_MESSAGES.deleteSelected)) return;
                dispatch({ type: "DELETE_SELECTED" });
              }}
            >
              Delete selected
            </button>
          </div>
        ) : null}

                {msg ? <p className="mt-2 text-[11px] text-ink/80">{msg}</p> : null}
      </>
    );
  }

  const panelScrollClass =
    "relative flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-auto border-palm/10 p-2 text-xs md:border-l md:p-3 dark:md:border-zinc-700";
  const savedPanelScrollClass =
    "relative flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden border-palm/10 p-2 text-xs md:border-l md:p-3 dark:md:border-zinc-700";
  const mobileSheetMaxHeight =
    isSavedPanel ? "min(72dvh, calc(100dvh - 5rem))" : undefined;

  return (
    <>
      {!infoOpen ? (
        <LabelEditorMobileBottomSheet
          expanded={open}
          onExpandedChange={onOpenChange}
          onHeightChange={setToolsSheetHeight}
          header={toolNavRow}
          contentMaxHeight={mobileSheetMaxHeight}
        >
          <div className={isSavedPanel ? savedPanelScrollClass : panelScrollClass}>
            <PalettePanels />
          </div>
        </LabelEditorMobileBottomSheet>
      ) : null}

      {infoOpen ? (
        <LabelEditorMobileBottomSheet
          className="z-[51]"
          expanded={infoExpanded}
          onExpandedChange={setInfoExpanded}
          onHeightChange={setInfoSheetHeight}
          header={toolNavRow}
        >
          <div className={panelScrollClass}>
            <LabelEditorHelpPanel activeTool={state.activeTool} helpConfig={helpConfig} />
          </div>
        </LabelEditorMobileBottomSheet>
      ) : null}

      <div className="absolute bottom-3 left-2 top-3 z-50 hidden max-h-[calc(100%-1.5rem)] md:flex md:flex-row md:items-stretch md:gap-2">
        <div className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-palm/20 bg-white/95 shadow-xl backdrop-blur-sm dark:border-zinc-600 dark:bg-zinc-900/95">
          {toolNav}
          {infoTabButton}
        </div>
      </div>

      {open ? (
        <>
          <div
            className={`absolute bottom-3 left-[5.25rem] top-3 z-50 hidden max-h-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border border-palm/20 bg-white shadow-2xl md:flex dark:border-zinc-600 dark:bg-zinc-900 ${
              panel === "template" ? "w-[min(32rem,calc(100vw-7rem))]" : "w-72"
            }`}
          >
            <div
              className={`${isSavedPanel ? savedPanelScrollClass : panelScrollClass} ${sheetMode === "info" ? "flex min-h-0 flex-col" : ""}`}
            >
              {sheetMode === "info" ? (
                <LabelEditorHelpPanel
                  activeTool={state.activeTool}
                  helpConfig={helpConfig}
                  onClose={closeHelp}
                />
              ) : (
                <PalettePanels />
              )}
            </div>
            <button
              type="button"
              className={`absolute -right-12 top-3 z-10 hidden items-center gap-1.5 shadow-md md:flex ${btnSecondaryMd}`}
              onClick={() => onOpenChange(false)}
              aria-label="Hide tools"
              title="Hide tools"
            >
              <span className="text-base leading-none" aria-hidden>
                ‹
              </span>
              Hide
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}

function TextProperties({ id, el }: { id: string; el: import("@/lib/label-editor/document").LabelTextElement }) {
  const { dispatch, state, designName, template } = useLabelEditor();
  const patch = (p: Partial<typeof el>) => dispatch({ type: "UPDATE_ELEMENT", id, patch: p });
  const sheet = state.doc.dataSheet;
  const isBagNameSource = state.doc.bagNameSourceElementId === id;
  const currentFieldText = resolveTextContent(el, state.doc).trim() || "(empty)";

  const onBagNameSourceChange = (checked: boolean) => {
    if (!checked) {
      dispatch({ type: "SET_BAG_NAME_SOURCE", elementId: null });
      return;
    }
    const otherId = state.doc.bagNameSourceElementId;
    if (otherId && otherId !== id) {
      const other = findBagNameSourceTextElement(state.doc);
      const otherText = other ? resolveTextContent(other, state.doc).trim() || "(empty)" : "(missing field)";
      if (
        !window.confirm(
          `Another text field is already used for bag and cart names.\n\nCurrent field content:\n"${otherText}"\n\nThis field's content:\n"${currentFieldText}"\n\nUse this field for bag and cart names instead?`,
        )
      ) {
        return;
      }
    }
    dispatch({ type: "SET_BAG_NAME_SOURCE", elementId: id });
  };

  const namePreview = isBagNameSource
    ? previewBagLabelDisplayName({
        designName,
        templateName: template.name,
        doc: state.doc,
        sourceElementId: id,
      })
    : null;

  return (
    <div className="mt-4 space-y-2 border-t border-palm/15 pt-4 text-xs dark:border-zinc-700">
      <p className="font-black uppercase text-palm">Selected text</p>
      {sheet ? (
        <DataColumnMapper
          label="Map to data column"
          value={el.dataColumnIndex}
          headers={sheet.headers}
          onChange={(col) => patch({ dataColumnIndex: col })}
        />
      ) : null}
      {el.dataColumnIndex === null ? (
        <label className="block font-bold text-ink/55">
          Content
          <input
            value={el.text}
            onChange={(e) => patch({ text: e.target.value })}
            className="mt-1 w-full border px-2 py-1 dark:bg-zinc-950"
          />
        </label>
      ) : (
        <p className="text-ink/60">Text comes from data column {el.dataColumnIndex! + 1}.</p>
      )}
      <label className="flex cursor-pointer items-start gap-2 rounded border border-palm/20 bg-palm/5 p-2 dark:border-zinc-600 dark:bg-zinc-800/50">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={isBagNameSource}
          onChange={(e) => onBagNameSourceChange(e.target.checked)}
        />
        <span>
          <span className="font-bold text-ink/80">Use for bag &amp; cart name</span>
          <span className="mt-0.5 block text-[10px] font-normal text-ink/55">
            Format: saved name — row — this field&apos;s text (when data rows are used).
          </span>
        </span>
      </label>
      {namePreview ? (
        <p className="text-[10px] text-ink/55">
          Preview: <span className="font-bold text-ink/75">{namePreview}</span>
        </p>
      ) : null}
      <label className="block font-bold text-ink/55">
        Font
        <select
          value={el.fontFamily}
          onChange={(e) => patch({ fontFamily: e.target.value })}
          className="mt-1 w-full border px-2 py-1 dark:bg-zinc-950"
        >
          {LABEL_FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>
              {LABEL_FONT_FAMILY_LABELS[f]}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-bold text-ink/55">
        Size ({normalizeFontSizePercent(el.fontSize, el.height)}%)
        <input
          type="range"
          min={0}
          max={100}
          value={normalizeFontSizePercent(el.fontSize, el.height)}
          onChange={(e) => patch({ fontSize: Number(e.target.value) })}
          className="mt-1 w-full accent-palm"
        />
        <span className="mt-0.5 block text-[10px] font-normal text-ink/50">100% fills the text box height</span>
      </label>
      <label className="block font-bold text-ink/55">
        Color
        <input type="color" value={el.color} onChange={(e) => patch({ color: e.target.value })} className="mt-1 h-8 w-full" />
      </label>
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={el.bold} onChange={(e) => patch({ bold: e.target.checked })} />
          Bold
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={el.italic} onChange={(e) => patch({ italic: e.target.checked })} />
          Italic
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={el.underline} onChange={(e) => patch({ underline: e.target.checked })} />
          Underline
        </label>
      </div>
      <label className="block font-bold text-ink/55">
        Horizontal align
        <select
          value={el.align}
          onChange={(e) => patch({ align: e.target.value as typeof el.align })}
          className="mt-1 w-full border px-2 py-1 dark:bg-zinc-950"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </label>
      <label className="block font-bold text-ink/55">
        Vertical align
        <select
          value={el.verticalAlign ?? "top"}
          onChange={(e) => patch({ verticalAlign: e.target.value as LabelVerticalAlign })}
          className="mt-1 w-full border px-2 py-1 dark:bg-zinc-950"
        >
          <option value="top">Top</option>
          <option value="middle">Middle</option>
          <option value="bottom">Bottom</option>
        </select>
      </label>
      <label className="block font-bold text-ink/55">
        Rotation ({el.rotation}°)
        <input
          type="range"
          min={-180}
          max={180}
          value={el.rotation}
          onChange={(e) => patch({ rotation: Number(e.target.value) })}
          className="mt-1 w-full accent-palm"
        />
      </label>
    </div>
  );
}

function StickerProperties({ id, el }: { id: string; el: import("@/lib/label-editor/document").LabelStickerElement }) {
  const { dispatch } = useLabelEditor();
  const patch = (p: Partial<typeof el>) => dispatch({ type: "UPDATE_ELEMENT", id, patch: p });

  return (
    <div className="mt-4 space-y-2 border-t border-palm/15 pt-4 text-xs">
      <p className="font-black uppercase text-palm">
        {el.shape === "image" ? "Selected sticker" : "Selected shape"}
      </p>
      {el.shape !== "image" ? (
        <label className="block font-bold text-ink/55">
          Fill
          <input type="color" value={el.fill} onChange={(e) => patch({ fill: e.target.value })} className="mt-1 h-8 w-full" />
        </label>
      ) : null}
      <label className="block font-bold text-ink/55">
        Opacity ({el.opacity}%)
        <input
          type="range"
          min={5}
          max={100}
          value={el.opacity}
          onChange={(e) => patch({ opacity: Number(e.target.value) })}
          className="mt-1 w-full"
        />
      </label>
      <label className="block font-bold text-ink/55">
        Width ({Math.round(el.width)}px)
        <input
          type="range"
          min={20}
          max={400}
          value={el.width}
          onChange={(e) => patch({ width: Number(e.target.value) })}
          className="mt-1 w-full"
        />
      </label>
      <label className="block font-bold text-ink/55">
        Height ({Math.round(el.height)}px)
        <input
          type="range"
          min={20}
          max={400}
          value={el.height}
          onChange={(e) => patch({ height: Number(e.target.value) })}
          className="mt-1 w-full"
        />
      </label>
      <label className="block font-bold text-ink/55">
        Rotation ({el.rotation}°)
        <input
          type="range"
          min={-180}
          max={180}
          value={el.rotation}
          onChange={(e) => patch({ rotation: Number(e.target.value) })}
          className="mt-1 w-full"
        />
      </label>
    </div>
  );
}

function ImageProperties({ id, el }: { id: string; el: import("@/lib/label-editor/document").LabelImageElement }) {
  const { dispatch } = useLabelEditor();
  const patch = (p: Partial<typeof el>) => dispatch({ type: "UPDATE_ELEMENT", id, patch: p });

  return (
    <div className="mt-4 space-y-2 border-t border-palm/15 pt-4 text-xs">
      <p className="font-black uppercase text-palm">Selected image</p>
      <label className="block font-bold text-ink/55">
        Opacity ({el.opacity}%)
        <input
          type="range"
          min={5}
          max={100}
          value={el.opacity}
          onChange={(e) => patch({ opacity: Number(e.target.value) })}
          className="mt-1 w-full"
        />
      </label>
      <label className="block font-bold text-ink/55">
        Width
        <input
          type="range"
          min={24}
          max={500}
          value={el.width}
          onChange={(e) => patch({ width: Number(e.target.value) })}
          className="mt-1 w-full"
        />
      </label>
      <label className="block font-bold text-ink/55">
        Height
        <input
          type="range"
          min={24}
          max={500}
          value={el.height}
          onChange={(e) => patch({ height: Number(e.target.value) })}
          className="mt-1 w-full"
        />
      </label>
      <label className="block font-bold text-ink/55">
        Rotation ({el.rotation}°)
        <input
          type="range"
          min={-180}
          max={180}
          value={el.rotation}
          onChange={(e) => patch({ rotation: Number(e.target.value) })}
          className="mt-1 w-full"
        />
      </label>
    </div>
  );
}
