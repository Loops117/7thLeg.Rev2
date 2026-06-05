"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  sendAdminTestEmail,
  updateEmailSettings,
  type EmailAdminPanelData,
} from "@/app/actions/email-admin";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import type { EmailSettingsState } from "@/lib/email-config";

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
            ? `Test email sent. Resend message id: ${res.messageId}`
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
        <h2 className="text-lg font-black text-palm dark:text-emerald-300">Resend connection</h2>
        <p className="mt-1 text-sm text-ink/70 dark:text-zinc-400">
          Email is sent through{" "}
          <a
            href="https://resend.com"
            className="font-medium text-lagoon-dark underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Resend
          </a>
          . Save credentials here, or set environment variables (env wins when both are set).
        </p>

        <div className="mt-4 space-y-4">
          <label className="block text-sm font-bold text-ink dark:text-zinc-200">
            Resend API key
            <input
              type="password"
              autoComplete="off"
              value={form.resendApiKey}
              onChange={(e) => setForm((f) => ({ ...f, resendApiKey: e.target.value }))}
              placeholder="re_…"
              disabled={envOverrides.resendApiKey}
              className="mt-1 w-full max-w-lg border-2 border-palm-mid px-3 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-950"
              maxLength={200}
            />
          </label>
          {envOverrides.resendApiKey ? (
            <p className="text-xs text-ink/65 dark:text-zinc-400">
              Using <code className="rounded bg-black/5 px-1">RESEND_API_KEY</code> from the server environment — clear
              that env var to use the saved key below.
            </p>
          ) : null}

          <label className="block text-sm font-bold text-ink dark:text-zinc-200">
            From address
            <input
              type="text"
              value={form.emailFromAddress}
              onChange={(e) => setForm((f) => ({ ...f, emailFromAddress: e.target.value }))}
              placeholder='Inverts Oasis <noreply@yourdomain.com>'
              disabled={envOverrides.emailFrom}
              className="mt-1 w-full max-w-lg border-2 border-palm-mid px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              maxLength={200}
            />
          </label>
          {envOverrides.emailFrom ? (
            <p className="text-xs text-ink/65 dark:text-zinc-400">
              Using <code className="rounded bg-black/5 px-1">EMAIL_FROM</code> from the server environment.
            </p>
          ) : (
            <p className="text-xs text-ink/55 dark:text-zinc-500">
              Use a sender on a domain you verified in Resend. Leave blank to use Resend&apos;s sandbox sender (testing
              only).
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pendingSave}
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
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Resend API key</dt>
            <dd className="mt-1 font-bold">
              {status.configured ? (
                <span className="text-lagoon-dark dark:text-emerald-400">Connected</span>
              ) : (
                <span className="text-coral">Not set</span>
              )}
            </dd>
            {status.apiKeyHint ? (
              <dd className="mt-0.5 font-mono text-xs text-ink/65">{status.apiKeyHint}</dd>
            ) : null}
            {status.apiKeySource !== "none" ? (
              <dd className="mt-1 text-xs text-ink/55">
                Source: {status.apiKeySource === "env" ? "environment" : "saved settings"}
              </dd>
            ) : null}
          </div>
          <div className="rounded border border-palm/20 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-950">
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">From address</dt>
            <dd className="mt-1 font-mono text-xs break-all">{status.fromAddress}</dd>
            {status.usingDefaultFrom ? (
              <dd className="mt-1 text-xs text-coral">
                Using Resend sandbox default — set a verified sender for production.
              </dd>
            ) : status.fromSource !== "default" ? (
              <dd className="mt-1 text-xs text-ink/55">
                Source: {status.fromSource === "env" ? "environment" : "saved settings"}
              </dd>
            ) : null}
          </div>
        </dl>

        {status.environment ? (
          <p className="mt-3 text-xs text-ink/60">Runtime: {status.environment}</p>
        ) : null}

        {!status.configured ? (
          <div className="mt-4 rounded border border-coral/40 bg-coral/10 p-3 text-sm text-ink">
            <p className="font-bold text-coral">Email is not connected</p>
            <p className="mt-1">
              Add your Resend API key above and save, then send a test message. Without a key, password-reset links are
              only logged in the server console (dev may show the link on screen).
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded border-2 border-palm/25 bg-white p-4 dark:border-zinc-600 dark:bg-zinc-900/30">
        <h2 className="text-lg font-black text-palm dark:text-emerald-300">Send test email</h2>
        <p className="mt-1 text-sm text-ink/70 dark:text-zinc-400">
          Sends a real message through Resend using your current from address.
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
        <h2 className="font-black text-palm dark:text-emerald-300">Setup checklist</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-ink/80 dark:text-zinc-300">
          <li>
            Create a free account at{" "}
            <a href="https://resend.com" className="text-lagoon-dark underline" target="_blank" rel="noreferrer">
              resend.com
            </a>{" "}
            and verify your sending domain (e.g. <strong>7thleg.com</strong>).
          </li>
          <li>
            Paste your API key in <strong>Resend connection</strong> above and save, or set{" "}
            <code className="rounded bg-black/5 px-1 text-xs">RESEND_API_KEY</code> in Vercel.
          </li>
          <li>
            Set the from address to a verified sender, e.g.{" "}
            <code className="rounded bg-black/5 px-1 text-xs">7th Leg &lt;noreply@7thleg.com&gt;</code>.
          </li>
          <li>
            Use <strong>Send test</strong> above, then try{" "}
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
