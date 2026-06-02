/** Short browser confirm for label editor destructive actions (client-only). */
export function confirmLabelRemoval(message: string): boolean {
  if (typeof window === "undefined") return false;
  return window.confirm(message);
}

export const LABEL_REMOVAL_MESSAGES = {
  deleteSelected: "Remove the selected item from this label?",
  clearDraws: "Remove all freehand drawing from this label?",
  clearLabel:
    "Clear this label? All elements, drawings, and data on the canvas will be removed. You can Undo afterward.",
  clearData: "Clear all CSV data from this label?",
  deleteUpload: "Delete this uploaded image from your library?",
  deleteSavedDesign: (name: string) =>
    `Delete saved label "${name}"? This cannot be undone.`,
  removeFromBag: "Remove this label from your bag? It will stay in your saved labels.",
  emptyBag: "Remove all labels from your bag? They will stay in your saved labels.",
  deleteFromLibrary: (count: number) =>
    `Delete ${count} saved label${count === 1 ? "" : "s"} from your library? This cannot be undone.`,
} as const;
