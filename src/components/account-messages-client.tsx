"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { listCustomerSupportMessages, sendCustomerSupportMessage, type SupportMessageRow } from "@/app/actions/support-messages";
import { btnMainMd } from "@/lib/btn-theme-classes";

export function AccountMessagesClient({ initialMessages }: { initialMessages: SupportMessageRow[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function send() {
    setErr(null);
    const body = text.trim();
    if (!body) return;
    startTransition(async () => {
      try {
        await sendCustomerSupportMessage(body);
        setText("");
        const rows = await listCustomerSupportMessages();
        setMessages(rows);
      } catch {
        setErr("Could not send. Try again.");
      }
    });
  }

  return (
    <div className="mt-6 max-w-2xl space-y-4">
      <div
        ref={listRef}
        className="max-h-[min(28rem,55dvh)] space-y-3 overflow-y-auto rounded border-2 border-palm/25 bg-white/80 p-4"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-ink/70">No messages yet. Say hello to the store team below.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[90%] rounded border px-3 py-2 text-sm ${
                m.sender === "CUSTOMER"
                  ? "ml-auto border-palm/30 bg-palm/10 text-ink"
                  : "border-palm/20 bg-sand text-ink"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className="mt-1 text-[10px] text-ink/45">
                {m.sender === "ADMIN" ? "Store" : "You"} ·{" "}
                {new Date(m.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>
          ))
        )}
      </div>

      {err ? <p className="text-sm text-coral">{err}</p> : null}

      <div>
        <label className="block text-sm font-bold text-palm" htmlFor="acct-msg-body">
          New message
        </label>
        <textarea
          id="acct-msg-body"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={4000}
          className="mt-1 w-full border-2 border-palm-mid px-3 py-2 text-sm"
          placeholder="Ask a question or leave a note for the store…"
        />
        <button
          type="button"
          disabled={pending || !text.trim()}
          onClick={send}
          className={`mt-2 ${btnMainMd}`}
        >
          {pending ? "Sending…" : "Send message"}
        </button>
      </div>
    </div>
  );
}
