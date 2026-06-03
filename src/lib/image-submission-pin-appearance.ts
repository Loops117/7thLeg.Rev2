import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  IMAGE_SUBMISSION_PIN_APPEARANCE_DEFAULTS,
  normalizeImageSubmissionPinAppearance,
  type ImageSubmissionPinAppearance,
} from "@/lib/image-submission-pin-appearance-shared";

export type { ImageSubmissionPinAppearance } from "@/lib/image-submission-pin-appearance-shared";
export {
  IMAGE_SUBMISSION_PIN_APPEARANCE_DEFAULTS,
  normalizeImageSubmissionPinAppearance,
  pinMarkerUsesCustomImage,
} from "@/lib/image-submission-pin-appearance-shared";

const pinSelect = {
  imageSubmissionPinSizePx: true,
  imageSubmissionPinFillColor: true,
  imageSubmissionPinBorderWidthPx: true,
  imageSubmissionPinBorderColor: true,
  imageSubmissionPinCustomImageUrl: true,
} as const;

export const getImageSubmissionPinAppearance = cache(async function getImageSubmissionPinAppearance(): Promise<ImageSubmissionPinAppearance> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: pinSelect,
    });
    return normalizeImageSubmissionPinAppearance(row);
  } catch {
    return { ...IMAGE_SUBMISSION_PIN_APPEARANCE_DEFAULTS };
  }
});
