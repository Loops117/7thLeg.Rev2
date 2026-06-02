import { LabelFinishOptionsEditor } from "@/components/settings/label-finish-options-editor";
import { listLabelFinishOptionsAdmin } from "@/app/actions/label-finish-admin";

export default async function LabelOptionsSettingsPage() {
  const options = await listLabelFinishOptionsAdmin();

  return (
    <div className="max-w-4xl">
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm dark:text-emerald-300">
        Label options
      </h1>
      <p className="mt-4 text-sm text-ink/80 dark:text-zinc-400">
        Global label options (material, coating, etc.) with name and grouping. Enable each option per template on the
        Labels overview and set the price increase there.
      </p>
      <div className="mt-8">
        <LabelFinishOptionsEditor initial={options} />
      </div>
    </div>
  );
}
