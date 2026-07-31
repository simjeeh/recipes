import { Fragment, useState } from "react";

import { layoutSteps, type ProcessStep } from "@/lib/recipes";

type Block =
  | { kind: "step"; step: ProcessStep }
  | { kind: "parallel"; steps: ProcessStep[] }
  | { kind: "options"; options: { head: ProcessStep; rest: ProcessStep[] }[] };

/** Steps reachable from `rootId` and from no other option root. */
function exclusiveChain(steps: ProcessStep[], rootId: string, otherRoots: string[]): ProcessStep[] {
  const ancestors = new Map<string, Set<string>>();
  const resolve = (id: string, seen: Set<string>): Set<string> => {
    if (ancestors.has(id)) return ancestors.get(id)!;
    if (seen.has(id)) return new Set();
    seen.add(id);
    const step = steps.find((s) => s.id === id);
    const set = new Set<string>();
    for (const parent of step?.parents ?? []) {
      set.add(parent);
      for (const grand of resolve(parent, seen)) set.add(grand);
    }
    ancestors.set(id, set);
    return set;
  };

  return steps.filter((step) => {
    const set = resolve(step.id, new Set());
    return set.has(rootId) && !otherRoots.some((other) => set.has(other));
  });
}

/** Turns the dependency levels into renderable blocks (single, parallel, options). */
function toBlocks(steps: ProcessStep[]): Block[] {
  const levels = layoutSteps(steps);
  const consumed = new Set<string>();
  const blocks: Block[] = [];

  for (const level of levels) {
    const remaining = level.filter((step) => !consumed.has(step.id));
    if (!remaining.length) continue;

    if (remaining.length > 1 && remaining.every((step) => step.alternative)) {
      const roots = remaining.map((step) => step.id);
      const options = remaining.map((head) => {
        const rest = exclusiveChain(
          steps,
          head.id,
          roots.filter((id) => id !== head.id),
        );
        rest.forEach((step) => consumed.add(step.id));
        return { head, rest };
      });
      remaining.forEach((step) => consumed.add(step.id));
      blocks.push({ kind: "options", options });
      continue;
    }

    remaining.forEach((step) => consumed.add(step.id));
    blocks.push(
      remaining.length > 1 ? { kind: "parallel", steps: remaining } : { kind: "step", step: remaining[0] },
    );
  }

  return blocks;
}

/**
 * Step connector — diagram-style flow that works at every width. Blocks stack
 * vertically joined by connector lines; simultaneous steps fan out side by side
 * and alternative paths collapse into a single card with selectable options.
 */
export function ProcessSteps({ steps }: { steps: ProcessStep[] }) {
  const blocks = toBlocks(steps);

  if (!blocks.length) {
    return <p className="text-sm text-muted-foreground">No steps yet.</p>;
  }

  return (
    <ol className="flex flex-col items-center">
      {blocks.map((block, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <li aria-hidden="true" className="w-full">
              {block.kind === "parallel" ? <SplitConnector /> : <LineConnector />}
            </li>
          ) : null}
          <li className="w-full">
            {block.kind === "parallel" ? (
              <div className="grid gap-4 md:grid-cols-2">
                {block.steps.map((step) => (
                  <StepCard key={step.id} step={step} branch />
                ))}
              </div>
            ) : block.kind === "options" ? (
              <div className="mx-auto w-full max-w-xl">
                <OptionsCard options={block.options} />
              </div>
            ) : (
              <div className="mx-auto w-full max-w-xl">
                <StepCard step={block.step} />
              </div>
            )}
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

function LineConnector() {
  return (
    <div className="flex justify-center py-1">
      <span className="h-10 w-px bg-gradient-to-b from-primary/10 via-primary/50 to-primary/10" />
    </div>
  );
}

/** Vertical stem that splits into two lanes for simultaneous steps. */
function SplitConnector() {
  return (
    <div className="flex flex-col items-center py-1">
      <span className="h-6 w-px bg-gradient-to-b from-primary/10 to-primary/50" />
      <div className="hidden w-1/2 md:block">
        <div className="h-px w-full bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20" />
        <div className="flex justify-between">
          <span className="h-6 w-px bg-gradient-to-b from-primary/50 to-primary/10" />
          <span className="h-6 w-px bg-gradient-to-b from-primary/50 to-primary/10" />
        </div>
      </div>
      <span className="h-6 w-px bg-gradient-to-b from-primary/50 to-primary/10 md:hidden" />
    </div>
  );
}

const cardClass =
  "group relative h-full overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 shadow-[0_1px_0_0_color-mix(in_oklab,var(--color-foreground)_6%,transparent)_inset,0_8px_24px_-16px_rgb(0_0_0_/_0.9)]";

/** One card holding mutually exclusive paths, switched with pill buttons. */
function OptionsCard({ options }: { options: { head: ProcessStep; rest: ProcessStep[] }[] }) {
  const [active, setActive] = useState(0);
  const current = options[Math.min(active, options.length - 1)];
  const steps = [current.head, ...current.rest];

  return (
    <div
      className={`${cardClass} border-dashed border-primary/40 bg-primary/[0.04] hover:border-primary/70`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />
      <div className="flex flex-wrap items-center gap-1.5">
        {options.map((option, index) => {
          const selected = index === (active < options.length ? active : 0);
          return (
            <button
              key={option.head.id}
              type="button"
              onClick={() => setActive(index)}
              aria-pressed={selected}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                selected
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border/70 bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {option.head.branch_label || option.head.label}
            </button>
          );
        })}
      </div>

      <ol className="mt-4 space-y-3">
        {steps.map((step) => (
          <li key={step.id}>
            <p className="text-[0.95rem] font-semibold leading-snug tracking-[-0.01em] text-foreground">
              {step.label}
            </p>
            {step.detail ? (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
            ) : null}
            {step.secret ? (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                Secret
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepCard({ step, branch = false }: { step: ProcessStep; branch?: boolean }) {
  return (
    <div
      className={`${cardClass} hover:-translate-y-0.5 ${
        branch
          ? "border-primary/30 bg-primary/[0.04] hover:border-primary/70 hover:bg-primary/[0.08]"
          : "border-border/70 bg-card/70 hover:border-primary/60 hover:bg-card"
      } hover:shadow-[0_1px_0_0_color-mix(in_oklab,var(--color-primary)_18%,transparent)_inset,0_18px_40px_-24px_color-mix(in_oklab,var(--color-primary)_45%,transparent)]`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      {step.branch_label ? (
        <span className="mb-2.5 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          {step.branch_label}
        </span>
      ) : null}
      <p className="text-[0.98rem] font-semibold leading-snug tracking-[-0.01em] text-foreground">
        {step.label}
      </p>
      {step.detail ? (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
      ) : null}
      {step.secret ? (
        <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Secret
        </span>
      ) : null}
    </div>
  );
}
