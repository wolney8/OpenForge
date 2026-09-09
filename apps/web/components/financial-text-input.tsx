"use client";

import { useRef } from "react";

import { isExplicitZero, sanitizeDecimalInput } from "@/lib/decimal-input";

type FinancialTextInputProps = {
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  ariaLabel: string;
  dataPdId: string;
  id: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  value: string;
  valueTone?: "neutral" | "positive" | "negative";
  allowNegative?: boolean;
  clearInitialZeroOnFocus?: boolean;
  sanitizeInput?: boolean;
};

// Keep the currency adornment and editable value in one visual field surface.
export function FinancialTextInput({
  ariaDescribedBy,
  ariaInvalid,
  ariaLabel,
  dataPdId,
  id,
  onBlur,
  onChange,
  value,
  valueTone = "neutral",
  allowNegative = true,
  clearInitialZeroOnFocus = false,
  sanitizeInput = true,
}: FinancialTextInputProps) {
  const handledInitialZeroRef = useRef(false);

  return (
    <span className={`adorned-text-input financial-text-input financial-text-input-${valueTone}`}>
      <span aria-hidden="true" className="financial-text-input-prefix">£</span>
      <input
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid || undefined}
        aria-label={ariaLabel}
        data-pd-id={dataPdId}
        id={id}
        inputMode="decimal"
        onBlur={onBlur}
        onChange={(event) => onChange(sanitizeInput
          ? sanitizeDecimalInput(event.target.value, { allowNegative })
          : event.target.value)}
        onFocus={(event) => {
          if (!handledInitialZeroRef.current && isExplicitZero(value)) {
            handledInitialZeroRef.current = true;
            if (clearInitialZeroOnFocus) {
              onChange("");
            } else {
              event.currentTarget.select();
            }
          }
        }}
        value={value}
      />
    </span>
  );
}
