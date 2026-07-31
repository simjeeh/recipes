import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Shared card surface for a single step, used by the viewer and the editor. */
export const cardClass =
  "group relative h-full overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 shadow-[0_1px_0_0_color-mix(in_oklab,var(--color-foreground)_6%,transparent)_inset,0_8px_24px_-16px_rgb(0_0_0_/_0.9)]";

export function LineConnector() {
  return (
    <div className="flex justify-center py-1">
      <span className="h-10 w-px bg-gradient-to-b from-primary/10 via-primary/50 to-primary/10" />
    </div>
  );
}

/** Vertical stem that splits into two lanes for simultaneous steps. */
export function SplitConnector() {
  return (
    <div className="flex flex-col items-center py-1">
      <span className="h-6 w-px bg-gradient-to-b from-primary/10 to-primary/50" />
      <div className="hidden w-full md:block">
        <LaneBar />
        <LaneStubs />
      </div>
      <span className="h-6 w-px bg-gradient-to-b from-primary/50 to-primary/10 md:hidden" />
    </div>
  );
}

/**
 * Horizontal bar spanning the centers of two lane columns laid out as
 * `grid-cols-2 gap-4`, so connectors line up with the lane cards above/below.
 */
function LaneBar() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="-mr-2 ml-[50%] h-px bg-gradient-to-r from-primary/50 to-primary/20" />
      <div className="-ml-2 mr-[50%] h-px bg-gradient-to-r from-primary/20 to-primary/50" />
    </div>
  );
}

/** Two short vertical stubs centered on each lane column. */
function LaneStubs({ towards }: { towards: "bar" | "lanes" }) {
  const line =
    towards === "bar"
      ? "bg-gradient-to-b from-primary/50 to-primary/25"
      : "bg-gradient-to-b from-primary/25 to-primary/50";
  return (
    <div className="grid grid-cols-2 gap-4">
      <span className={`mx-auto h-6 w-px ${line}`} />
      <span className={`mx-auto h-6 w-px ${line}`} />
    </div>
  );
}

export const pillClass =
  "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors";

/**
 * Inverse of SplitConnector: two lines rise from the lane centers, join into a
 * horizontal bar and drop a single stem into the next (converging) step.
 */
export function MergeConnector() {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="hidden w-full md:block">
        <LaneStubs />
        <LaneBar />
      </div>
      <span className="h-6 w-px bg-gradient-to-b from-primary/10 to-primary/50 md:hidden" />
      <span className="h-6 w-px bg-gradient-to-b from-primary/50 to-primary/10" />
    </div>
  );
}
  "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors";

export const pillActiveClass = "border-primary/60 bg-primary/15 text-primary";
export const pillIdleClass =
  "border-border/70 bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground";

/**
 * Single-line pill lane. Options never wrap: the lane scrolls sideways and
 * chevron badges appear on whichever side still has hidden options.
 */
export function PillLane({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const nudge = (direction: -1 | 1) => {
    ref.current?.scrollBy({ left: direction * 140, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={measure}
        className="no-scrollbar flex flex-nowrap items-center justify-start gap-1.5 overflow-x-auto px-6 sm:justify-center"
      >
        {children}
      </div>
      <EdgeArrow side="left" visible={edges.left} onClick={() => nudge(-1)} />
      <EdgeArrow side="right" visible={edges.right} onClick={() => nudge(1)} />
    </div>
  );
}

function EdgeArrow({
  side,
  visible,
  onClick,
}: {
  side: "left" | "right";
  visible: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label={side === "left" ? "Scroll options left" : "Scroll options right"}
      onClick={onClick}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full border border-primary/40 bg-background/90 p-0.5 text-primary shadow-sm transition-opacity ${
        side === "left" ? "left-0" : "right-0"
      } ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

/** Small caption above a parallel lane, e.g. "Pot 1". */
export function LaneLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
      {children}
    </p>
  );
}
