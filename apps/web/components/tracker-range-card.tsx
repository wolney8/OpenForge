"use client";

import { getDatePresetOptions, type DatePreset } from "@/lib/tracker-summary";

type TrackerRangeCardProps = {
  activePreset: string;
  isActionView?: boolean;
  isSaving?: boolean;
  onPresetChange: (preset: DatePreset) => void;
  rangeDetail?: string;
  rangeContext: string;
};

export function TrackerRangeCard({
  activePreset,
  isActionView = false,
  isSaving = false,
  onPresetChange,
  rangeDetail,
  rangeContext,
}: TrackerRangeCardProps) {
  return (
    <article
      className="stat-card tracker-range-card"
      data-pd-id="tracker.range-card"
      title={rangeDetail ?? rangeContext}
    >
      <span className="eyebrow">{isActionView ? "Action View" : "Tracker Range"}</span>
      {isActionView ? (
        <strong className="tracker-range-value">All Dates</strong>
      ) : (
        <label className="tracker-range-control">
          <span className="sr-only">Change tracker date range</span>
          <select
            aria-label="Change tracker date range"
            data-pd-id="tracker.range-card.select"
            disabled={isSaving}
            onChange={(event) => onPresetChange(event.target.value as DatePreset)}
            value={activePreset}
          >
            {getDatePresetOptions().map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined tracker-range-control-icon" aria-hidden="true">
            expand_more
          </span>
        </label>
      )}
      <span className="tracker-range-context">{isSaving ? "Saving range..." : rangeContext}</span>
    </article>
  );
}
