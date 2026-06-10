"use client";

import {
  TheatricalPaneEditorPanel,
  type TheatricalPaneEditorPanelProps,
} from "@/components/settings/theatrical-pane-editor-panel";

export type TheatricalPaneEditorProps = TheatricalPaneEditorPanelProps;

/** Desktop / default theatrical stage editor (unchanged storefront behavior). */
export function TheatricalPaneEditor(props: TheatricalPaneEditorPanelProps) {
  return <TheatricalPaneEditorPanel {...props} />;
}
