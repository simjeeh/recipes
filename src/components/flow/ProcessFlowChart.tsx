import { useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { layoutSteps, stepEdges, type ProcessStep } from "@/lib/recipes";

type StepNodeData = {
  index: number;
  label: string;
  detail?: string;
  branchLabel?: string;
};

function StepNode({ data }: NodeProps) {
  const step = data as StepNodeData;
  return (
    <div
      className={`w-[250px] rounded-lg border bg-card p-3 text-left shadow-lg ${
        step.branchLabel ? "border-dashed border-primary/50" : "border-border"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-border" />
      {step.branchLabel ? (
        <span className="mb-1.5 inline-block rounded-full border border-primary/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {step.branchLabel}
        </span>
      ) : null}
      <div className="flex items-start gap-2">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-primary/60 text-[11px] font-bold text-primary">
          {step.index}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug text-foreground">{step.label}</p>
          {step.detail ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
          ) : null}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-border" />
    </div>
  );
}

const nodeTypes = { step: StepNode };

/** Variant A — React Flow node graph, stacked into one column on narrow screens. */
export default function ProcessFlowChart({ steps }: { steps: ProcessStep[] }) {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const { nodes, edges, height } = useMemo(() => {
    const levels = layoutSteps(steps);
    const nodeList: Node[] = [];
    let index = 0;
    let y = 0;

    levels.forEach((level) => {
      if (narrow) {
        level.forEach((step) => {
          nodeList.push({
            id: step.id,
            type: "step",
            position: { x: 0, y },
            data: {
              index: ++index,
              label: step.label,
              detail: step.detail,
              branchLabel: step.branch_label,
            },
            draggable: false,
          });
          y += 190;
        });
      } else {
        level.forEach((step, i) => {
          nodeList.push({
            id: step.id,
            type: "step",
            position: { x: (i - (level.length - 1) / 2) * 290, y },
            data: {
              index: ++index,
              label: step.label,
              detail: step.detail,
              branchLabel: step.branch_label,
            },
            draggable: false,
          });
        });
        y += 200;
      }
    });

    const edgeList: Edge[] = stepEdges(steps).map((edge) => ({
      id: `${edge.from}->${edge.to}`,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      animated: Boolean(edge.label),
      style: { stroke: "var(--color-border)", strokeWidth: 1.5 },
      labelStyle: { fill: "var(--color-primary)", fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: "var(--color-card)" },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
    }));

    return { nodes: nodeList, edges: edgeList, height: Math.max(420, y + 120) };
  }, [steps, narrow]);

  return (
    <div
      className="overflow-hidden rounded-lg border border-border bg-background"
      style={{ height: narrow ? Math.min(height, 620) : Math.min(height, 780) }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={1.5}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
        zoomOnScroll={false}
        preventScrolling={false}
        panOnScroll={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#2b2b2b" />
        <Controls showInteractive={false} className="!border-border !bg-card" />
      </ReactFlow>
    </div>
  );
}