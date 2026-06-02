"use client";

import { useState } from "react";
import { useLabelEditor } from "@/components/labels/label-editor-context";
import type { LabelCanvasElement } from "@/lib/label-editor/document";
import { defaultLayerName, layersFrontToBack } from "@/lib/label-editor/layers";

export function LabelEditorLayersPanel() {
  const { state, dispatch } = useLabelEditor();
  const layers = layersFrontToBack(state.doc);
  const [dragId, setDragId] = useState<string | null>(null);

  const selectLayer = (id: string) => {
    dispatch({ type: "SELECT", id });
    dispatch({ type: "SET_TOOL", tool: "layers" });
  };

  const onDragStart = (id: string) => setDragId(id);

  const onDropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const backOrder = state.doc.elements;
    const from = backOrder.findIndex((e) => e.id === dragId);
    const targetBack = backOrder.findIndex((e) => e.id === targetId);
    if (from < 0 || targetBack < 0) {
      setDragId(null);
      return;
    }
    dispatch({ type: "MOVE_ELEMENT_LAYER", id: dragId, toIndex: targetBack });
    setDragId(null);
  };

  const moveForward = (id: string) => {
    dispatch({ type: "REORDER_ELEMENT_LAYER", id, direction: "forward" });
  };

  const moveBackward = (id: string) => {
    dispatch({ type: "REORDER_ELEMENT_LAYER", id, direction: "backward" });
  };

  if (layers.length === 0) {
    return (
      <div className="mt-2 space-y-2">
        <h2 className="text-sm font-black text-palm">Layers</h2>
        <p className="text-xs text-ink/65">Add text, stickers, or images to build your label. Reorder layers here.</p>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <h2 className="text-sm font-black text-palm">Layers</h2>
      <p className="text-[10px] text-ink/60">Top of the list appears in front. Drag or use arrows to reorder.</p>
      <ul className="space-y-1">
        {layers.map((el, frontIndex) => (
          <LayerRow
            key={el.id}
            el={el}
            selected={state.selectedId === el.id}
            isFirst={frontIndex === 0}
            isLast={frontIndex === layers.length - 1}
            onSelect={() => selectLayer(el.id)}
            onMoveForward={() => moveForward(el.id)}
            onMoveBackward={() => moveBackward(el.id)}
            onRename={(layerName) =>
              dispatch({ type: "UPDATE_ELEMENT", id: el.id, patch: { layerName } })
            }
            onDragStart={() => onDragStart(el.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropOn(el.id)}
            isDragging={dragId === el.id}
          />
        ))}
      </ul>
    </div>
  );
}

function LayerRow({
  el,
  selected,
  isFirst,
  isLast,
  onSelect,
  onMoveForward,
  onMoveBackward,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: {
  el: LabelCanvasElement;
  selected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onMoveForward: () => void;
  onMoveBackward: () => void;
  onRename: (name: string) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  isDragging: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(defaultLayerName(el));

  const commitRename = () => {
    setEditing(false);
    onRename(draft.trim() || defaultLayerName(el));
  };

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex items-center gap-1 rounded-lg border px-1.5 py-1 ${
        selected
          ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40"
          : "border-palm/15 bg-white dark:border-zinc-600 dark:bg-zinc-900"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab px-0.5 text-ink/40 active:cursor-grabbing"
        aria-label="Drag to reorder"
        title="Drag to reorder"
      >
        ⠿
      </button>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onSelect}>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(defaultLayerName(el));
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded border border-palm/30 px-1 py-0.5 text-xs"
          />
        ) : (
          <span
            className="block truncate text-xs font-bold text-ink dark:text-zinc-200"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setDraft(defaultLayerName(el));
              setEditing(true);
            }}
          >
            {defaultLayerName(el)}
            {el.locked ? <span className="ml-1 text-[10px] text-ink/50">🔒</span> : null}
          </span>
        )}
      </button>
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          disabled={isFirst}
          onClick={onMoveForward}
          className="rounded px-1 text-xs font-bold text-palm disabled:opacity-30"
          aria-label="Move forward"
          title="Move forward"
        >
          ▲
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={onMoveBackward}
          className="rounded px-1 text-xs font-bold text-palm disabled:opacity-30"
          aria-label="Move backward"
          title="Move backward"
        >
          ▼
        </button>
      </div>
    </li>
  );
}
