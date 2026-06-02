"use client";

import { LabelEditorApp } from "@/components/labels/label-editor-app";
import type { LabelBuilderPublicConfig } from "@/lib/label-builder-public";
import type { LabelEditorDocument } from "@/lib/label-editor/document";
import type { LabelTemplatePickerOption } from "@/lib/label-editor/template-meta";
import type { LabelEditorHelpConfig } from "@/lib/label-editor-help";
import { LABEL_EDITOR_HELP_VERSION } from "@/lib/label-editor-help";

const MINIMAL_HELP: LabelEditorHelpConfig = {
  version: LABEL_EDITOR_HELP_VERSION,
  tourEnabled: false,
  tools: {} as LabelEditorHelpConfig["tools"],
};

export function LabelAdminTemplateLayoutEditor({
  template,
  initialDoc,
  publicConfig,
}: {
  template: LabelTemplatePickerOption;
  initialDoc?: LabelEditorDocument;
  publicConfig: LabelBuilderPublicConfig;
}) {
  return (
    <LabelEditorApp
      templates={[template]}
      initialTemplateId={template.id}
      publicConfig={publicConfig}
      helpConfig={MINIMAL_HELP}
      initialDoc={initialDoc}
      isAdminLayoutMode
      adminLayoutTemplateName={template.name}
      stickerAssets={[]}
    />
  );
}
