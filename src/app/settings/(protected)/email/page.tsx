import { getEmailAdminPanelData } from "@/app/actions/email-admin";
import { EmailSettingsEditor } from "@/components/settings/email-settings-editor";

export default async function SettingsEmailPage() {
  const initial = await getEmailAdminPanelData();

  return (
    <div>
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm dark:text-emerald-300">Email</h1>
      <p className="mt-4 max-w-xl text-sm text-ink/80 dark:text-zinc-400">
        Connect your GoDaddy Microsoft Essentials mailbox via SMTP, send a test message, and customize order
        confirmation and shipped emails. All customer mail uses the same connection.
      </p>
      <div className="mt-10">
        <EmailSettingsEditor initial={initial} />
      </div>
    </div>
  );
}
