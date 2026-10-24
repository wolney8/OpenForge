"use client";

import { useId, type ReactNode } from "react";
import { FinancialValue } from "@/components/financial-value";
import { formatMoney } from "@/lib/tracker-summary";

type Point = { key: string; label: string; value: number; cumulativeValue?: number };

/** Shared pointer/keyboard point inspection; selection is owned by the report. */
export function ReportPointChart({ area, line, zeroY, label, points, selectedIndex, onSelect, onActivate, children }: {
  area: string; line: string; zeroY?: number; label: string; points: Point[];
  selectedIndex: number; onSelect: (index: number) => void;
  onActivate?: (index: number, trigger: HTMLElement | SVGElement) => void; children?: ReactNode;
}) {
  const gradientId = useId().replace(/:/g, "");
  const coordinates = line.split(" ").map((pair) => pair.split(",").map(Number));
  const selected = points[selectedIndex];
  const knownSeries = points.every((point) => Number.isFinite(point.cumulativeValue ?? point.value));
  const pointLabel = (point: Point) => point.label + ": " +
    (Number.isFinite(point.cumulativeValue ?? point.value) ? formatMoney(point.cumulativeValue ?? point.value) : "Unavailable");
  const activate = (index: number, trigger: HTMLElement | SVGElement) =>
    onActivate ? onActivate(index, trigger) : onSelect(index);
  return <figure className="dashboard-chart-figure">
    <figcaption className="dashboard-chart-point-detail" aria-live="polite">
      {selected ? <><span>{selected.label}</span><FinancialValue animate={false} value={selected.cumulativeValue ?? selected.value} /></>
        : "No trend points available."}
    </figcaption>
    <div className="dashboard-chart-plot">
    {knownSeries ? <svg aria-label={label} className="dashboard-sparkline" preserveAspectRatio="none"
      role="group" viewBox="0 0 100 42">
      <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0.01" /></linearGradient></defs>
      {points.length > 1 ? <polygon className="dashboard-sparkline-area" fill={`url(#${gradientId})`} points={area} /> : null}
      {zeroY !== undefined ? <line aria-hidden="true" x1="0" x2="100" y1={zeroY} y2={zeroY}
        stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" vectorEffect="non-scaling-stroke" /> : null}
      {points.length > 1 ? <polyline className="dashboard-sparkline-line" pathLength="1" points={line} /> : null}
      {selected && coordinates[selectedIndex] ? <line aria-hidden="true" className="dashboard-chart-crosshair" x1={coordinates[selectedIndex][0]} x2={coordinates[selectedIndex][0]} y1="2" y2="40" /> : null}
      {points.map((point, index) => {
        const [x, y] = coordinates[index] ?? [];
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return <circle key={point.key} aria-label={pointLabel(point)} data-chart-point-index={index}
          className={"dashboard-sparkline-point" + (selectedIndex === index ? " is-selected" : "")}
          cx={x} cy={y} r={selectedIndex === index ? "1.8" : "0.5"} role="button" tabIndex={0}
          onClick={(event) => activate(index, event.currentTarget)} onFocus={() => onSelect(index)} onPointerEnter={(event) => { event.preventDefault(); onSelect(index); }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(index, event.currentTarget); }
          }} />;
      })}
    </svg> : <div role="group" aria-label={label}>
      <p className="field-hint">Some financial values are unavailable. Inspect the records before relying on this total.</p>
      {points.map((point, index) => <button key={point.key} type="button" className="button-link"
        onClick={(event) => activate(index, event.currentTarget)} onFocus={() => onSelect(index)} onPointerEnter={() => onSelect(index)}>
        {pointLabel(point)}
      </button>)}
    </div>}
    </div>
    {children}
    <span className="visually-hidden">{points.map(pointLabel).join("; ")}</span>
  </figure>;
}
