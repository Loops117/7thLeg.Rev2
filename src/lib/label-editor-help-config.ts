import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  labelEditorHelpDefaults,
  parseLabelEditorHelpConfig,
  type LabelEditorHelpConfig,
} from "@/lib/label-editor-help";

export const getLabelEditorHelpConfig = cache(async function getLabelEditorHelpConfig(): Promise<LabelEditorHelpConfig> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { labelEditorHelpJson: true },
    });
    if (!row?.labelEditorHelpJson?.trim()) {
      return labelEditorHelpDefaults();
    }
    return parseLabelEditorHelpConfig(JSON.parse(row.labelEditorHelpJson));
  } catch {
    return labelEditorHelpDefaults();
  }
});

export async function getLabelEditorHelpConfigForAdmin(): Promise<LabelEditorHelpConfig> {
  return getLabelEditorHelpConfig();
}
