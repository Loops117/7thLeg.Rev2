"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { adminSaveLabelTemplateStarterDocument } from "@/app/actions/label-templates-admin";
import { LabelAddToBagDialog } from "@/components/labels/label-add-to-bag-dialog";
import { LabelBagView } from "@/components/labels/label-bag-view";
import { LabelSaveBeforeBagDialog } from "@/components/labels/label-save-before-bag-dialog";
import type { LabelBagItem } from "@/lib/label-editor/label-bag";
import { LabelEditorCanvas } from "@/components/labels/label-editor-canvas";
import { LabelEditorProvider, useLabelEditor, useSwitchTemplate } from "@/components/labels/label-editor-context";
import { LabelEditorPalette } from "@/components/labels/label-editor-palette";
import { LabelEditorViewportLock } from "@/components/labels/label-editor-viewport-lock";
import type { LabelBuilderPublicConfig } from "@/lib/label-builder-public";
import type {
  CustomerLabelUploadItem,
  LabelEditorDocument,
  LabelPaletteTool,
  LabelStickerAssetOption,
} from "@/lib/label-editor/document";
import type { LabelEditorHelpConfig } from "@/lib/label-editor-help";
import { LabelEditorSaveActions } from "@/components/labels/label-editor-save-actions";
import { LabelEditorTour } from "@/components/labels/label-editor-tour";
import { LABEL_REMOVAL_MESSAGES, confirmLabelRemoval } from "@/lib/label-editor/confirm-removal";
import type { LabelTemplatePickerOption } from "@/lib/label-editor/template-meta";
import { btnMainMd, btnSecondaryMd } from "@/lib/btn-theme-classes";

function usePalettePanelOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setOpen(true);
    }
  }, []);
  return [open, setOpen] as const;
}

export function LabelEditorApp({
  templates,
  initialTemplateId,
  publicConfig,
  initialDoc,
  savedDesignId,
  designName,
  initialDesignFolderId,
  initialUploads = [],
  isLoggedInCustomer = false,
  initialBagItems,
  starterDocumentJsonByTemplateId,
  finishOptionsByTemplateId,
  isAdminLayoutMode = false,
  adminLayoutTemplateName = null,
  stickerAssets = [],
  helpConfig,
}: {
  templates: LabelTemplatePickerOption[];
  initialTemplateId: string;
  publicConfig: LabelBuilderPublicConfig;
  helpConfig: LabelEditorHelpConfig;
  initialDoc?: LabelEditorDocument;
  savedDesignId?: string | null;
  designName?: string;
  initialDesignFolderId?: string | null;
  initialUploads?: CustomerLabelUploadItem[];
  isLoggedInCustomer?: boolean;
  initialBagItems?: LabelBagItem[];
  starterDocumentJsonByTemplateId?: Record<string, unknown | null>;
  finishOptionsByTemplateId?: Record<string, import("@/lib/label-finish-options").TemplateFinishOptionRow[]>;
  isAdminLayoutMode?: boolean;
  adminLayoutTemplateName?: string | null;
  stickerAssets?: LabelStickerAssetOption[];
}) {
  if (templates.length === 0) {
    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center p-10 text-center">
        <h1 className="text-2xl font-black text-palm">Labels</h1>
        <p className="mt-4 max-w-md text-ink/80">
          No label templates are available yet. An admin can add active templates under Settings → Labels.
        </p>
        <Link href="/store" className="mt-6 text-sm font-bold text-lagoon-dark underline">
          Back to store
        </Link>
      </div>
    );
  }

  return (
    <LabelEditorProvider
      templates={templates}
      initialTemplateId={initialTemplateId}
      publicConfig={publicConfig}
      initialDoc={initialDoc}
      savedDesignId={savedDesignId}
      designName={designName}
      initialDesignFolderId={initialDesignFolderId}
      isLoggedInCustomer={isLoggedInCustomer}
      initialBagItems={initialBagItems}
      starterDocumentJsonByTemplateId={starterDocumentJsonByTemplateId}
      finishOptionsByTemplateId={finishOptionsByTemplateId}
      isAdminLayoutMode={isAdminLayoutMode}
      adminLayoutTemplateName={adminLayoutTemplateName}
      stickerAssets={stickerAssets}
    >
      {!isAdminLayoutMode ? <LabelEditorUrlSync initialTemplateId={initialTemplateId} /> : null}
      <LabelEditorChrome
        initialUploads={initialUploads}
        isLoggedInCustomer={isLoggedInCustomer}
        helpConfig={helpConfig}
        isAdminLayoutMode={isAdminLayoutMode}
      />
    </LabelEditorProvider>
  );
}

/** Keep ?template= in the URL when the customer changes the dropdown. */
function LabelEditorUrlSync({ initialTemplateId }: { initialTemplateId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { templateId } = useLabelEditor();
  const switchTemplate = useSwitchTemplate();

  useEffect(() => {
    if (!searchParams) return;
    const urlTemplate = searchParams.get("template");
    if (
      urlTemplate &&
      urlTemplate !== templateId &&
      urlTemplate !== initialTemplateId
    ) {
      switchTemplate(urlTemplate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync URL → editor once on mount
  }, []);

  useEffect(() => {
    if (!searchParams) return;
    const current = searchParams.get("template");
    if (current !== templateId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("template", templateId);
      router.replace(`/labels?${params.toString()}`, { scroll: false });
    }
  }, [templateId, router, searchParams]);

  return null;
}

function LabelEditorChrome({
  initialUploads,
  isLoggedInCustomer,
  helpConfig,
  isAdminLayoutMode = false,
}: {
  initialUploads: CustomerLabelUploadItem[];
  isLoggedInCustomer: boolean;
  helpConfig: LabelEditorHelpConfig;
  isAdminLayoutMode?: boolean;
}) {
  const {
    dispatch,
    template,
    state,
    bagItems,
    templateId,
    isAdminLayoutMode: adminMode,
    adminLayoutTemplateName,
    needsSaveBeforeBag,
    applyBagItemToEditor,
    savedDesignId,
    designName,
    setDesignName,
    isDocumentDirty,
    isLoggedInCustomer: loggedIn,
  } = useLabelEditor();
  const [headerMsg, setHeaderMsg] = useState("");
  const [bagDialogOpen, setBagDialogOpen] = useState(false);
  const [saveBeforeBagOpen, setSaveBeforeBagOpen] = useState(false);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = usePalettePanelOpen();
  const [mobilePaletteBottom, setMobilePaletteBottom] = useState(88);
  const showBag = state.activeTool === "bag";
  const inBagCount = bagItems.filter((i) => i.inBag !== false).length;

  useEffect(() => {
    const raw = sessionStorage.getItem("lemons-bag-edit");
    if (!raw) return;
    sessionStorage.removeItem("lemons-bag-edit");
    try {
      const item = JSON.parse(raw) as LabelBagItem;
      if (item.templateId === templateId) {
        applyBagItemToEditor(item);
      }
    } catch {
      /* ignore */
    }
  }, [templateId, applyBagItemToEditor]);

  const openAddToBag = () => {
    if (!isLoggedInCustomer) {
      setSignInPromptOpen(true);
      return;
    }
    if (needsSaveBeforeBag) {
      setSaveBeforeBagOpen(true);
      return;
    }
    setBagDialogOpen(true);
  };

  const collapsePalettePanelOnDesktop = useCallback(() => {
    if (state.activeTool === "template") return;
    if (window.matchMedia("(min-width: 768px)").matches) {
      setPaletteOpen(false);
    }
  }, [state.activeTool]);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const selectPaletteTool = useCallback(
    (tool: LabelPaletteTool) => dispatch({ type: "SET_TOOL", tool }),
    [dispatch],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      if (!state.selectedId) return;
      e.preventDefault();
      if (!confirmLabelRemoval(LABEL_REMOVAL_MESSAGES.deleteSelected)) return;
      dispatch({ type: "DELETE_SELECTED" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, state.selectedId]);

  const router = useRouter();
  const [adminSavePending, startAdminSave] = useTransition();
  const [adminSaveMsg, setAdminSaveMsg] = useState("");

  return (
    <>
      <LabelEditorViewportLock />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {adminMode ? (
          <header className="shrink-0 border-b-2 border-palm bg-surf/80 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-palm dark:text-emerald-300">
                  Premade layout · {adminLayoutTemplateName ?? template.name}
                </p>
                <p className="text-[11px] text-ink/60 dark:text-zinc-400">
                  Lock elements in Layers — customers can unlock. Save when done.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/settings/labels"
                  className="rounded border border-palm/30 px-3 py-1.5 text-xs font-bold text-palm dark:border-zinc-600 dark:text-emerald-300"
                >
                  ← Templates
                </Link>
                <button
                  type="button"
                  disabled={adminSavePending}
                  className={btnMainMd}
                  onClick={() => {
                    setAdminSaveMsg("");
                    startAdminSave(async () => {
                      const r = await adminSaveLabelTemplateStarterDocument(templateId, state.doc);
                      if (!r.ok) {
                        setAdminSaveMsg(r.error);
                        return;
                      }
                      setAdminSaveMsg("Saved.");
                      router.refresh();
                    });
                  }}
                >
                  {adminSavePending ? "Saving…" : "Save premade layout"}
                </button>
              </div>
            </div>
            {adminSaveMsg ? (
              <p className="mt-2 text-xs font-bold text-palm dark:text-emerald-300">{adminSaveMsg}</p>
            ) : null}
          </header>
        ) : null}
        {!adminMode ? (
        <header className="flex shrink-0 items-center justify-between gap-1.5 border-b border-palm/20 bg-surf/50 px-2 py-1 sm:gap-2 sm:px-4 sm:py-1.5 dark:border-zinc-700 dark:bg-zinc-900/80">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {!adminMode ? (
            <Link
              href="/store"
              className="shrink-0 text-[11px] font-bold text-lagoon-dark underline sm:text-sm dark:text-emerald-300"
            >
              ← Store
            </Link>
            ) : null}
            {savedDesignId && loggedIn && !showBag ? (
              <label className="flex min-w-0 flex-1 items-center gap-1.5 sm:max-w-xs">
                <span className="sr-only">Label name</span>
                <input
                  value={designName}
                  onChange={(e) => setDesignName(e.target.value)}
                  className="min-w-0 flex-1 truncate border-0 border-b-2 border-palm/25 bg-transparent px-0 py-0.5 text-xs font-black text-palm focus:border-palm focus:outline-none sm:text-sm dark:border-zinc-600 dark:text-emerald-300"
                />
                {isDocumentDirty ? (
                  <span className="shrink-0 text-[10px] font-bold text-mango" title="Unsaved changes">
                    ●
                  </span>
                ) : null}
              </label>
            ) : (
              <h1 className="truncate text-xs font-black text-palm sm:text-sm dark:text-emerald-300">
                {designName?.trim() ? designName : "Label editor"}
              </h1>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!showBag ? (
              <LabelEditorSaveActions
                onMessage={(m) => {
                  setHeaderMsg(m);
                  window.setTimeout(() => setHeaderMsg(""), 3000);
                }}
              />
            ) : null}
            <p className="hidden max-w-[14rem] truncate text-[11px] text-ink/55 lg:block">
              {template.widthMm}×{template.heightMm} mm
              {bagItems.length > 0
                ? ` · ${inBagCount} in bag · ${bagItems.length} saved`
                : null}
              {headerMsg ? ` · ${headerMsg}` : null}
            </p>
          </div>
        </header>
        ) : null}

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="absolute inset-0 flex flex-col">
            {showBag ? (
              <LabelBagView />
            ) : (
              <LabelEditorCanvas
                onCanvasInteract={collapsePalettePanelOnDesktop}
                bottomInsetPx={mobilePaletteBottom}
              />
            )}
          </div>

          {!showBag ? (
            <LabelEditorPalette
              open={paletteOpen}
              onOpenChange={setPaletteOpen}
              onMobileHeightChange={setMobilePaletteBottom}
              helpConfig={helpConfig}
              initialUploads={initialUploads}
              isLoggedInCustomer={isLoggedInCustomer}
            />
          ) : null}

          {!showBag ? (
            <LabelEditorTour
              helpConfig={helpConfig}
              activeTool={state.activeTool}
              onOpenPalette={openPalette}
              onSelectTool={selectPaletteTool}
            />
          ) : null}

          {!showBag && !adminMode ? (
            <div
              className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] right-2 z-40 flex overflow-hidden rounded-full border-2 border-blue-700 shadow-xl ring-4 ring-blue-400/30 max-md:bottom-[calc(env(safe-area-inset-bottom,0px)+var(--label-palette-h,5.5rem)+0.5rem)] sm:right-4 md:bottom-5 md:right-5"
              style={{ ["--label-palette-h" as string]: `${mobilePaletteBottom}px` }}
              role="group"
              aria-label="Bag actions"
            >
              <button
                type="button"
                className="bg-blue-400 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500 sm:px-5 sm:py-3 sm:text-base dark:bg-blue-500 dark:hover:bg-blue-400"
                onClick={openAddToBag}
              >
                Add
              </button>
              <button
                type="button"
                className="border-l border-blue-700/40 bg-blue-600 px-3 py-2.5 text-sm font-black text-white hover:bg-blue-700 sm:px-4 sm:py-3 sm:text-base dark:bg-blue-700 dark:hover:bg-blue-600"
                onClick={() => dispatch({ type: "SET_TOOL", tool: "bag" })}
              >
                <span className="hidden min-[420px]:inline">View bag</span>
                <span className="min-[400px]:hidden">Bag</span>
                {inBagCount > 0 ? ` (${inBagCount})` : bagItems.length > 0 ? ` · ${bagItems.length}` : ""}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <LabelSaveBeforeBagDialog
        open={saveBeforeBagOpen}
        onClose={() => setSaveBeforeBagOpen(false)}
        onSaved={() => {
          setSaveBeforeBagOpen(false);
          setBagDialogOpen(true);
        }}
      />
      <LabelAddToBagDialog open={bagDialogOpen} onClose={() => setBagDialogOpen(false)} />

      {signInPromptOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="max-w-sm rounded-lg border-2 border-palm bg-white p-4 shadow-xl dark:border-zinc-600 dark:bg-zinc-900">
            <h2 className="text-sm font-black text-palm">Sign in to save & add to bag</h2>
            <p className="mt-2 text-xs text-ink/65">
              Save your label (including data) to your account before adding it to your bag.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className={`flex-1 ${btnSecondaryMd}`}
                onClick={() => setSignInPromptOpen(false)}
              >
                Cancel
              </button>
              <Link
                href="/login?callbackUrl=/labels"
                className={`flex flex-1 items-center justify-center ${btnMainMd}`}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
