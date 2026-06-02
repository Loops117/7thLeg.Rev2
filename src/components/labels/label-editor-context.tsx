"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
} from "react";
import type { LabelBuilderPublicConfig } from "@/lib/label-builder-public";
import {
  countDocumentElements,
  parseLabelEditorDocument,
  type LabelEditorDocument,
  type LabelStickerAssetOption,
} from "@/lib/label-editor/document";
import {
  canUndo,
  canRedo,
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
  type EditorHistory,
} from "@/lib/label-editor/history";
import { syncCustomerLabelBagAction } from "@/app/actions/label-bag";
import { saveCustomerLabelDesign } from "@/app/actions/label-designs";
import {
  readLabelEditorDraft,
  readLabelEditorDraftMeta,
  writeLabelEditorDraft,
} from "@/lib/label-editor/label-editor-draft";
import { loadCustomerLabelDesign } from "@/app/actions/label-designs";
import {
  cloneDocument,
  readLabelBag,
  writeLabelBag,
  type LabelBagItem,
} from "@/lib/label-editor/label-bag";
import { readBagFolders } from "@/lib/label-editor/label-bag-folders";
import type { TemplateFinishOptionRow } from "@/lib/label-finish-options";
import { customerStarterDocumentFromTemplate } from "@/lib/label-template-starter";
import type { LabelTemplatePickerOption } from "@/lib/label-editor/template-meta";
import {
  canAddElement,
  createInitialEditorState,
  labelEditorReducer,
  shouldPushHistory,
  type LabelEditorAction,
  type LabelEditorState,
} from "@/lib/label-editor/reducer";

type LabelEditorShellContextValue = {
  templates: LabelTemplatePickerOption[];
  templateId: string;
  setTemplateId: (id: string) => void;
  template: LabelTemplatePickerOption;
  publicConfig: LabelBuilderPublicConfig;
  savedDesignId: string | null;
  setSavedDesignId: (id: string | null) => void;
  designName: string;
  setDesignName: (name: string) => void;
  designFolderId: string | null;
  setDesignFolderId: (id: string | null) => void;
  isLoggedInCustomer: boolean;
  stickerAssets: LabelStickerAssetOption[];
  isAdminLayoutMode: boolean;
  adminLayoutTemplateName: string | null;
  finishOptionsByTemplateId: Record<string, TemplateFinishOptionRow[]>;
  starterDocumentJsonByTemplateId: Record<string, unknown | null>;
};

type LabelEditorStateContextValue = {
  state: LabelEditorState;
  dispatch: Dispatch<LabelEditorAction>;
  maxElements: number;
  canAdd: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  /** One undo step per drag/resize (call at pointer down / up). */
  beginHistoryGesture: () => void;
  endHistoryGesture: () => void;
  bagItems: LabelBagItem[];
  addBagItems: (items: LabelBagItem[]) => void;
  updateBagItem: (id: string, patch: Partial<LabelBagItem>) => void;
  updateBagItems: (ids: Iterable<string>, patch: Partial<LabelBagItem>) => void;
  removeBagItem: (id: string) => void;
  removeBagItems: (ids: Iterable<string>) => void;
  removeFromBagOnly: (id: string) => void;
  emptyBag: () => void;
  editingBagItemId: string | null;
  loadBagItemForEdit: (item: LabelBagItem) => void;
  applyBagItemToEditor: (item: LabelBagItem) => void;
  clearBagItemEdit: () => void;
  needsSaveBeforeBag: boolean;
  isDocumentDirty: boolean;
  markDocumentSaved: () => void;
  saveCurrentDesign: () => Promise<{ ok: true } | { ok: false; error: string }>;
  saveDesignWithOptions: (opts: {
    name: string;
    folderId: string | null;
    asNew: boolean;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  loadSavedDesignIntoEditor: (designId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  loadBrowserDraftIntoEditor: () => boolean;
};

const LabelEditorShellContext = createContext<LabelEditorShellContextValue | null>(null);
const LabelEditorStateContext = createContext<LabelEditorStateContextValue | null>(null);

export function LabelEditorProvider({
  templates,
  initialTemplateId,
  publicConfig,
  initialDoc,
  savedDesignId: initialSavedId,
  designName: initialDesignName,
  initialDesignFolderId,
  isLoggedInCustomer = false,
  initialBagItems,
  stickerAssets = [],
  starterDocumentJsonByTemplateId = {},
  finishOptionsByTemplateId = {},
  isAdminLayoutMode = false,
  adminLayoutTemplateName = null,
  children,
}: {
  templates: LabelTemplatePickerOption[];
  initialTemplateId: string;
  publicConfig: LabelBuilderPublicConfig;
  initialDoc?: LabelEditorDocument;
  savedDesignId?: string | null;
  designName?: string;
  initialDesignFolderId?: string | null;
  isLoggedInCustomer?: boolean;
  initialBagItems?: LabelBagItem[];
  stickerAssets?: LabelStickerAssetOption[];
  starterDocumentJsonByTemplateId?: Record<string, unknown | null>;
  finishOptionsByTemplateId?: Record<string, TemplateFinishOptionRow[]>;
  isAdminLayoutMode?: boolean;
  adminLayoutTemplateName?: string | null;
  children: ReactNode;
}) {
  const defaultId = templates[0]?.id ?? initialTemplateId;
  const [templateId, setTemplateIdState] = useState(() =>
    templates.some((t) => t.id === initialTemplateId) ? initialTemplateId : defaultId,
  );
  const [savedDesignId, setSavedDesignId] = useState<string | null>(initialSavedId ?? null);
  const [designName, setDesignName] = useState(initialDesignName?.trim() || "My label");
  const [designFolderId, setDesignFolderId] = useState<string | null>(initialDesignFolderId ?? null);
  const [loadedForTemplateId, setLoadedForTemplateId] = useState(initialTemplateId);

  const template = templates.find((t) => t.id === templateId) ?? templates[0]!;
  const setTemplateId = useCallback(
    (id: string) => {
      if (id === templateId || !templates.some((t) => t.id === id)) return;
      setTemplateIdState(id);
      setSavedDesignId(null);
      setDesignFolderId(null);
      setLoadedForTemplateId(id);
    },
    [templateId, templates],
  );

  const shellValue = useMemo(
    () => ({
      templates,
      templateId,
      setTemplateId,
      template,
      publicConfig,
      savedDesignId,
      setSavedDesignId,
      designName,
      setDesignName,
      designFolderId,
      setDesignFolderId,
      isLoggedInCustomer,
      stickerAssets,
      isAdminLayoutMode,
      adminLayoutTemplateName,
      finishOptionsByTemplateId,
      starterDocumentJsonByTemplateId,
    }),
    [
      templates,
      templateId,
      setTemplateId,
      template,
      publicConfig,
      savedDesignId,
      designName,
      designFolderId,
      isLoggedInCustomer,
      stickerAssets,
      isAdminLayoutMode,
      adminLayoutTemplateName,
      finishOptionsByTemplateId,
      starterDocumentJsonByTemplateId,
    ],
  );

  const docForMount =
    initialDoc && loadedForTemplateId === templateId ? initialDoc : undefined;
  const starterRaw = starterDocumentJsonByTemplateId[templateId] ?? null;

  return (
    <LabelEditorShellContext.Provider value={shellValue}>
      <LabelEditorStateHost
        key={templateId}
        templateId={templateId}
        initialDoc={docForMount}
        starterDocumentRaw={starterRaw}
        isLoggedInCustomer={isLoggedInCustomer}
        isAdminLayoutMode={isAdminLayoutMode}
        initialBagItems={initialBagItems}
      >
        {children}
      </LabelEditorStateHost>
    </LabelEditorShellContext.Provider>
  );
}

function LabelEditorStateHost({
  templateId,
  initialDoc,
  starterDocumentRaw,
  isLoggedInCustomer,
  isAdminLayoutMode,
  initialBagItems,
  children,
}: {
  templateId: string;
  initialDoc?: LabelEditorDocument;
  starterDocumentRaw?: unknown | null;
  isLoggedInCustomer: boolean;
  isAdminLayoutMode: boolean;
  initialBagItems?: LabelBagItem[];
  children: ReactNode;
}) {
  const shell = useLabelEditorShell();
  const [state, rawDispatch] = useReducer(labelEditorReducer, templateId, (tid) => {
    let doc = initialDoc ?? readLabelEditorDraft(tid) ?? undefined;
    if (!doc && !isAdminLayoutMode && starterDocumentRaw != null) {
      doc = customerStarterDocumentFromTemplate(starterDocumentRaw, tid);
    }
    return createInitialEditorState(tid, doc);
  });
  const historyRef = useRef<EditorHistory>(createHistory());
  const skipNextHistoryRef = useRef(false);
  const historyGestureRef = useRef(false);
  const docRef = useRef(state.doc);
  docRef.current = state.doc;
  const [historyTick, setHistoryTick] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);

  const [bagItems, setBagItems] = useState<LabelBagItem[]>(() => {
    if (initialBagItems && initialBagItems.length > 0) return initialBagItems;
    return readLabelBag();
  });
  const [editingBagItemId, setEditingBagItemId] = useState<string | null>(null);
  const bagSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedDocSnapshotRef = useRef(
    initialDoc ? JSON.stringify(initialDoc) : "",
  );

  useEffect(() => {
    if (!isLoggedInCustomer) return;
    const local = readLabelBag();
    if (initialBagItems && initialBagItems.length > 0) {
      writeLabelBag(initialBagItems);
      return;
    }
    if (local.length > 0) {
      setBagItems(local);
      writeLabelBag(local);
      void syncCustomerLabelBagAction(local, readBagFolders());
    }
  }, [isLoggedInCustomer, initialBagItems]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      writeLabelEditorDraft(templateId, state.doc, shell.designName);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [templateId, state.doc, shell.designName]);

  useEffect(() => {
    if (initialDoc) {
      savedDocSnapshotRef.current = JSON.stringify(initialDoc);
    }
  }, [initialDoc]);

  useEffect(() => {
    return () => {
      if (bagSyncTimerRef.current) clearTimeout(bagSyncTimerRef.current);
    };
  }, []);

  const persistBag = useCallback(
    (items: LabelBagItem[]) => {
      setBagItems(items);
      writeLabelBag(items);
      if (!isLoggedInCustomer) return;
      if (bagSyncTimerRef.current) clearTimeout(bagSyncTimerRef.current);
      bagSyncTimerRef.current = setTimeout(() => {
        void syncCustomerLabelBagAction(items, readBagFolders());
      }, 600);
    },
    [isLoggedInCustomer],
  );

  const beginHistoryGesture = useCallback(() => {
    if (historyGestureRef.current) return;
    historyGestureRef.current = true;
    historyRef.current = pushHistory(historyRef.current, docRef.current);
    setHistoryTick((t) => t + 1);
  }, []);

  const endHistoryGesture = useCallback(() => {
    historyGestureRef.current = false;
  }, []);

  const dispatch = useCallback((action: LabelEditorAction) => {
    if (action.type === "SET_DOC" && action.skipHistory) {
      skipNextHistoryRef.current = true;
    }
    if (
      shouldPushHistory(action) &&
      !skipNextHistoryRef.current &&
      !historyGestureRef.current
    ) {
      historyRef.current = pushHistory(historyRef.current, docRef.current);
      setHistoryTick((t) => t + 1);
    }
    skipNextHistoryRef.current = false;
    rawDispatch(action);
  }, []);

  const undo = useCallback(() => {
    const result = undoHistory(historyRef.current, docRef.current);
    if (!result) return;
    historyRef.current = result.history;
    skipNextHistoryRef.current = true;
    rawDispatch({ type: "SET_DOC", doc: result.doc, skipHistory: true });
    setHistoryTick((t) => t + 1);
  }, []);

  const redo = useCallback(() => {
    const result = redoHistory(historyRef.current, docRef.current);
    if (!result) return;
    historyRef.current = result.history;
    skipNextHistoryRef.current = true;
    rawDispatch({ type: "SET_DOC", doc: result.doc, skipHistory: true });
    setHistoryTick((t) => t + 1);
  }, []);

  const addBagItems = useCallback(
    (items: LabelBagItem[]) => {
      const stamped = items.map((item) => ({
        ...item,
        addedAt: item.addedAt ?? Date.now(),
        inBag: item.inBag ?? true,
      }));
      persistBag([...bagItems, ...stamped]);
    },
    [bagItems, persistBag],
  );

  const updateBagItem = useCallback(
    (id: string, patch: Partial<LabelBagItem>) => {
      persistBag(
        bagItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [bagItems, persistBag],
  );

  const updateBagItems = useCallback(
    (ids: Iterable<string>, patch: Partial<LabelBagItem>) => {
      const idSet = new Set(ids);
      if (idSet.size === 0) return;
      persistBag(
        bagItems.map((item) => (idSet.has(item.id) ? { ...item, ...patch } : item)),
      );
    },
    [bagItems, persistBag],
  );

  const markDocumentSaved = useCallback(() => {
    savedDocSnapshotRef.current = JSON.stringify(docRef.current);
    setSavedRevision((n) => n + 1);
  }, []);

  const needsSaveBeforeBag =
    isLoggedInCustomer &&
    (!shell.savedDesignId || savedDocSnapshotRef.current !== JSON.stringify(state.doc));

  const applyBagItemToEditor = useCallback(
    (item: LabelBagItem) => {
      skipNextHistoryRef.current = true;
      rawDispatch({ type: "SET_DOC", doc: cloneDocument(item.document), skipHistory: true });
      setEditingBagItemId(item.id);
      if (item.savedDesignId) shell.setSavedDesignId(item.savedDesignId);
      if (item.savedDesignName) shell.setDesignName(item.savedDesignName);
      savedDocSnapshotRef.current = JSON.stringify(item.document);
      rawDispatch({ type: "SET_TOOL", tool: "draw" });
    },
    [shell],
  );

  const loadBagItemForEdit = useCallback(
    (item: LabelBagItem) => {
      if (item.templateId !== shell.templateId) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("lemons-bag-edit", JSON.stringify(item));
          const q = new URLSearchParams();
          q.set("template", item.templateId);
          if (item.savedDesignId) q.set("load", item.savedDesignId);
          window.location.href = `/labels?${q.toString()}`;
        }
        return;
      }
      applyBagItemToEditor(item);
    },
    [shell.templateId, applyBagItemToEditor],
  );

  const clearBagItemEdit = useCallback(() => {
    setEditingBagItemId(null);
  }, []);

  const isDocumentDirty = useMemo(
    () => savedDocSnapshotRef.current !== JSON.stringify(state.doc),
    [state.doc, savedRevision],
  );

  const saveCurrentDesign = useCallback(async (): Promise<
    { ok: true } | { ok: false; error: string }
  > => {
    if (!isLoggedInCustomer) {
      return { ok: false, error: "Sign in to save label designs." };
    }
    const r = await saveCustomerLabelDesign({
      id: shell.savedDesignId ?? undefined,
      templateId: shell.template.id,
      name: shell.designName.trim() || "My label",
      document: state.doc,
      folderId: shell.designFolderId,
    });
    if (!r.ok) return r;
    shell.setSavedDesignId(r.id);
    markDocumentSaved();
    if (editingBagItemId) {
      const item = bagItems.find((b) => b.id === editingBagItemId);
      if (item) {
        persistBag(
          bagItems.map((b) =>
            b.id === editingBagItemId
              ? {
                  ...b,
                  document: cloneDocument(state.doc),
                  savedDesignId: r.id,
                  savedDesignName: shell.designName.trim() || b.savedDesignName,
                }
              : b,
          ),
        );
      }
    }
    return { ok: true };
  }, [
    isLoggedInCustomer,
    shell,
    state.doc,
    markDocumentSaved,
    editingBagItemId,
    bagItems,
    persistBag,
  ]);

  const saveDesignWithOptions = useCallback(
    async (opts: {
      name: string;
      folderId: string | null;
      asNew: boolean;
    }): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!isLoggedInCustomer) {
        return { ok: false, error: "Sign in to save label designs." };
      }
      const name = opts.name.trim() || "My label";
      const r = await saveCustomerLabelDesign({
        id: opts.asNew ? undefined : shell.savedDesignId ?? undefined,
        templateId: shell.template.id,
        name,
        document: state.doc,
        folderId: opts.folderId,
      });
      if (!r.ok) return r;
      shell.setSavedDesignId(r.id);
      shell.setDesignName(name);
      shell.setDesignFolderId(opts.folderId);
      markDocumentSaved();
      if (editingBagItemId) {
        const item = bagItems.find((b) => b.id === editingBagItemId);
        if (item) {
          persistBag(
            bagItems.map((b) =>
              b.id === editingBagItemId
                ? {
                    ...b,
                    document: cloneDocument(state.doc),
                    savedDesignId: r.id,
                    savedDesignName: name,
                  }
                : b,
            ),
          );
        }
      }
      return { ok: true };
    },
    [
      isLoggedInCustomer,
      shell,
      state.doc,
      markDocumentSaved,
      editingBagItemId,
      bagItems,
      persistBag,
    ],
  );

  const removeBagItem = useCallback(
    (id: string) => {
      persistBag(bagItems.filter((item) => item.id !== id));
    },
    [bagItems, persistBag],
  );

  const removeBagItems = useCallback(
    (ids: Iterable<string>) => {
      const idSet = new Set(ids);
      if (idSet.size === 0) return;
      persistBag(bagItems.filter((item) => !idSet.has(item.id)));
    },
    [bagItems, persistBag],
  );

  const removeFromBagOnly = useCallback(
    (id: string) => {
      updateBagItem(id, { inBag: false });
    },
    [updateBagItem],
  );

  const emptyBag = useCallback(() => {
    persistBag(bagItems.map((item) => (item.inBag !== false ? { ...item, inBag: false } : item)));
  }, [bagItems, persistBag]);

  const loadSavedDesignIntoEditor = useCallback(
    async (designId: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!shell.isLoggedInCustomer) {
        return { ok: false, error: "Sign in to open saved designs." };
      }
      const r = await loadCustomerLabelDesign(designId);
      if (!r.ok) return r;
      const doc = parseLabelEditorDocument(r.document, r.templateId);
      if (doc.templateId !== shell.templateId) {
        return { ok: false, error: "That design belongs to a different template." };
      }
      skipNextHistoryRef.current = true;
      rawDispatch({ type: "SET_DOC", doc: cloneDocument(doc), skipHistory: true });
      shell.setSavedDesignId(designId);
      shell.setDesignName(r.name);
      savedDocSnapshotRef.current = JSON.stringify(doc);
      setSavedRevision((n) => n + 1);
      setEditingBagItemId(null);
      return { ok: true };
    },
    [shell, rawDispatch],
  );

  const loadBrowserDraftIntoEditor = useCallback((): boolean => {
    const meta = readLabelEditorDraftMeta(shell.templateId);
    if (!meta) return false;
    skipNextHistoryRef.current = true;
    rawDispatch({ type: "SET_DOC", doc: cloneDocument(meta.doc), skipHistory: true });
    shell.setSavedDesignId(null);
    shell.setDesignName(meta.designName);
    savedDocSnapshotRef.current = JSON.stringify(meta.doc);
    setSavedRevision((n) => n + 1);
    setEditingBagItemId(null);
    return true;
  }, [shell, rawDispatch]);

  const maxElements = shell.template.maxElements;
  const canAdd = canAddElement(state.doc, maxElements);

  const stateValue = useMemo(
    () => ({
      state,
      dispatch,
      maxElements,
      canAdd,
      canUndo: canUndo(historyRef.current), // historyTick keeps this fresh
      canRedo: canRedo(historyRef.current),
      undo,
      redo,
      beginHistoryGesture,
      endHistoryGesture,
      bagItems,
      addBagItems,
      updateBagItem,
      updateBagItems,
      removeBagItem,
      removeBagItems,
      removeFromBagOnly,
      emptyBag,
      editingBagItemId,
      loadBagItemForEdit,
      applyBagItemToEditor,
      clearBagItemEdit,
      needsSaveBeforeBag,
      isDocumentDirty,
      markDocumentSaved,
      saveCurrentDesign,
      saveDesignWithOptions,
      loadSavedDesignIntoEditor,
      loadBrowserDraftIntoEditor,
    }),
    [
      state,
      dispatch,
      maxElements,
      canAdd,
      undo,
      redo,
      beginHistoryGesture,
      endHistoryGesture,
      bagItems,
      addBagItems,
      updateBagItem,
      updateBagItems,
      removeBagItem,
      removeBagItems,
      removeFromBagOnly,
      emptyBag,
      editingBagItemId,
      loadBagItemForEdit,
      applyBagItemToEditor,
      clearBagItemEdit,
      needsSaveBeforeBag,
      isDocumentDirty,
      markDocumentSaved,
      saveCurrentDesign,
      saveDesignWithOptions,
      loadSavedDesignIntoEditor,
      loadBrowserDraftIntoEditor,
      historyTick,
    ],
  );

  return (
    <LabelEditorStateContext.Provider value={stateValue}>{children}</LabelEditorStateContext.Provider>
  );
}

function useLabelEditorShell() {
  const ctx = useContext(LabelEditorShellContext);
  if (!ctx) throw new Error("useLabelEditor must be used within LabelEditorProvider");
  return ctx;
}

function useLabelEditorState() {
  const ctx = useContext(LabelEditorStateContext);
  if (!ctx) throw new Error("useLabelEditor must be used within LabelEditorProvider");
  return ctx;
}

/** Full editor context (shell + document state). */
export function useLabelEditor() {
  return { ...useLabelEditorShell(), ...useLabelEditorState() };
}

/** Document dispatch when inside the editor; null in cart/bag previews outside the provider. */
export function useLabelEditorDispatchOptional(): Dispatch<LabelEditorAction> | null {
  const ctx = useContext(LabelEditorStateContext);
  return ctx?.dispatch ?? null;
}

export function useLabelEditorHistoryGestureOptional(): {
  beginHistoryGesture: () => void;
  endHistoryGesture: () => void;
} | null {
  const ctx = useContext(LabelEditorStateContext);
  if (!ctx) return null;
  return {
    beginHistoryGesture: ctx.beginHistoryGesture,
    endHistoryGesture: ctx.endHistoryGesture,
  };
}

export function useSwitchTemplate() {
  const { templateId, setTemplateId, templates } = useLabelEditor();

  return useCallback(
    (nextId: string) => {
      if (nextId === templateId) return false;
      if (!templates.some((t) => t.id === nextId)) return false;
      setTemplateId(nextId);
      return true;
    },
    [templateId, setTemplateId, templates],
  );
}

export function useDesignCoords(containerRef: RefObject<HTMLElement | null>) {
  return useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const w = el.offsetWidth || 1;
      const h = el.offsetHeight || 1;
      return {
        x: ((clientX - rect.left) / rect.width) * w,
        y: ((clientY - rect.top) / rect.height) * h,
      };
    },
    [containerRef],
  );
}
