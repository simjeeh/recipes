import { Fragment, useState } from "react";

import {
  toProcessRows,
  type ProcessBranch,
  type ProcessRow,
  type ProcessStep,
} from "@/lib/recipes";
import {
  LaneLabel,
  LineConnector,
  MergeConnector,
  PillLane,
  SplitConnector,
  cardClass,
  pillActiveClass,
  pillClass,
  pillIdleClass,
} from "./flow-parts";

/**
 * Step connector — diagram-style flow that works at every width. Rows stack
 * vertically joined by connector lines; simultaneous steps fan out side by side
 * and alternative paths become a switchable lane of cards.
 */
export function ProcessSteps({ steps }: { steps: ProcessStep[] }) {
  const rows = toProcessRows(steps);

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No steps yet.</p>;
  }

  return <RowList rows={rows} />;
}

/** Renders a chain of rows joined by connectors. Recurses for nested options. */
function RowList({ rows, nested = false }: { rows: ProcessRow[]; nested?: boolean }) {
  return (
    <ol className="flex flex-col items-center">
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <li aria-hidden="true" className="w-full">
              {splits(row) ? (
                <SplitConnector />
              ) : splits(rows[index - 1]) ? (
                <MergeConnector />
              ) : (
                <LineConnector />
              )}
            </li>
          ) : null}
          <li className="w-full">
            <Row row={row} nested={nested} />
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

function splits(row: ProcessRow): boolean {
  if (row.kind === "parallel") return row.lanes.length > 1;
  return row.kind === "steps" && row.steps.length > 1;
}

function Row({ row, nested = false }: { row: ProcessRow; nested?: boolean }) {
  if (row.kind === "options") {
    return (
      <div className="mx-auto w-full max-w-xl">
        <OptionsLane branches={row.branches} />
      </div>
    );
  }

  if (row.kind === "parallel") {
    return (
      <div className="grid items-stretch gap-4 md:grid-cols-2">
        {row.lanes.map((lane, index) => (
          <div key={index} className="flex h-full flex-col">
            {lane.label ? <LaneLabel>{lane.label}</LaneLabel> : null}
            <RowList rows={lane.rows} nested />
            <span
              aria-hidden="true"
              className="mx-auto hidden w-px flex-1 bg-gradient-to-b from-primary/10 to-primary/50 md:block"
            />
          </div>
        ))}
      </div>
    );
  }

  if (row.steps.length > 1) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {row.steps.map((step) => (
          <StepCard key={step.id} step={step} branch />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <StepCard step={row.steps[0]} branch={nested} />
    </div>
  );
}

/**
 * Mutually exclusive paths: pill switcher on top, then the selected branch
 * rendered as its own chain of step cards so it reads like the rest of the flow.
 */
function OptionsLane({ branches }: { branches: ProcessBranch[] }) {
  const [active, setActive] = useState(0);
  const index = active < branches.length ? active : 0;
  const branch = branches[index];

  return (
    <div className="relative rounded-[1.4rem] border border-dashed border-primary/35 bg-primary/[0.03] p-4 sm:p-5">
      <PillLane>
        {branches.map((item, i) => {
          const selected = i === index;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={selected}
              className={`${pillClass} ${selected ? pillActiveClass : pillIdleClass}`}
            >
              {branchTitle(item, i)}
            </button>
          );
        })}
      </PillLane>

      <div className="mt-4">
        <RowList rows={branch.rows} nested />
      </div>
    </div>
  );
}

function branchTitle(branch: ProcessBranch, index: number): string {
  if (branch.label.trim()) return branch.label;
  const first = branch.rows[0];
  if (first?.kind === "steps" && first.steps[0]) return first.steps[0].label;
  return `Option ${index + 1}`;
}

function StepCard({
  step,
  branch = false,
}: {
  step: ProcessStep;
  branch?: boolean;
}) {
  return (
    <div
      className={`${cardClass} hover:-translate-y-0.5 ${
        branch
          ? "border-primary/30 bg-card/60 hover:border-primary/70 hover:bg-card"
          : "border-border/70 bg-card/70 hover:border-primary/60 hover:bg-card"
      } hover:shadow-[0_1px_0_0_color-mix(in_oklab,var(--color-primary)_18%,transparent)_inset,0_18px_40px_-24px_color-mix(in_oklab,var(--color-primary)_45%,transparent)]`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
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
