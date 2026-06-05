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
      <div ref={listRef} className="account-messages-thread space-y-3">
        {messages.length === 0 ? (
          <p className="account-panel__text text-sm">No messages yet. Say hello to the store team below.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`account-message-bubble ${
                m.sender === "CUSTOMER" ? "account-message-bubble--customer" : "account-message-bubble--admin"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className="account-message-bubble__meta">
                {m.sender === "ADMIN" ? "Store" : "You"} ·{" "}
                {new Date(m.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>
          ))
        )}
      </div>

      {err ? <p className="text-sm font-bold text-coral">{err}</p> : null}

      <div>
        <label className="account-panel__label" htmlFor="acct-msg-body">
          New message
        </label>
        <textarea
          id="acct-msg-body"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={4000}
          className="account-field"
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
