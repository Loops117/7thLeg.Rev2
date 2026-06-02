import { Suspense } from "react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { LabelEditorApp } from "@/components/labels/label-editor-app";
import { getLabelBuilderPublicConfig } from "@/lib/label-builder-public";
import { getLabelEditorHelpConfig } from "@/lib/label-editor-help-config";
import { listCustomerLabelUploads } from "@/app/actions/label-designs";
import { getCustomerLabelBagItemsForCustomer } from "@/lib/customer-label-bag-server";
import type { LabelBagItem } from "@/lib/label-editor/label-bag";
import { listActiveLabelStickerAssets } from "@/app/actions/label-stickers-admin";
import { parseLabelEditorDocument, type CustomerLabelUploadItem } from "@/lib/label-editor/document";
import { labelTemplateRowToPickerOption } from "@/lib/label-editor/template-meta";
import { listTemplateFinishOptionsMap } from "@/lib/label-finish-server";
import { getSiteConfig } from "@/lib/site-config";
import { prisma } from "@/lib/prisma";

type Props = { searchParams: Promise<{ template?: string; load?: string }> };

export default async function LabelsPage({ searchParams }: Props) {
  const { template: templateParam, load: loadDesignId } = await searchParams;

  const [config, publicConfig, helpConfig, templateRows, stickerAssetRows] = await Promise.all([
    getSiteConfig(),
    getLabelBuilderPublicConfig(),
    getLabelEditorHelpConfig(),
    prisma.labelTemplate.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    listActiveLabelStickerAssets(),
  ]);

  if (!config.labelBuilderEnabled) {
    notFound();
  }

  const templates = templateRows.map(labelTemplateRowToPickerOption);
  const templateIds = templateRows.map((t) => t.id);
  const [finishOptionsByTemplateId] = await Promise.all([
    listTemplateFinishOptionsMap(templateIds),
  ]);
  const starterDocumentJsonByTemplateId = Object.fromEntries(
    templateRows.map((t) => [t.id, t.starterDocumentJson]),
  ) as Record<string, unknown | null>;

  const defaultTemplateId = templates[0]?.id ?? "";
  const initialTemplateId =
    templateParam && templates.some((t) => t.id === templateParam) ? templateParam : defaultTemplateId;

  let initialDoc = undefined;
  let savedDesignId: string | null = null;
  let designName: string | undefined;
  let initialDesignFolderId: string | null = null;
  let initialUploads: CustomerLabelUploadItem[] = [];
  let initialBagItems: LabelBagItem[] | undefined;
  let isLoggedInCustomer = false;

  const session = await auth();
  if (session?.user?.role === "customer" && session.user.id) {
    isLoggedInCustomer = true;
    initialUploads = await listCustomerLabelUploads();
    const bag = await getCustomerLabelBagItemsForCustomer(session.user.id);
    if (bag.items.length > 0) initialBagItems = bag.items;
  }

  if (loadDesignId && initialTemplateId) {
    if (session?.user?.role === "customer" && session.user.id) {
      const row = await prisma.customerLabelDesign.findFirst({
        where: { id: loadDesignId, customerId: session.user.id },
      });
      if (row) {
        const doc = parseLabelEditorDocument(row.documentJson, row.templateId);
        if (doc.templateId === initialTemplateId || !templateParam) {
          initialDoc = doc;
          savedDesignId = row.id;
          designName = row.name;
          initialDesignFolderId = row.folderId;
        }
      }
    }
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[20rem] items-center justify-center p-8 text-sm font-bold text-palm">
          Loading label editor…
        </div>
      }
    >
      <LabelEditorApp
        templates={templates}
        initialTemplateId={initialTemplateId}
        publicConfig={publicConfig}
        helpConfig={helpConfig}
        initialDoc={initialDoc}
        savedDesignId={savedDesignId}
        designName={designName}
        initialDesignFolderId={initialDesignFolderId}
        initialUploads={initialUploads}
        isLoggedInCustomer={isLoggedInCustomer}
        initialBagItems={initialBagItems}
        starterDocumentJsonByTemplateId={starterDocumentJsonByTemplateId}
        finishOptionsByTemplateId={finishOptionsByTemplateId}
        stickerAssets={stickerAssetRows.map((s) => ({
          id: s.id,
          name: s.name,
          imageUrl: s.imageUrl,
        }))}
      />
    </Suspense>
  );
}
