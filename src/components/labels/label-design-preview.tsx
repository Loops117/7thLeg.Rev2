"use client";

import { useEffect, useRef } from "react";
import {
  LabelImageBox,
  LabelStickerBox,
  LabelTableBox,
  LabelTextBox,
} from "@/components/labels/label-canvas-elements";
import { LabelBorderSvg } from "@/components/labels/label-border-svg";
import { LabelPreviewOverlay } from "@/components/labels/label-preview-overlay";
import type { LabelBuilderPublicConfig } from "@/lib/label-builder-public";
import type { LabelEditorDocument } from "@/lib/label-editor/document";
import { renderStrokesOnCanvas } from "@/lib/label-editor/draw-canvas";
import type { LabelTemplatePickerOption } from "@/lib/label-editor/template-meta";
import { labelPreviewProtectionClassNames } from "@/lib/label-preview-watermark";
import { clampBorderConfigToCanvas } from "@/lib/label-template-border";
import { editableRegionPx } from "@/lib/label-template-canvas";

export function LabelDesignPreview({
  template,
  doc,
  publicConfig,
  maxWidthPx = 280,
  showWatermark = true,
  showEditableRegionGuide = false,
}: {
  template: LabelTemplatePickerOption;
  doc: LabelEditorDocument;
  publicConfig: LabelBuilderPublicConfig;
  maxWidthPx?: number;
  showWatermark?: boolean;
  /** Red dashed inset (template picker). */
  showEditableRegionGuide?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cw = template.canvasWidthPx;
  const ch = template.canvasHeightPx;
  const { inset, widthPx: editW, heightPx: editH } = editableRegionPx(cw, ch, template.marginPx);
  const scale = Math.min(maxWidthPx / cw, maxWidthPx / ch, 1);
  const borderConfig = clampBorderConfigToCanvas(template.borderConfig, cw, ch);
  const protectInteraction = publicConfig.preview.protectPreviewInteraction;
  const protectionClass = labelPreviewProtectionClassNames(protectInteraction);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cw, ch);
    renderStrokesOnCanvas(ctx, doc.strokes, null, {
      x: inset,
      y: inset,
      width: editW,
      height: editH,
    });
  }, [cw, ch, inset, editW, editH, doc.strokes]);

  return (
    <div className="flex justify-center">
      <div
        style={{ width: cw * scale, height: ch * scale }}
        className={protectionClass}
        onContextMenu={protectInteraction ? (e) => e.preventDefault() : undefined}
      >
        <div
          className="relative origin-top-left bg-white shadow-md"
          style={{ width: cw, height: ch, transform: `scale(${scale})` }}
        >
          {template.baseLayoutImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={template.baseLayoutImageUrl}
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              style={{
                opacity: template.baseLayoutOpacityPercent / 100,
                transform: `translate(${template.baseLayoutOffsetXPx}px, ${template.baseLayoutOffsetYPx}px) scale(${template.baseLayoutScalePercent / 100}) rotate(${template.baseLayoutRotationDeg}deg)`,
              }}
            />
          ) : null}
          <LabelBorderSvg canvasWidthPx={cw} canvasHeightPx={ch} config={borderConfig} />
          <canvas ref={canvasRef} width={cw} height={ch} className="pointer-events-none absolute inset-0" />
          {doc.elements.map((el) => {
            if (el.kind === "text") {
              return (
                <LabelTextBox
                  key={el.id}
                  el={el}
                  doc={doc}
                  selected={false}
                  showEditorChrome={false}
                  onSelect={() => {}}
                  onPointerDown={() => {}}
                />
              );
            }
            if (el.kind === "sticker") {
              return (
                <LabelStickerBox key={el.id} el={el} selected={false} onSelect={() => {}} onPointerDown={() => {}} />
              );
            }
            if (el.kind === "table") {
              return (
                <LabelTableBox
                  key={el.id}
                  el={el}
                  doc={doc}
                  selected={false}
                  showEditorChrome={false}
                  onSelect={() => {}}
                  onPointerDown={() => {}}
                />
              );
            }
            return (
              <LabelImageBox key={el.id} el={el} selected={false} onSelect={() => {}} onPointerDown={() => {}} />
            );
          })}
          {showEditableRegionGuide ? (
            <div
              className="pointer-events-none absolute z-[12] border border-dashed border-red-400/70"
              style={{ left: inset, top: inset, right: inset, bottom: inset }}
              aria-hidden
            />
          ) : null}
          {showWatermark ? <LabelPreviewOverlay config={publicConfig} /> : null}
          {protectInteraction ? (
            <div className="absolute inset-0 z-[25]" aria-hidden onContextMenu={(e) => e.preventDefault()} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
