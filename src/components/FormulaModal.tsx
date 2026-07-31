import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { scaleText } from "@/lib/recipes";

const PREVIEW_VALUES = [1, 2, 5];

/**
 * Small modal for editing an amount formula. `{...}` expressions scale with the
 * recipe variable `n`; the preview shows the result for a few values of `n`.
 */
export function FormulaModal({
  open,
  value,
  unit,
  name,
  variable,
  onClose,
  onSave,
}: {
  open: boolean;
  value: string;
  unit?: string;
  name?: string;
  variable: string;
  onClose: () => void;
  onSave: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit amount formula"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card/95 p-5 shadow-2xl backdrop-blur-md"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Formula</h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">{name || "Ingredient"}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <input
          autoFocus
          aria-label="Amount formula"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="{n*5}-{n*10}"
          className="mt-4 w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary/60"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Wrap math in <code className="text-primary">{"{ }"}</code> — <code>n</code> is{" "}
          {variable || "the scale value"}. Helpers: <code>half()</code> (up to nearest 0.5),{" "}
          <code>ceil()</code>, <code>floor()</code>, <code>round()</code>.
        </p>

        <div className="mt-4 rounded-lg border border-border bg-background/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Preview
          </p>
          <ul className="mt-2 space-y-1.5">
            {PREVIEW_VALUES.map((n) => (
              <li key={n} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {variable || "n"} = {n}
                </span>
                <span className="font-medium text-foreground">
                  {[scaleText(draft, n), unit, name].filter(Boolean).join(" ")}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Save formula
          </button>
        </div>
      </div>
    </div>
  );
}
