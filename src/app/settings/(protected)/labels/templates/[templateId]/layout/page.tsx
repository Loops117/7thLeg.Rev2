import { notFound } from "next/navigation";
import { LabelAdminTemplateLayoutEditor } from "@/components/settings/label-admin-template-layout-editor";
import { getLabelBuilderPublicConfig } from "@/lib/label-builder-public";
import { parseLabelTemplateStarterDocument } from "@/lib/label-template-starter";
import { labelTemplateRowToPickerOption } from "@/lib/label-editor/template-meta";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ templateId: string }> };

export default async function LabelTemplateLayoutAdminPage({ params }: Props) {
  const { templateId } = await params;
  const id = templateId.trim();

  const [row, publicConfig] = await Promise.all([
    prisma.labelTemplate.findUnique({ where: { id } }),
    getLabelBuilderPublicConfig(),
  ]);

  if (!row) notFound();

  const template = labelTemplateRowToPickerOption(row);
  const initialDoc = parseLabelTemplateStarterDocument(row.starterDocumentJson, row.id) ?? undefined;

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col">
      <LabelAdminTemplateLayoutEditor
        template={template}
        initialDoc={initialDoc}
        publicConfig={publicConfig}
      />
    </div>
  );
}
