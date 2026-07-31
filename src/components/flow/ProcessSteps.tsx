import { Fragment } from "react";

import { layoutSteps, type ProcessStep } from "@/lib/recipes";

/**
 * Step connector — diagram-style flow that works at every width. Levels stack
 * vertically joined by connector lines; parallel steps fan out side by side on
 * desktop and stack into their own lanes on mobile.
 */
export function ProcessSteps({ steps }: { steps: ProcessStep[] }) {
  const levels = layoutSteps(steps);

  if (!levels.length) {
    return <p className="text-sm text-muted-foreground">No steps yet.</p>;
  }

  return (
    <ol className="flex flex-col items-center">
      {levels.map((level, levelIndex) => (
        <Fragment key={levelIndex}>
          {levelIndex > 0 ? (
            <li aria-hidden="true" className="w-full">
              {level.length > 1 ? <SplitConnector /> : <LineConnector />}
            </li>
          ) : null}
          <li className="w-full">
            {level.length > 1 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {level.map((step) => (
                  <StepCard key={step.id} step={step} branch />
                ))}
              </div>
            ) : (
              <div className="mx-auto w-full max-w-xl">
                <StepCard step={level[0]} />
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
      <span className="h-8 w-px bg-border" />
    </div>
  );
}

/** Vertical stem that splits into two lanes for parallel / conditional steps. */
function SplitConnector() {
  return (
    <div className="flex flex-col items-center py-1">
      <span className="h-5 w-px bg-border" />
      <div className="hidden w-1/2 md:block">
        <div className="h-px w-full bg-border" />
        <div className="flex justify-between">
          <span className="h-5 w-px bg-border" />
          <span className="h-5 w-px bg-border" />
        </div>
      </div>
      <span className="h-5 w-px bg-border md:hidden" />
    </div>
  );
}

function StepCard({ step, branch = false }: { step: ProcessStep; branch?: boolean }) {
  return (
    <div
      className={`h-full rounded-lg border p-4 shadow-lg transition-colors ${
        branch
          ? "border-dashed border-primary/50 bg-primary/5"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      {step.branch_label ? (
        <span className="mb-2 inline-block rounded-full border border-primary/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {step.branch_label}
        </span>
      ) : null}
      <p className="font-semibold leading-snug text-foreground">{step.label}</p>
      {step.detail ? (
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
      ) : null}
    </div>
  );
}