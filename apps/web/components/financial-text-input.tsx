"use client";

import { useRef } from "react";

import { isExplicitZero, sanitizeDecimalInput } from "@/lib/decimal-input";

type FinancialTextInputProps = {
  ariaLabel: string;
  dataPdId: string;
  id: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  value: string;
  valueTone?: "neutral" | "positive" | "negative";
  allowNegative?: boolean;
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
  allowNegative = true,
}: FinancialTextInputProps) {
  const handledInitialZeroRef = useRef(false);

  return (
    <span className={`financial-text-input financial-text-input-${valueTone}`}>
      <span aria-hidden="true" className="financial-text-input-prefix">£</span>
      <input
        aria-label={ariaLabel}
        data-pd-id={dataPdId}
        id={id}
        inputMode="decimal"
        onBlur={onBlur}
        onChange={(event) => onChange(sanitizeDecimalInput(event.target.value, { allowNegative }))}
        onFocus={(event) => {
          if (!handledInitialZeroRef.current && isExplicitZero(value)) {
            handledInitialZeroRef.current = true;
            event.currentTarget.select();
          }
        }}
        value={value}
      />
    </span>
  );
}
