"use client";

import {
  TheatricalPaneEditorPanel,
  type TheatricalPaneEditorPanelProps,
} from "@/components/settings/theatrical-pane-editor-panel";
import { THEATRICAL_STAGE_REF_WIDTH_PX } from "@/lib/theatrical-pane";

const MOBILE_PREVIEW_WIDTH_PX = 390;

const MOBILE_HINT = `Design the layout shown on phones and narrow screens (768px wide or less). The preview below is capped at ${MOBILE_PREVIEW_WIDTH_PX}px wide — the same ${THEATRICAL_STAGE_REF_WIDTH_PX}px reference canvas scales to fit, so text size and wrapping match the live mobile pane.`;

export type TheatricalMobilePaneEditorProps = Omit<
  TheatricalPaneEditorPanelProps,
  "sectionTitle" | "hint" | "previewMaxWidthPx"
>;

export function TheatricalMobilePaneEditor(props: TheatricalMobilePaneEditorProps) {
  return (
    <TheatricalPaneEditorPanel
      {...props}
      sectionTitle="Mobile layout"
      hint={MOBILE_HINT}
      previewMaxWidthPx={MOBILE_PREVIEW_WIDTH_PX}
    />
  );
}
