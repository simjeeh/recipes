import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

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
      <span className="h-10 w-px bg-gradient-to-b from-primary/10 via-primary/50 to-primary/10" />
    </div>
  );
}

/** Vertical stem that splits into two lanes for parallel / conditional steps. */
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

function StepCard({ step, branch = false }: { step: ProcessStep; branch?: boolean }) {
  return (
    <div
      className={`group relative h-full overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 ${
        branch
          ? "border-dashed border-primary/40 bg-primary/[0.04] hover:border-primary/70 hover:bg-primary/[0.08]"
          : "border-border/70 bg-card/70 hover:border-primary/60 hover:bg-card"
      } shadow-[0_1px_0_0_color-mix(in_oklab,var(--color-foreground)_6%,transparent)_inset,0_8px_24px_-16px_rgb(0_0_0_/_0.9)] hover:shadow-[0_1px_0_0_color-mix(in_oklab,var(--color-primary)_18%,transparent)_inset,0_18px_40px_-24px_color-mix(in_oklab,var(--color-primary)_45%,transparent)]`}
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