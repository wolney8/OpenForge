"use client";

const COMMIT_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

export function SingleLayCustomSlider({
  ariaLabel = "Custom lay stake slider",
  centre,
  current,
  maximum,
  maximumText,
  minimum,
  minimumText,
  onCommit,
  onDraft,
  onMaximumChange,
  onMinimumChange,
  unit = "stake",
}: {
  ariaLabel?: string;
  centre?: number;
  current: number;
  maximum: number;
  maximumText: string;
  minimum: number;
  minimumText: string;
  onCommit: (value: string) => void;
  onDraft: (value: string) => void;
  onMaximumChange: (value: string) => void;
  onMinimumChange: (value: string) => void;
  unit?: "stake" | "multiplier";
}) {
  const usesSplitScale = centre !== undefined && centre > minimum && centre < maximum;
  const toPosition = (value: number) => usesSplitScale
    ? value <= centre!
      ? 50 * (value - minimum) / (centre! - minimum)
      : 50 + 50 * (value - centre!) / (maximum - centre!)
    : value;
  const fromPosition = (value: number) => usesSplitScale
    ? value <= 50
      ? minimum + (centre! - minimum) * value / 50
      : centre! + (maximum - centre!) * (value - 50) / 50
    : value;
  const emit = (callback: (value: string) => void, position: string) => {
    callback(fromPosition(Number(position)).toFixed(unit === "multiplier" ? 4 : 2));
  };
  return <div className="custom-slider-card-controls" data-pd-id="calculator.custom-slider">
    <div className="custom-slider-direction-labels" aria-hidden="true"><span />
      <div><span>Underlay</span><span>Standard</span><span>Overlay</span></div><span />
    </div>
    <div className="custom-slider-row">
      <label className="field-control custom-slider-range-label"><span>Min</span><input inputMode="decimal" min="0.01" onChange={(event) => onMinimumChange(event.target.value)} step="0.01" type="number" value={minimumText} /></label>
      <div className="custom-slider-track-wrap"><input
        aria-label={ariaLabel}
        aria-valuemax={maximum}
        aria-valuemin={minimum}
        aria-valuenow={current}
        aria-valuetext={unit === "multiplier" ? `${current.toFixed(4)} times` : undefined}
        className="custom-slider-track"
        max={usesSplitScale ? 100 : maximum}
        min={usesSplitScale ? 0 : minimum}
        onBlur={(event) => emit(onCommit, event.target.value)}
        onChange={(event) => emit(onDraft, event.target.value)}
        onKeyUp={(event) => { if (COMMIT_KEYS.has(event.key)) emit(onCommit, event.currentTarget.value); }}
        onPointerUp={(event) => emit(onCommit, event.currentTarget.value)}
        step={usesSplitScale ? 0.25 : 0.01}
        type="range"
        value={toPosition(current)}
      /></div>
      <label className="field-control custom-slider-range-label"><span>Max</span><input inputMode="decimal" min="0.01" onChange={(event) => onMaximumChange(event.target.value)} step="0.01" type="number" value={maximumText} /></label>
    </div>
  </div>;
}
