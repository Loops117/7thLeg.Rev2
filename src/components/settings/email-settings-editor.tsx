"use client";

import { btnSecondaryMd } from "@/lib/btn-theme-classes";

import { useState, useTransition } from "react";
import { sendAdminTestEmail, type EmailAdminPanelData } from "@/app/actions/email-admin";

export function EmailSettingsEditor({ initial }: { initial: EmailAdminPanelData }) {
  const [testTo, setTestTo] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { status } = initial;

  function sendTest(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    startTransition(async () => {
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
      <section className="rounded border-2 border-palm/25 bg-surf/30 p-4 dark:border-zinc-600 dark:bg-zinc-900/40">
        <h2 className="text-lg font-black text-palm dark:text-emerald-300">Connection status</h2>
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
          . Set environment variables on the server (local <code className="text-xs">.env</code>, production in
          Vercel).
        </p>

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
          </div>
          <div className="rounded border border-palm/20 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-950">
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">From address</dt>
            <dd className="mt-1 font-mono text-xs break-all">{status.fromAddress}</dd>
            {status.usingDefaultFrom ? (
              <dd className="mt-1 text-xs text-coral">
                Using Resend sandbox default — set EMAIL_FROM to your verified domain for production.
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
              Add <code className="rounded bg-black/5 px-1">RESEND_API_KEY</code> to your environment, redeploy, then
              send a test message below. Without it, password-reset links are only logged in the server console (dev
              may show the link on screen).
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded border-2 border-palm/25 bg-white p-4 dark:border-zinc-600 dark:bg-zinc-900/30">
        <h2 className="text-lg font-black text-palm dark:text-emerald-300">Send test email</h2>
        <p className="mt-1 text-sm text-ink/70 dark:text-zinc-400">
          Sends a real message through Resend using your current <strong>EMAIL_FROM</strong> settings.
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
              disabled={pending}
            />
          </label>
          <button
            type="submit"
            disabled={pending || !status.configured}
            className={btnSecondaryMd}
          >
            {pending ? "Sending…" : "Send test"}
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
            and verify your sending domain.
          </li>
          <li>
            Add <code className="rounded bg-black/5 px-1 text-xs">RESEND_API_KEY</code> to{" "}
            <code className="rounded bg-black/5 px-1 text-xs">.env</code> locally and to Vercel environment variables for
            production.
          </li>
          <li>
            Set <code className="rounded bg-black/5 px-1 text-xs">EMAIL_FROM</code> to a verified sender, e.g.{" "}
            <code className="rounded bg-black/5 px-1 text-xs">Inverts Oasis &lt;noreply@yourdomain.com&gt;</code>.
          </li>
          <li>Redeploy, open this page, and use <strong>Send test</strong> above.</li>
          <li>
            Test password reset:{" "}
            <a href="/forgot-password" className="text-lagoon-dark underline" target="_blank" rel="noreferrer">
              /forgot-password
            </a>
          </li>
        </ol>
      </section>
    </div>
  );
}
