"use client";

export function CalculatorUndoButton({
  className = "",
  dataPdId,
  label,
  onClick,
}: {
  className?: string;
  dataPdId?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`icon-button calculator-undo-button${className ? ` ${className}` : ""}`}
      data-pd-id={dataPdId}
      onClick={onClick}
      title={label}
      type="button"
    >
      <span aria-hidden="true" className="calculator-undo-button-glyph">
        <span className="material-symbols-outlined">undo</span>
      </span>
    </button>
  );
}
