"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

export type QuickSelectChoice = {
  label: string;
  style?: CSSProperties;
  value: string;
};

export function QuickSelectRail({
  ariaLabel,
  choices,
  onSelect,
  selectedValues = [],
  wrapLabels = false,
}: {
  ariaLabel: string;
  choices: QuickSelectChoice[];
  onSelect: (value: string) => void;
  selectedValues?: string[];
  wrapLabels?: boolean;
}) {
  const [compactLabels, setCompactLabels] = useState(false);
  const pageSize = wrapLabels && compactLabels ? 1 : 3;
  const pageCount = Math.max(1, Math.ceil(choices.length / pageSize));
  const selectedIndex = useMemo(
    () => choices.findIndex((choice) => selectedValues.includes(choice.value)),
    [choices, selectedValues],
  );
  const selectedValue = selectedIndex < 0 ? "" : choices[selectedIndex].value;
  const selectedPage = selectedIndex < 0 ? 0 : Math.floor(selectedIndex / pageSize);
  const [navigation, setNavigation] = useState(() => ({
    page: selectedPage,
    pageSize,
    selectedValue,
  }));
  useEffect(() => {
    if (!wrapLabels) return;
    const media = window.matchMedia("(max-width: 40rem)");
    const sync = () => setCompactLabels(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [wrapLabels]);
  const page = Math.min(
    navigation.selectedValue === selectedValue && navigation.pageSize === pageSize ? navigation.page : selectedPage,
    pageCount - 1,
  );

  const firstIndex = page * pageSize;
  const visibleChoices = choices.slice(firstIndex, firstIndex + pageSize);
  const hasPages = choices.length > pageSize;

  return (
    <div
      aria-label={ariaLabel}
      className={`import-review-loadout-shell quick-select-rail${wrapLabels ? " quick-select-rail-wrap-labels" : ""}`}
      data-pd-id="quick-select.rail"
      role="group"
    >
      {hasPages ? (
        <button
          aria-label={`Show previous ${ariaLabel}`}
          className="icon-button compact-action"
          disabled={page === 0}
          onClick={() => setNavigation({ page: Math.max(0, page - 1), pageSize, selectedValue })}
          type="button"
        >
          <span aria-hidden="true" className="material-symbols-outlined">chevron_left</span>
        </button>
      ) : null}
      <div
        className="tracker-nav import-review-loadouts quick-select-rail-page"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, visibleChoices.length)}, minmax(0, 1fr))` }}
      >
        {visibleChoices.map((choice) => (
          <button
            aria-pressed={selectedValues.includes(choice.value)}
            className={`review-chip${selectedValues.includes(choice.value) ? " review-chip-action-positive" : ""}`}
            key={choice.value}
            onClick={() => onSelect(choice.value)}
            style={choice.style}
            title={choice.label}
            type="button"
          >
            <span className="quick-select-rail-label">{choice.label}</span>
          </button>
        ))}
      </div>
      {hasPages ? (
        <button
          aria-label={`Show next ${ariaLabel}`}
          className="icon-button compact-action"
          disabled={page >= pageCount - 1}
          onClick={() => setNavigation({ page: Math.min(pageCount - 1, page + 1), pageSize, selectedValue })}
          type="button"
        >
          <span aria-hidden="true" className="material-symbols-outlined">chevron_right</span>
        </button>
      ) : null}
    </div>
  );
}
