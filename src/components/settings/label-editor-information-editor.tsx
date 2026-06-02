"use client";

import { btnSecondaryMd } from "@/lib/btn-theme-classes";

import { useState, useTransition } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  updateLabelEditorHelpConfig,
  uploadLabelHelpImage,
} from "@/app/actions/label-editor-help-admin";
import {
  LABEL_PALETTE_TOOL_ORDER,
  LABEL_TOOL_LABELS,
  type LabelEditorHelpConfig,
  type LabelPaletteHelpTool,
} from "@/lib/label-editor-help";

export function LabelEditorInformationEditor({ initial }: { initial: LabelEditorHelpConfig }) {
  const [config, setConfig] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const r = await updateLabelEditorHelpConfig(config);
      setMsg(r.ok ? "Saved." : r.error);
    });
  };

  const patchTool = (
    tool: LabelPaletteHelpTool,
    patch: Partial<LabelEditorHelpConfig["tools"][LabelPaletteHelpTool]>,
  ) => {
    setConfig((c) => ({
      ...c,
      tools: {
        ...c.tools,
        [tool]: { ...c.tools[tool], ...patch },
      },
    }));
  };

  return (
    <div className="space-y-8">
      <section className="rounded border-2 border-palm/20 bg-white p-4 dark:border-zinc-600 dark:bg-zinc-900/55">
        <label className="flex items-center gap-2 text-sm font-bold text-ink dark:text-zinc-200">
          <input
            type="checkbox"
            checked={config.tourEnabled}
            onChange={(e) => setConfig((c) => ({ ...c, tourEnabled: e.target.checked }))}
          />
          Show first-visit coach tour on the label editor
        </label>
        <p className="mt-2 text-xs text-ink/65">
          Walks new users through Template, Data, Draw, Text, and Saved. They can dismiss with &quot;Don&apos;t show
          again&quot;.
        </p>
      </section>

      {LABEL_PALETTE_TOOL_ORDER.map((tool) => (
        <section
          key={tool}
          className="space-y-4 rounded border-2 border-palm/20 bg-white p-4 dark:border-zinc-600 dark:bg-zinc-900/55"
        >
          <h2 className="text-lg font-black text-palm dark:text-emerald-300">{LABEL_TOOL_LABELS[tool]}</h2>

          <RichTextEditor
            label="Info panel (shown when customers tap Info in the tool menu)"
            value={config.tools[tool].guideHtml}
            onChange={(guideHtml) => patchTool(tool, { guideHtml })}
            enableImages
            onUploadImage={uploadLabelHelpImage}
            minHeightClassName="min-h-[8rem]"
            placeholder="Guide copy for this tool…"
          />

          <label className="block text-sm font-bold text-ink dark:text-zinc-200">
            Tour popup title
            <input
              type="text"
              className="mt-1 w-full rounded border-2 border-palm/25 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              value={config.tools[tool].tourTitle}
              onChange={(e) => patchTool(tool, { tourTitle: e.target.value })}
            />
          </label>

          <RichTextEditor
            label="Tour popup body"
            value={config.tools[tool].tourHtml}
            onChange={(tourHtml) => patchTool(tool, { tourHtml })}
            enableImages
            onUploadImage={uploadLabelHelpImage}
            minHeightClassName="min-h-[6rem]"
            placeholder="Short tour message…"
          />
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className={btnSecondaryMd}
        >
          {pending ? "Saving…" : "Save all"}
        </button>
        {msg ? <p className="text-sm font-bold text-ink/80">{msg}</p> : null}
      </div>
    </div>
  );
}
