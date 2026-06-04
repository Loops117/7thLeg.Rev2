"use client";

import { useState } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";

export type RichTextOrHtmlEditorProps = {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  placeholder?: string;
  minHeightClassName?: string;
  /** Hint shown under the raw HTML toggle. */
  hint?: string;
};

export function RichTextOrHtmlEditor({
  value,
  onChange,
  label,
  placeholder,
  minHeightClassName = "min-h-[10rem]",
  hint,
}: RichTextOrHtmlEditorProps) {
  const [rawHtml, setRawHtml] = useState(false);

  const editor = rawHtml ? (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Paste or type HTML…"}
      spellCheck={false}
      className={`w-full resize-y border-2 border-palm-mid bg-white px-3 py-2 font-mono text-xs leading-relaxed text-ink dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 ${minHeightClassName}`}
    />
  ) : (
    <RichTextEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      minHeightClassName={minHeightClassName}
    />
  );

  const toggle = (
    <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-medium text-ink/75 dark:text-zinc-400">
      <input
        type="checkbox"
        checked={rawHtml}
        onChange={(e) => setRawHtml(e.target.checked)}
        className="h-3.5 w-3.5 accent-palm"
      />
      Edit raw HTML
    </label>
  );

  if (label) {
    return (
      <div>
        <span className="block text-sm font-bold text-ink dark:text-zinc-200">{label}</span>
        <div className="mt-1">{editor}</div>
        {toggle}
        {hint ? <p className="mt-1 text-xs text-ink/55 dark:text-zinc-500">{hint}</p> : null}
      </div>
    );
  }

  return (
    <div>
      {editor}
      {toggle}
      {hint ? <p className="mt-1 text-xs text-ink/55 dark:text-zinc-500">{hint}</p> : null}
    </div>
  );
}
