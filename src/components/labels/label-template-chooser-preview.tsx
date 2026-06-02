"use client";

import { useMemo } from "react";
import { LabelDesignPreview } from "@/components/labels/label-design-preview";
import type { LabelBuilderPublicConfig } from "@/lib/label-builder-public";
import type { LabelTemplatePickerOption } from "@/lib/label-editor/template-meta";
import { customerStarterDocumentFromTemplate } from "@/lib/label-template-starter";

const MAX_SIDE = 200;

export function LabelTemplateChooserPreview({
  template,
  starterDocumentRaw,
  publicConfig,
}: {
  template: LabelTemplatePickerOption;
  starterDocumentRaw?: unknown | null;
  publicConfig: LabelBuilderPublicConfig;
}) {
  const doc = useMemo(
    () => customerStarterDocumentFromTemplate(starterDocumentRaw ?? null, template.id),
    [starterDocumentRaw, template.id],
  );

  return (
    <div className="rounded border border-palm/20 bg-zinc-100/80 p-3 dark:border-zinc-600 dark:bg-zinc-800/50">
      <LabelDesignPreview
        template={template}
        doc={doc}
        publicConfig={publicConfig}
        maxWidthPx={MAX_SIDE}
        showWatermark={false}
        showEditableRegionGuide
      />
    </div>
  );
}
