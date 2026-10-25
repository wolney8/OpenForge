"use client";

import { useId } from "react";
import { FinancialValue } from "@/components/financial-value";
import { formatMoney } from "@/lib/tracker-summary";

type Point = { key: string; label: string; value: number; cumulativeValue?: number };

/** Presentation only: the caller owns record inspection and the governed data series. */
export function ReportPointChart({
  area, line, zeroY, label, points, selectedIndex, onSelect, onActivate,
}: {
  area: string; line: string; zeroY?: number; label: string; points: Point[];
  selectedIndex: number; onSelect: (index: number) => void;
  onActivate?: (index: number, trigger: HTMLElement | SVGElement) => void;
}) {
  const gradientId = useId().replace(/:/g, "");
  const coordinates = line.split(" ").map((pair) => pair.split(",").map(Number));
  const selected = points[selectedIndex];
  const selectedCoordinate = coordinates[selectedIndex];
  const knownSeries = points.length > 0 &&
    points.every((point) => Number.isFinite(point.cumulativeValue ?? point.value));
  const pointLabel = (point: Point) =>
    `${point.label}: ${formatMoney(point.cumulativeValue ?? point.value)}`;
  const activate = (index: number, trigger: HTMLElement | SVGElement) =>
    onActivate ? onActivate(index, trigger) : onSelect(index);
  const labelIndexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])]
    .filter((index) => index >= 0 && points[index]);

  if (!knownSeries) {
    return <div className="dashboard-chart-unavailable" role="status">
      <strong>Unavailable</strong>
      <span>Some required betting values need review.</span>
    </div>;
  }

  return (
    <figure className="dashboard-chart-figure">
      <div className="dashboard-chart-point-detail" aria-live="polite">
        <span>{selected?.label ?? "Selected period"}</span>
        {selected ? <FinancialValue animate={false} value={selected.cumulativeValue ?? selected.value} /> : null}
      </div>
      <div className="dashboard-chart-plot">
        <svg aria-label={label} className="dashboard-sparkline" preserveAspectRatio="none"
          role="group" viewBox="0 0 100 42">
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {points.length > 1 ? <polygon className="dashboard-sparkline-area" fill={`url(#${gradientId})`} points={area} /> : null}
          {zeroY !== undefined ? <line aria-hidden="true" className="dashboard-chart-zero-line"
            x1="0" x2="100" y1={zeroY} y2={zeroY} /> : null}
          {points.length > 1 ? <polyline className="dashboard-sparkline-line" points={line} /> : null}
          {selected && selectedCoordinate ? <>
            <line aria-hidden="true" className="dashboard-chart-crosshair"
              x1={selectedCoordinate[0]} x2={selectedCoordinate[0]} y1="2" y2="39" />
            <circle aria-hidden="true" className="dashboard-sparkline-active-point"
              cx={selectedCoordinate[0]} cy={selectedCoordinate[1]} r="1.6" />
          </> : null}
          {points.map((point, index) => {
            const [x, y] = coordinates[index] ?? [];
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
            return <circle key={point.key} aria-label={pointLabel(point)}
              className="dashboard-chart-hit-target" cx={x} cy={y}
              data-chart-point-index={index} r="4" role="button" tabIndex={0}
              onClick={(event) => activate(index, event.currentTarget)}
              onFocus={() => onSelect(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault(); activate(index, event.currentTarget);
                }
              }}
              onPointerEnter={() => onSelect(index)} />;
          })}
        </svg>
        {selected && selectedCoordinate ? <div aria-hidden="true" className="dashboard-chart-tooltip"
          style={{ left: `${selectedCoordinate[0]}%`, top: `${(selectedCoordinate[1] / 42) * 100}%` }}>
          <span>{selected.label}</span>
          <strong>{formatMoney(selected.cumulativeValue ?? selected.value)}</strong>
        </div> : null}
        <div aria-hidden="true" className="dashboard-chart-axis">
          {labelIndexes.map((index) => <span key={points[index].key}>{points[index].label}</span>)}
        </div>
      </div>
      <span className="visually-hidden">{points.map(pointLabel).join("; ")}</span>
    </figure>
  );
}
