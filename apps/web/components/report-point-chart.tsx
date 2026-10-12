"use client";

import type { ReactNode } from "react";
import { FinancialValue } from "@/components/financial-value";
import { ReplayableGraph } from "@/components/replayable-progress";
import { formatMoney } from "@/lib/tracker-summary";

type Point = { key: string; label: string; value: number; cumulativeValue?: number };

/** Shared pointer/keyboard point inspection; selection is owned by the report. */
export function ReportPointChart({ area, line, zeroY, label, points, selectedIndex, onSelect, children }: {
  area: string; line: string; zeroY?: number; label: string; points: Point[];
  selectedIndex: number; onSelect: (index: number) => void; children?: ReactNode;
}) {
  const coordinates = line.split(" ").map((pair) => pair.split(",").map(Number));
  const selected = points[selectedIndex];
  const knownSeries = points.every((point) => Number.isFinite(point.cumulativeValue ?? point.value));
  const pointLabel = (point: Point) => point.label + ": " +
    (Number.isFinite(point.cumulativeValue ?? point.value) ? formatMoney(point.cumulativeValue ?? point.value) : "Unavailable");
  return <figure className="dashboard-chart-figure">
    {knownSeries ? <ReplayableGraph aria-label={label} className="dashboard-sparkline" preserveAspectRatio="xMidYMid meet"
      role="group" valueKey={area + "|" + line} viewBox="0 0 100 42">
      {points.length > 1 ? <polygon className="dashboard-sparkline-area" points={area} /> : null}
      {zeroY !== undefined ? <line aria-hidden="true" x1="0" x2="100" y1={zeroY} y2={zeroY}
        stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" vectorEffect="non-scaling-stroke" /> : null}
      {points.length > 1 ? <polyline className="dashboard-sparkline-line" pathLength="1" points={line} /> : null}
      {points.map((point, index) => {
        const [x, y] = coordinates[index] ?? [];
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return <circle key={point.key} aria-label={pointLabel(point)}
          className={"dashboard-sparkline-point" + (selectedIndex === index ? " is-selected" : "")}
          cx={x} cy={y} r="2.5" role="button" tabIndex={0}
          onClick={() => onSelect(index)} onFocus={() => onSelect(index)} onPointerEnter={(event) => { event.preventDefault(); onSelect(index); }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(index); }
          }} />;
      })}
    </ReplayableGraph> : <div role="group" aria-label={label}>
      <p className="field-hint">Some financial values are unavailable. Inspect the records before relying on this total.</p>
      {points.map((point, index) => <button key={point.key} type="button" className="button-link"
        onClick={() => onSelect(index)} onFocus={() => onSelect(index)} onPointerEnter={() => onSelect(index)}>
        {pointLabel(point)}
      </button>)}
    </div>}
    <figcaption className="dashboard-chart-point-detail" aria-live="polite">
      {selected ? <><span>{selected.label}</span><FinancialValue animate={false} value={selected.cumulativeValue ?? selected.value} /></>
        : "No trend points available."}
    </figcaption>
    {children}
    <span className="visually-hidden">{points.map(pointLabel).join("; ")}</span>
  </figure>;
}
