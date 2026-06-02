"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import {
  searchSpeciesSuggestionsForCustomer,
  submitSpeciesSuggestion,
} from "@/app/actions/species-suggestions";
import { btnMainMd } from "@/lib/btn-theme-classes";
import type { SpeciesSuggestionApprovedRow, SpeciesSuggestionPublic } from "@/lib/species-suggestions";

function formatApprovedDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return "";
  }
}

export function SuggestionBoxPane({
  subHeading,
  isLoggedIn,
  approvedSuggestions,
}: {
  subHeading: string;
  isLoggedIn: boolean;
  approvedSuggestions: SpeciesSuggestionApprovedRow[];
}) {
  const router = useRouter();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SpeciesSuggestionPublic[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pending, startTransition] = useTransition();
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setOptions([]);
      return;
    }
    setSearching(true);
    try {
      const rows = await searchSpeciesSuggestionsForCustomer(q);
      setOptions(rows);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !isLoggedIn) return;
    const t = window.setTimeout(() => {
      void runSearch(query);
    }, 200);
    return () => window.clearTimeout(t);
  }, [query, open, isLoggedIn, runSearch]);

  function pickOption(opt: SpeciesSuggestionPublic) {
    setQuery(opt.label);
    setSelectedId(opt.id);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onInputChange(value: string) {
    setQuery(value);
    setSelectedId(null);
    setOpen(true);
    setErr(null);
    setMsg(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const label = query.trim();
    if (!label) {
      setErr("Enter a species or design name.");
      return;
    }
    startTransition(async () => {
      const r = await submitSpeciesSuggestion(label, selectedId);
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      setQuery("");
      setSelectedId(null);
      setOptions([]);
      setOpen(false);
      setMsg(r.created ? "Thanks! Your suggestion was added." : "Thanks! Your vote was counted.");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-xl">
      {subHeading.trim() ? (
        <p className="text-center text-sm font-medium text-ink/85 sm:text-base">{subHeading}</p>
      ) : null}

      {approvedSuggestions.length > 0 ? (
        <div className="mt-6 rounded-lg border-2 border-palm/20 bg-white/50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-palm-mid">Recently approved</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {approvedSuggestions.map((s) => (
              <li
                key={s.id}
                className="rounded-full border border-palm/25 bg-palm/10 px-3 py-1 text-xs font-bold text-palm"
                title={
                  s.suggestionCount > 1
                    ? `Suggested ${s.suggestionCount} times · Approved ${formatApprovedDate(s.approvedAt)}`
                    : `Approved ${formatApprovedDate(s.approvedAt)}`
                }
              >
                {s.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!isLoggedIn ? (
        <p className="mt-6 text-center text-sm text-ink/75">
          <Link href="/login" className="font-bold text-lagoon-dark underline">
            Log in
          </Link>{" "}
          or{" "}
          <Link href="/register" className="font-bold text-lagoon-dark underline">
            create an account
          </Link>{" "}
          to suggest a species or design.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="relative mt-6 space-y-3">
          <label className="block text-sm font-bold text-ink" htmlFor={`${listboxId}-input`}>
            Species or design idea
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id={`${listboxId}-input`}
              type="text"
              value={query}
              disabled={pending}
              autoComplete="off"
              role="combobox"
              aria-expanded={open && options.length > 0}
              aria-controls={`${listboxId}-listbox`}
              aria-autocomplete="list"
              onChange={(e) => onInputChange(e.target.value)}
              onFocus={() => {
                setOpen(true);
                if (query.trim()) void runSearch(query);
              }}
              onBlur={() => {
                window.setTimeout(() => setOpen(false), 150);
              }}
              onKeyDown={(e) => {
                if (!open || options.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((i) => (i + 1) % options.length);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
                } else if (e.key === "Enter" && activeIndex >= 0) {
                  e.preventDefault();
                  pickOption(options[activeIndex]!);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="Type to search past suggestions or enter a new one"
              className="w-full border-2 border-palm-mid bg-white px-3 py-2 text-sm"
            />
            {open && query.trim().length > 0 ? (
              <ul
                id={`${listboxId}-listbox`}
                role="listbox"
                className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded border-2 border-palm bg-white py-1 shadow-lg"
              >
                {searching ? (
                  <li className="px-3 py-2 text-xs text-ink/55">Searching…</li>
                ) : options.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-ink/55">
                    No matching suggestions yet — press Submit to add yours.
                  </li>
                ) : (
                  options.map((opt, i) => (
                    <li key={opt.id} role="option" aria-selected={activeIndex === i}>
                      <button
                        type="button"
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surf/60 ${
                          activeIndex === i ? "bg-surf/80" : ""
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickOption(opt)}
                      >
                        <span className="font-medium text-ink">{opt.label}</span>
                        <span className="shrink-0 text-[10px] font-bold text-palm/70">
                          {opt.suggestionCount} {opt.suggestionCount === 1 ? "vote" : "votes"}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>
          <p className="text-xs text-ink/55">
            Pick an existing suggestion or enter a new name. You can only suggest each species once.
          </p>
          <button type="submit" disabled={pending || !query.trim()} className={`w-full ${btnMainMd}`}>
            {pending ? "Submitting…" : "Submit suggestion"}
          </button>
          {msg ? <p className="text-sm font-medium text-lagoon-dark">{msg}</p> : null}
          {err ? <p className="text-sm font-medium text-coral">{err}</p> : null}
        </form>
      )}
    </div>
  );
}
