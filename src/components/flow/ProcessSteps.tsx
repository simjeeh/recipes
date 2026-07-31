import { Fragment } from "react";

import { layoutSteps, type ProcessStep } from "@/lib/recipes";

/**
 * Variant B — dependency-free step connector. Levels stack vertically; steps
 * that share a level fan out side by side on desktop and stack as indented
 * branch lanes on mobile.
 */
export function ProcessSteps({ steps }: { steps: ProcessStep[] }) {
  const levels = layoutSteps(steps);

  if (!levels.length) {
    return <p className="text-sm text-muted-foreground">No steps yet.</p>;
  }

  let counter = 0;

  return (
    <ol className="space-y-0">
      {levels.map((level, levelIndex) => {
        const isBranch = level.length > 1;
        return (
          <Fragment key={levelIndex}>
            <li>
              {isBranch ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {level.map((step) => (
                    <StepCard key={step.id} step={step} index={++counter} branch />
                  ))}
                </div>
              ) : (
                <StepCard step={level[0]} index={++counter} />
              )}
            </li>
            {levelIndex < levels.length - 1 ? (
              <li aria-hidden="true" className="flex justify-center py-3">
                <span className="h-8 w-px bg-border" />
              </li>
            ) : null}
          </Fragment>
        );
      })}
    </ol>
  );
}

function StepCard({
  step,
  index,
  branch = false,
}: {
  step: ProcessStep;
  index: number;
  branch?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        branch
          ? "border-dashed border-primary/40 bg-primary/5"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      {step.branch_label ? (
        <span className="mb-2 inline-block rounded-full border border-primary/50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
          {step.branch_label}
        </span>
      ) : null}
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-primary/60 text-xs font-bold text-primary"
          aria-hidden="true"
        >
          {index}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{step.label}</p>
          {step.detail ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}