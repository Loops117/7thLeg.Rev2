import { redirect } from "next/navigation";

/** Legacy admin URL — Image Submission moved to /settings/image-submission */
export default function CustomerArtSettingsRedirect() {
  redirect("/settings/image-submission");
}
