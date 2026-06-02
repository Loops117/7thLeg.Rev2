"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg p-8 text-center text-palm">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="mt-3 break-words text-sm text-ink/80">{error.message}</p>
      <button
        type="button"
        className="mt-6 rounded border-2 border-palm px-4 py-2 text-sm font-bold hover:bg-palm hover:text-sand"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
