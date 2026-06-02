import type { LabelPaletteTool } from "@/lib/label-editor/document";

export const LABEL_EDITOR_HELP_VERSION = 1 as const;

/** Tools that appear in the label editor palette (excludes bag). */
export const LABEL_PALETTE_TOOL_ORDER = [
  "template",
  "data",
  "draw",
  "text",
  "stickers",
  "upload",
  "layers",
  "saved",
] as const;

export type LabelPaletteHelpTool = (typeof LABEL_PALETTE_TOOL_ORDER)[number];

export type LabelEditorHelpToolContent = {
  guideHtml: string;
  tourTitle: string;
  tourHtml: string;
};

export type LabelEditorHelpConfig = {
  version: typeof LABEL_EDITOR_HELP_VERSION;
  tourEnabled: boolean;
  tools: Record<LabelPaletteHelpTool, LabelEditorHelpToolContent>;
};

export const LABEL_TOOL_LABELS: Record<LabelPaletteHelpTool, string> = {
  template: "Template",
  data: "Data",
  draw: "Draw",
  text: "Text",
  stickers: "Stickers",
  upload: "Upload",
  layers: "Layers",
  saved: "Saved",
};

function p(text: string): string {
  return `<p>${text}</p>`;
}

function defaultToolContent(
  guide: string,
  tourTitle: string,
  tourBody: string,
): LabelEditorHelpToolContent {
  return {
    guideHtml: guide.startsWith("<") ? guide : p(guide),
    tourTitle,
    tourHtml: tourBody.startsWith("<") ? tourBody : p(tourBody),
  };
}

export function labelEditorHelpDefaults(): LabelEditorHelpConfig {
  return {
    version: LABEL_EDITOR_HELP_VERSION,
    tourEnabled: true,
    tools: {
      template: defaultToolContent(
        "<p><strong>Start here.</strong> Pick a premade template sized for your labels, or choose a blank canvas and build from scratch. You can switch templates anytime—your design may reset if sizes differ.</p>",
        "Choose a template",
        "<p>Select a <strong>premade layout</strong> or a <strong>blank canvas</strong> from the list. Tap a template card to begin designing.</p>",
      ),
      data: defaultToolContent(
        "<p><strong>Data</strong> lets you import a spreadsheet (CSV) and link columns to text or table cells. Change rows with the arrows on the canvas to preview each label.</p><p>Great for batches of names, prices, or care instructions.</p>",
        "Connect your data",
        "<p>Open <strong>Data</strong> to upload a CSV or paste a table. Map columns to text boxes so each row prints a different label.</p>",
      ),
      draw: defaultToolContent(
        "<p>Use <strong>Draw</strong> for freehand lines on the label. Choose brush color and width, or switch to the eraser. Drawings stay behind text and images—you can reorder layers later.</p>",
        "Draw on the label",
        "<p>With Draw selected, drag on the canvas to sketch. Use <strong>Undo</strong> in the panel if you need to step back.</p>",
      ),
      text: defaultToolContent(
        "<p>Add <strong>Text</strong> boxes for titles, care info, or branding. Double-tap text on the canvas to edit. Use the panel to change font, size, color, and alignment.</p>",
        "Add text",
        "<p>Tap <strong>Text</strong>, then tap the canvas to place a box. Style it in the panel or double-tap the box to type.</p>",
      ),
      stickers: defaultToolContent(
        "<p><strong>Stickers</strong> adds shapes or shop graphics. Drag stickers on the canvas; resize with the handles when selected.</p>",
        "Stickers & shapes",
        "<p>Pick a shape or shop sticker, then drag it into place on your label.</p>",
      ),
      upload: defaultToolContent(
        "<p><strong>Upload</strong> adds your own images (logos, photos). Images are saved to your library when signed in. Adjust opacity in the panel after placing.</p>",
        "Upload images",
        "<p>Choose a file or pick from your uploads, then place the image on the canvas.</p>",
      ),
      layers: defaultToolContent(
        "<p><strong>Layers</strong> controls what appears in front. Reorder with arrows or drag, rename layers, and lock items so they cannot move.</p>",
        "Layer order",
        "<p>Open <strong>Layers</strong> to move items forward or backward. Locked layers stay put while you edit other elements.</p>",
      ),
      saved: defaultToolContent(
        "<p><strong>Saved</strong> stores designs to your account. Name your design, organize folders, and reopen later. Save before adding to your bag.</p>",
        "Save your work",
        "<p>Use <strong>Saved</strong> to name and store this label. You can load it again from this panel anytime.</p>",
      ),
    },
  };
}

function isPaletteHelpTool(id: string): id is LabelPaletteHelpTool {
  return (LABEL_PALETTE_TOOL_ORDER as readonly string[]).includes(id);
}

export function parseLabelEditorHelpConfig(raw: unknown): LabelEditorHelpConfig {
  const defaults = labelEditorHelpDefaults();
  if (!raw || typeof raw !== "object") return defaults;
  const o = raw as Record<string, unknown>;
  const tourEnabled = o.tourEnabled !== false;
  const tools = { ...defaults.tools };
  if (o.tools && typeof o.tools === "object") {
    for (const id of LABEL_PALETTE_TOOL_ORDER) {
      const entry = (o.tools as Record<string, unknown>)[id];
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      tools[id] = {
        guideHtml:
          typeof e.guideHtml === "string" && e.guideHtml.trim()
            ? e.guideHtml
            : defaults.tools[id].guideHtml,
        tourTitle:
          typeof e.tourTitle === "string" && e.tourTitle.trim()
            ? e.tourTitle.trim()
            : defaults.tools[id].tourTitle,
        tourHtml:
          typeof e.tourHtml === "string" && e.tourHtml.trim()
            ? e.tourHtml
            : defaults.tools[id].tourHtml,
      };
    }
  }
  return {
    version: LABEL_EDITOR_HELP_VERSION,
    tourEnabled,
    tools,
  };
}

export function getHelpForTool(
  config: LabelEditorHelpConfig,
  tool: LabelPaletteTool,
): LabelEditorHelpToolContent | null {
  if (!isPaletteHelpTool(tool)) return null;
  return config.tools[tool] ?? null;
}
