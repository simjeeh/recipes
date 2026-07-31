import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";

import type { ProcessStep } from "@/lib/recipes";

const ProcessFlowChart = lazy(() => import("./ProcessFlowChart"));

function Placeholder() {
  return (
    <div className="grid h-[420px] place-items-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
      Loading flow chart…
    </div>
  );
}

export function ProcessFlowChartLazy({ steps }: { steps: ProcessStep[] }) {
  return (
    <ClientOnly fallback={<Placeholder />}>
      <Suspense fallback={<Placeholder />}>
        <ProcessFlowChart steps={steps} />
      </Suspense>
    </ClientOnly>
  );
}