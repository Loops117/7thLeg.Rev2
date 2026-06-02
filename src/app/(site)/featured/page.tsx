import { PageKey } from "@/generated/prisma/enums";
import { HomePaneStack } from "@/components/panes/home-pane-stack";
import { loadPanesForPage } from "@/lib/panes-for-page";
import { settingsPathForPageKey } from "@/lib/pane-pages";

export default async function FeaturedPage() {
  const panes = await loadPanesForPage(PageKey.FEATURED);

  return (
    <HomePaneStack
      panes={panes}
      emptyTitle="Featured"
      emptySettingsPath={settingsPathForPageKey(PageKey.FEATURED)}
    />
  );
}
