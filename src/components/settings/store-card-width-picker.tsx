"use client";

type Preset = { id: string; label: string; cardWidthPx: number };

export function StoreCardWidthPicker({
  legend,
  presets,
  valuePx,
  onChangePx,
  radioName,
  minPx,
  maxPx,
  hint,
}: {
  legend: string;
  presets: readonly Preset[];
  valuePx: number;
  onChangePx: (px: number) => void;
  radioName: string;
  minPx: number;
  maxPx: number;
  hint?: string;
}) {
  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-bold text-ink dark:text-zinc-100">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-3">
        {presets.map((preset) => {
          const active = valuePx === preset.cardWidthPx;
          return (
            <label
              key={preset.id}
              className={`flex cursor-pointer items-center gap-2 rounded border-2 px-3 py-2 text-sm ${
                active
                  ? "border-palm bg-surf/60 font-bold dark:border-emerald-600 dark:bg-zinc-800"
                  : "border-palm/30 dark:border-zinc-600"
              }`}
            >
              <input
                type="radio"
                name={radioName}
                checked={active}
                onChange={() => onChangePx(preset.cardWidthPx)}
                className="sr-only"
              />
              {preset.label}
              <span className="font-mono text-xs font-normal text-ink/55 dark:text-zinc-500">
                {preset.cardWidthPx}px
              </span>
            </label>
          );
        })}
      </div>
      <label className="mt-3 block text-sm font-bold text-ink dark:text-zinc-100">
        Custom width (px)
        <input
          type="number"
          min={minPx}
          max={maxPx}
          value={valuePx}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isNaN(n)) return;
            onChangePx(Math.min(maxPx, Math.max(minPx, Math.floor(n))));
          }}
          className="mt-1 w-28 border-2 border-palm-mid px-2 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
      </label>
      {hint ? <p className="mt-2 text-xs text-ink/60 dark:text-zinc-400">{hint}</p> : null}
    </fieldset>
  );
}
