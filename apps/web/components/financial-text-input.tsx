"use client";

type FinancialTextInputProps = {
  ariaLabel: string;
  dataPdId: string;
  id: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  value: string;
  valueTone?: "neutral" | "positive" | "negative";
};

// Keep the currency adornment and editable value in one visual field surface.
export function FinancialTextInput({
  ariaLabel,
  dataPdId,
  id,
  onBlur,
  onChange,
  value,
  valueTone = "neutral",
}: FinancialTextInputProps) {
  return (
    <span className={`financial-text-input financial-text-input-${valueTone}`}>
      <span aria-hidden="true" className="financial-text-input-prefix">£</span>
      <input
        aria-label={ariaLabel}
        data-pd-id={dataPdId}
        id={id}
        inputMode="decimal"
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </span>
  );
}
