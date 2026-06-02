import { PageKey } from "@/generated/prisma/enums";
import { HomePaneStack } from "@/components/panes/home-pane-stack";
import { loadPanesForPage } from "@/lib/panes-for-page";
import { settingsPathForPageKey } from "@/lib/pane-pages";

export default async function AboutPage() {
  const panes = await loadPanesForPage(PageKey.ABOUT);

  return (
    <HomePaneStack
      panes={panes}
      emptyTitle="About us"
      emptySettingsPath={settingsPathForPageKey(PageKey.ABOUT)}
    />
  );
}
