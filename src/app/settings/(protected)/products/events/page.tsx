import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ edit?: string }> };

/** @deprecated Use `/settings/events`. */
export default async function LegacySettingsEventsRedirect({ searchParams }: Props) {
  const { edit } = await searchParams;
  if (edit?.trim()) {
    redirect(`/settings/events?edit=${encodeURIComponent(edit.trim())}`);
  }
  redirect("/settings/events");
}
