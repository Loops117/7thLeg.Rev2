"use client";

import Link from "next/link";
import { btnMainMd } from "@/lib/btn-theme-classes";

export default function PublicEventError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-6 sm:p-10">
      <h1 className="text-2xl font-black text-coral">This event can’t be shown right now</h1>
      <p className="mt-4 max-w-xl text-ink/85">
        Something went wrong loading the page. Please try again in a moment or browse the{" "}
        <Link href="/store" className="font-bold text-lagoon-dark underline">
          store
        </Link>
        .
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-ink/50 select-all">Ref: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className={`mt-6 ${btnMainMd}`}
      >
        Try again
      </button>
    </div>
  );
}
