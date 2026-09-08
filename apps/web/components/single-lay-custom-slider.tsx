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
  current,
  maximum,
  maximumText,
  minimum,
  minimumText,
  onCommit,
  onDraft,
  onMaximumChange,
  onMinimumChange,
}: {
  current: number;
  maximum: number;
  maximumText: string;
  minimum: number;
  minimumText: string;
  onCommit: (value: string) => void;
  onDraft: (value: string) => void;
  onMaximumChange: (value: string) => void;
  onMinimumChange: (value: string) => void;
}) {
  return <div className="custom-slider-card-controls" data-pd-id="calculator.custom-slider">
    <div className="custom-slider-direction-labels" aria-hidden="true"><span />
      <div><span>Underlay</span><span>Standard</span><span>Overlay</span></div><span />
    </div>
    <div className="custom-slider-row">
      <label className="field-control custom-slider-range-label"><span>Min</span><input inputMode="decimal" min="0.01" onChange={(event) => onMinimumChange(event.target.value)} step="0.01" type="number" value={minimumText} /></label>
      <div className="custom-slider-track-wrap"><input
        aria-label="Custom lay stake slider"
        aria-valuemax={maximum}
        aria-valuemin={minimum}
        aria-valuenow={current}
        className="custom-slider-track"
        max={maximum}
        min={minimum}
        onBlur={(event) => onCommit(event.target.value)}
        onChange={(event) => onDraft(event.target.value)}
        onKeyUp={(event) => { if (COMMIT_KEYS.has(event.key)) onCommit(event.currentTarget.value); }}
        onPointerUp={(event) => onCommit(event.currentTarget.value)}
        step="0.01"
        type="range"
        value={current}
      /></div>
      <label className="field-control custom-slider-range-label"><span>Max</span><input inputMode="decimal" min="0.01" onChange={(event) => onMaximumChange(event.target.value)} step="0.01" type="number" value={maximumText} /></label>
    </div>
  </div>;
}
