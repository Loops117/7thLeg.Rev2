"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  sendAdminTestEmail,
  updateEmailSettings,
  type EmailAdminPanelData,
} from "@/app/actions/email-admin";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import { DEFAULT_SMTP_HOST, DEFAULT_SMTP_PORT, type EmailSettingsState } from "@/lib/email-settings-types";

export function EmailSettingsEditor({ initial }: { initial: EmailAdminPanelData }) {
  const router = useRouter();
  const [testTo, setTestTo] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [form, setForm] = useState<EmailSettingsState>(initial.settings);
  const [pendingTest, startTestTransition] = useTransition();
  const [pendingSave, startSaveTransition] = useTransition();

  const { status, envOverrides } = initial;

  function saveSettings() {
    setSaveMsg(null);
    setSaveErr(null);
    startSaveTransition(async () => {
      const res = await updateEmailSettings(form);
      if (!res.ok) {
        setSaveErr(res.error);
        return;
      }
      setSaveMsg("Saved. Send a test email to confirm delivery.");
      setForm((f) => ({ ...f, smtpPassword: "", smtpPasswordSet: true }));
      router.refresh();
    });
  }

  function sendTest(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    startTestTransition(async () => {
      try {
        const res = await sendAdminTestEmail(testTo);
        if (!res.ok) {
          setErr(res.error);
          return;
        }
        setMsg(
          res.messageId
            ? `Test email sent. Message id: ${res.messageId}`
            : "Test email sent. Check the inbox (and spam folder).",
        );
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "Could not send test email.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded border-2 border-palm/25 bg-white p-4 dark:border-zinc-600 dark:bg-zinc-900/30">
        <h2 className="text-lg font-black text-palm dark:text-emerald-300">Microsoft 365 SMTP</h2>
        <p className="mt-1 text-sm text-ink/70 dark:text-zinc-400">
          Use your GoDaddy <strong>Microsoft Essentials</strong> mailbox (same as Outlook on the web). Server defaults to{" "}
          <code className="rounded bg-black/5 px-1 text-xs">{DEFAULT_SMTP_HOST}</code> on port{" "}
          {DEFAULT_SMTP_PORT} with STARTTLS.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold text-ink dark:text-zinc-200">
            SMTP host
            <input
              type="text"
              value={form.smtpHost}
              onChange={(e) => setForm((f) => ({ ...f, smtpHost: e.target.value }))}
              placeholder={DEFAULT_SMTP_HOST}
              disabled={envOverrides.smtp}
              className="mt-1 w-full border-2 border-palm-mid px-3 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-950"
              maxLength={200}
            />
          </label>
          <label className="block text-sm font-bold text-ink dark:text-zinc-200">
            SMTP port
            <input
              type="number"
              min={1}
              max={65535}
              value={form.smtpPort}
              onChange={(e) => setForm((f) => ({ ...f, smtpPort: Number(e.target.value) || DEFAULT_SMTP_PORT }))}
              disabled={envOverrides.smtp}
              className="mt-1 w-full border-2 border-palm-mid px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
        </div>

        {envOverrides.smtp ? (
          <p className="mt-3 text-xs text-ink/65 dark:text-zinc-400">
            Using <code className="rounded bg-black/5 px-1">SMTP_HOST</code> /{" "}
            <code className="rounded bg-black/5 px-1">SMTP_USER</code> /{" "}
            <code className="rounded bg-black/5 px-1">SMTP_PASS</code> from the server environment — clear those env vars
            to use the saved settings below.
          </p>
        ) : null}

        <label className="mt-4 block text-sm font-bold text-ink dark:text-zinc-200">
          Mailbox email (SMTP user)
          <input
            type="email"
            value={form.smtpUser}
            onChange={(e) => setForm((f) => ({ ...f, smtpUser: e.target.value }))}
            placeholder="noreply@7thleg.com"
            disabled={envOverrides.smtp}
            className="mt-1 w-full max-w-lg border-2 border-palm-mid px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            maxLength={200}
          />
        </label>

        <label className="mt-4 block text-sm font-bold text-ink dark:text-zinc-200">
          Mailbox password
          <input
            type="password"
            autoComplete="new-password"
            value={form.smtpPassword}
            onChange={(e) => setForm((f) => ({ ...f, smtpPassword: e.target.value }))}
            placeholder={form.smtpPasswordSet ? "Saved — leave blank to keep" : "Mailbox password"}
            disabled={envOverrides.smtp}
            className="mt-1 w-full max-w-lg border-2 border-palm-mid px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            maxLength={200}
          />
        </label>
        <p className="mt-1 text-xs text-ink/55 dark:text-zinc-500">
          Use the same password you sign into Outlook with. If MFA is on, create an app password in Microsoft account
          security settings.
        </p>

        <label className="mt-4 block text-sm font-bold text-ink dark:text-zinc-200">
          From address (optional)
          <input
            type="text"
            value={form.emailFromAddress}
            onChange={(e) => setForm((f) => ({ ...f, emailFromAddress: e.target.value }))}
            placeholder='7th Leg <noreply@7thleg.com>'
            disabled={envOverrides.emailFrom}
            className="mt-1 w-full max-w-lg border-2 border-palm-mid px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            maxLength={200}
          />
        </label>
        {envOverrides.emailFrom ? (
          <p className="mt-1 text-xs text-ink/65 dark:text-zinc-400">
            Using <code className="rounded bg-black/5 px-1">EMAIL_FROM</code> from the server environment.
          </p>
        ) : (
          <p className="mt-1 text-xs text-ink/55 dark:text-zinc-500">
            Leave blank to send from the mailbox email above. Must match your Microsoft mailbox or an approved alias.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pendingSave || envOverrides.smtp}
            onClick={saveSettings}
            className="border-2 border-black bg-black px-4 py-2 text-sm font-bold text-white hover:bg-neutral-900 disabled:opacity-50"
          >
            {pendingSave ? "Saving…" : "Save email settings"}
          </button>
          {saveMsg ? <span className="text-sm font-bold text-lagoon-dark">{saveMsg}</span> : null}
          {saveErr ? <span className="text-sm font-bold text-coral">{saveErr}</span> : null}
        </div>
      </section>

      <section className="rounded border-2 border-palm/25 bg-surf/30 p-4 dark:border-zinc-600 dark:bg-zinc-900/40">
        <h2 className="text-lg font-black text-palm dark:text-emerald-300">Connection status</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded border border-palm/20 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-950">
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">SMTP login</dt>
            <dd className="mt-1 font-bold">
              {status.configured ? (
                <span className="text-lagoon-dark dark:text-emerald-400">Connected</span>
              ) : (
                <span className="text-coral">Not set</span>
              )}
            </dd>
            {status.smtpUser ? <dd className="mt-0.5 font-mono text-xs text-ink/65">{status.smtpUser}</dd> : null}
            {status.credentialSource !== "none" ? (
              <dd className="mt-1 text-xs text-ink/55">
                Source: {status.credentialSource === "env" ? "environment" : "saved settings"}
              </dd>
            ) : null}
          </div>
          <div className="rounded border border-palm/20 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-950">
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">From address</dt>
            <dd className="mt-1 font-mono text-xs break-all">{status.fromAddress || "—"}</dd>
            <dd className="mt-1 text-xs text-ink/55">
              {status.smtpHost}:{status.smtpPort}
            </dd>
          </div>
        </dl>

        {status.environment ? (
          <p className="mt-3 text-xs text-ink/60">Runtime: {status.environment}</p>
        ) : null}

        {!status.configured ? (
          <div className="mt-4 rounded border border-coral/40 bg-coral/10 p-3 text-sm text-ink">
            <p className="font-bold text-coral">Email is not connected</p>
            <p className="mt-1">
              Enter your Microsoft mailbox email and password above, save, then send a test. Without SMTP, password-reset
              links are only logged in the server console (dev may show the link on screen).
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded border-2 border-palm/25 bg-white p-4 dark:border-zinc-600 dark:bg-zinc-900/30">
        <h2 className="text-lg font-black text-palm dark:text-emerald-300">Send test email</h2>
        <p className="mt-1 text-sm text-ink/70 dark:text-zinc-400">
          Sends a real message through your Microsoft mailbox.
        </p>
        <form onSubmit={sendTest} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-[16rem] flex-1 text-sm font-bold text-ink">
            Recipient
            <input
              type="email"
              required
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full border-2 border-palm-mid px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              disabled={pendingTest}
            />
          </label>
          <button type="submit" disabled={pendingTest || !status.configured} className={btnSecondaryMd}>
            {pendingTest ? "Sending…" : "Send test"}
          </button>
        </form>
        {msg ? <p className="mt-3 text-sm font-bold text-lagoon-dark">{msg}</p> : null}
        {err ? <p className="mt-3 text-sm font-bold text-coral">{err}</p> : null}
      </section>

      <section className="rounded border border-palm/20 p-4 dark:border-zinc-600">
        <h2 className="text-lg font-black text-palm dark:text-emerald-300">Emails customers may receive</h2>
        <ul className="mt-3 space-y-3">
          {initial.kinds.map((k) => (
            <li key={k.id} className="border-l-4 border-lagoon/60 pl-3 text-sm">
              <p className="font-bold text-ink dark:text-zinc-200">{k.name}</p>
              <p className="mt-0.5 text-ink/70 dark:text-zinc-400">{k.description}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-ink/60 dark:text-zinc-500">
          Order confirmation emails are not sent yet — customers see order details in their account after checkout.
        </p>
      </section>

      <section className="rounded border border-palm/15 bg-surf/20 p-4 text-sm dark:bg-zinc-900/20">
        <h2 className="font-black text-palm dark:text-emerald-300">GoDaddy Microsoft Essentials checklist</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-ink/80 dark:text-zinc-300">
          <li>
            In GoDaddy → Email &amp; Office, open your mailbox (e.g.{" "}
            <code className="rounded bg-black/5 px-1 text-xs">noreply@7thleg.com</code>).
          </li>
          <li>
            Confirm you can sign in at{" "}
            <a href="https://outlook.office.com" className="text-lagoon-dark underline" target="_blank" rel="noreferrer">
              outlook.office.com
            </a>{" "}
            with that email and password.
          </li>
          <li>
            Paste the mailbox email and password in <strong>Microsoft 365 SMTP</strong> above and save. Host stays{" "}
            <code className="rounded bg-black/5 px-1 text-xs">smtp.office365.com</code>, port{" "}
            <code className="rounded bg-black/5 px-1 text-xs">587</code>.
          </li>
          <li>
            Use <strong>Send test</strong>, then try{" "}
            <a href="/forgot-password" className="text-lagoon-dark underline" target="_blank" rel="noreferrer">
              /forgot-password
            </a>
            .
          </li>
        </ol>
      </section>
    </div>
  );
}
