"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendAdminSupportMessage } from "@/app/actions/support-messages";
import { btnMainMd } from "@/lib/btn-theme-classes";

export function AdminSupportReplyForm({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    setErr(null);
    const body = text.trim();
    if (!body) return;
    startTransition(async () => {
      try {
        await sendAdminSupportMessage(threadId, body);
        setText("");
        router.refresh();
      } catch {
        setErr("Could not send.");
      }
    });
  }

  return (
    <div className="mt-6 border-t border-palm/20 pt-4">
      <label className="block text-sm font-bold text-palm" htmlFor="admin-reply-body">
        Reply
      </label>
      <textarea
        id="admin-reply-body"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={4000}
        className="mt-1 w-full max-w-xl border-2 border-palm-mid bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
      />
      {err ? <p className="mt-2 text-sm text-coral">{err}</p> : null}
      <button
        type="button"
        disabled={pending || !text.trim()}
        onClick={send}
        className={`mt-2 ${btnMainMd}`}
      >
        {pending ? "Sending…" : "Send reply"}
      </button>
    </div>
  );
}
