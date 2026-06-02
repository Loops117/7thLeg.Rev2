import { LabelEditorInformationEditor } from "@/components/settings/label-editor-information-editor";
import { loadLabelEditorHelpForAdmin } from "@/app/actions/label-editor-help-admin";

export default async function SettingsLabelsInformationPage() {
  const initial = await loadLabelEditorHelpForAdmin();

  return (
    <div className="max-w-4xl">
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Label editor information</h1>
      <p className="mt-4 max-w-3xl text-ink/80">
        Edit the <strong>Info</strong> panel copy and first-visit tour popups for each tool in the label editor. Use the
        toolbar for bold, lists, links, and images (Ctrl+B works in the editor).
      </p>
      <div className="mt-8">
        <LabelEditorInformationEditor initial={initial} />
      </div>
    </div>
  );
}
