"use client";

import { LABEL_TOOL_LABELS } from "@/lib/label-editor-help";
import type { LabelEditorHelpConfig } from "@/lib/label-editor-help";
import type { LabelPaletteTool } from "@/lib/label-editor/document";
import { getHelpForTool } from "@/lib/label-editor-help";

export function LabelEditorHelpPanel({
  activeTool,
  helpConfig,
  onClose,
}: {
  activeTool: LabelPaletteTool;
  helpConfig: LabelEditorHelpConfig;
  /** Desktop: close the help tab and return to tool panels. */
  onClose?: () => void;
}) {
  const entry = getHelpForTool(helpConfig, activeTool);
  const title = LABEL_TOOL_LABELS[activeTool as keyof typeof LABEL_TOOL_LABELS] ?? activeTool;

  if (!entry) {
    return (
      <div className="mt-2 flex flex-col gap-3">
        <p className="text-xs text-ink/65 dark:text-zinc-400">No guide is available for this tool.</p>
        {onClose ? (
          <button
            type="button"
            className="hidden w-full rounded-lg border-2 border-palm/25 py-2.5 text-xs font-bold text-palm hover:bg-surf md:block dark:border-zinc-600 dark:text-emerald-300 dark:hover:bg-zinc-800"
            onClick={onClose}
          >
            Close
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-2 flex min-h-0 flex-1 flex-col space-y-2">
      <h2 className="text-sm font-black text-palm dark:text-emerald-300">{title}</h2>
      <div
        className="store-rich min-h-0 flex-1 text-xs leading-relaxed text-ink/85 dark:text-zinc-300 [&_img]:my-2 [&_img]:max-h-40 [&_img]:rounded [&_img]:border [&_img]:border-palm/15"
        dangerouslySetInnerHTML={{ __html: entry.guideHtml }}
      />
      {onClose ? (
        <button
          type="button"
          className="mt-4 hidden w-full shrink-0 rounded-lg border-2 border-palm/25 py-2.5 text-xs font-bold text-palm hover:bg-surf md:block dark:border-zinc-600 dark:text-emerald-300 dark:hover:bg-zinc-800"
          onClick={onClose}
        >
          Close
        </button>
      ) : null}
    </div>
  );
}
