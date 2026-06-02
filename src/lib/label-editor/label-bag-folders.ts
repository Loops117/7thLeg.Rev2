export type LabelBagFolder = {
  id: string;
  name: string;
};

const FOLDERS_KEY = "lemons-label-bag-folders";

export function readBagFolders(): LabelBagFolder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LabelBagFolder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeBagFolders(folders: LabelBagFolder[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders.slice(0, 50)));
}

export function newBagFolderId(): string {
  return `bf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
