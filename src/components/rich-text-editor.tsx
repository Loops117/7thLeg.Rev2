"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import "./rich-text-editor.css";
import { btnChip, btnChipActive, btnSecondarySm } from "@/lib/btn-theme-classes";
import { normalizeProductDescriptionHtml } from "@/lib/product-description-html";

/** If content looks like HTML, pass through; otherwise treat as plain (newlines → paragraphs). */
function toEditorHtml(raw: string): string {
  const s = raw ?? "";
  if (!s.trim()) {
    return "<p></p>";
  }
  if (/^\s*</.test(s)) {
    return s;
  }
  const html = normalizeProductDescriptionHtml(s);
  return html || "<p></p>";
}

function fromEditorHtml(html: string): string {
  const t = html.replace(/\s/g, "");
  if (t === "<p></p>" || t === "<p><br></p>" || t === "<p><br/></p>") {
    return "";
  }
  return html;
}

function Toolbar({
  editor,
  enableImages,
  onUploadImage,
}: {
  editor: Editor | null;
  enableImages?: boolean;
  onUploadImage?: (formData: FormData) => Promise<{ ok: true; url: string } | { ok: false; error: string }>;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  if (!editor) {
    return (
      <div className="rt-editor__toolbar flex flex-wrap gap-1 border-b border-palm/15 bg-surf/40 p-2 text-xs text-ink/50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-500">
        Loading editor…
      </div>
    );
  }

  const btn = (active: boolean) => `${active ? btnChipActive : btnChip} shrink-0 !rounded px-2 py-1 text-xs`;

  return (
    <div className="rt-editor__toolbar flex flex-wrap gap-1 border-b border-palm/15 bg-surf/40 p-2 dark:border-zinc-600 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn(editor.isActive("bold"))}
        title="Bold"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btn(editor.isActive("italic"))}
        title="Italic"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btn(editor.isActive("underline"))}
        title="Underline"
      >
        U
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btn(editor.isActive("strike"))}
        title="Strikethrough"
      >
        S
      </button>
      <span className="self-center text-ink/30 dark:text-zinc-600">|</span>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        className={btn(editor.isActive({ textAlign: "left" }))}
        title="Align left"
      >
        Left
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        className={btn(editor.isActive({ textAlign: "center" }))}
        title="Center"
      >
        Center
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        className={btn(editor.isActive({ textAlign: "right" }))}
        title="Align right"
      >
        Right
      </button>
      <span className="self-center text-ink/30 dark:text-zinc-600">|</span>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btn(editor.isActive("bulletList"))}
        title="Bullet list"
      >
        • List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btn(editor.isActive("orderedList"))}
        title="Numbered list"
      >
        1. List
      </button>
      <span className="self-center text-ink/30 dark:text-zinc-600">|</span>
      <button
        type="button"
        onClick={() => {
          const prev = window.prompt("Link URL (leave empty to remove)", "https://");
          if (prev === null) return;
          if (prev.trim() === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: prev.trim() }).run();
        }}
        className={btn(editor.isActive("link"))}
        title="Link"
      >
        Link
      </button>
      {enableImages ? (
        <>
          <span className="self-center text-ink/30 dark:text-zinc-600">|</span>
          <button
            type="button"
            className={btnSecondarySm}
            title="Insert image"
            onClick={() => imageInputRef.current?.click()}
          >
            Image
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/webp,image/jpeg,image/gif,image/avif"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file || !editor) return;
              if (onUploadImage) {
                const fd = new FormData();
                fd.set("file", file);
                const r = await onUploadImage(fd);
                if (!r.ok) {
                  window.alert(r.error);
                  return;
                }
                editor.chain().focus().setImage({ src: r.url, alt: "" }).run();
                return;
              }
              const url = window.prompt("Image URL");
              if (url?.trim()) {
                editor.chain().focus().setImage({ src: url.trim(), alt: "" }).run();
              }
            }}
          />
        </>
      ) : null}
      <span className="self-center text-ink/30 dark:text-zinc-600">|</span>
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        className={btnSecondarySm}
        title="Undo"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        className={btnSecondarySm}
        title="Redo"
      >
        Redo
      </button>
    </div>
  );
}

export type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  placeholder?: string;
  /** e.g. min-h-[12rem] for the editable area (sets CSS var --rt-editor-min-h) */
  minHeightClassName?: string;
  enableImages?: boolean;
  onUploadImage?: (formData: FormData) => Promise<{ ok: true; url: string } | { ok: false; error: string }>;
};

export function RichTextEditor({
  value,
  onChange,
  label,
  placeholder,
  minHeightClassName,
  enableImages,
  onUploadImage,
}: RichTextEditorProps) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      extensions: [
        StarterKit.configure({
          heading: false,
          link: {
            openOnClick: false,
            autolink: true,
            HTMLAttributes: {
              class: "text-lagoon-dark underline",
            },
          },
        }),
        TextAlign.configure({ types: ["paragraph"] }),
        Placeholder.configure({
          placeholder: placeholder || "Type here. Enter for a new paragraph.",
        }),
        ...(enableImages
          ? [
              Image.configure({
                HTMLAttributes: { class: "max-w-full h-auto rounded" },
              }),
            ]
          : []),
      ],
      content: toEditorHtml(value),
      editorProps: {
        attributes: {
          class: "focus:outline-none",
        },
      },
      onUpdate: ({ editor: ed }) => {
        onChange(fromEditorHtml(ed.getHTML()));
      },
    },
    [placeholder],
  );

  useEffect(() => {
    if (!editor) return;
    const incoming = toEditorHtml(value);
    const cur = editor.getHTML();
    if (incoming === cur) return;
    editor.commands.setContent(incoming, { emitUpdate: false });
  }, [value, editor]);

  const minH = minHeightClassName ?? "min-h-[10rem]";

  const inner = (
    <div
      className="rt-editor__shell overflow-hidden rounded border-2 border-palm-mid bg-white dark:border-zinc-600 dark:bg-zinc-950"
      style={
        {
          "--rt-editor-min-h": "10rem",
        } as React.CSSProperties
      }
    >
      <Toolbar editor={editor} enableImages={enableImages} onUploadImage={onUploadImage} />
      <div className={`${minH} dark:bg-zinc-950`}>
        <EditorContent editor={editor} className="rt-editor__content h-full" />
      </div>
    </div>
  );

  if (label) {
    return (
      <label className="block text-sm font-bold text-ink dark:text-zinc-200">
        {label}
        <div className="mt-1">{inner}</div>
      </label>
    );
  }

  return inner;
}
