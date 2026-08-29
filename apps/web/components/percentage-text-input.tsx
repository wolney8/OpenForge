"use client";

import { useEffect, useRef, useState } from "react";

import {
  decimalRateToPercentageInput,
  formatDecimalInput,
  isExplicitZero,
  percentageInputToDecimalRate,
  sanitizeDecimalInput,
} from "@/lib/decimal-input";

type PercentageTextInputProps = {
  ariaLabel: string;
  clearInitialValueOnFocus?: boolean;
  dataPdId: string;
  id: string;
  onChange: (canonicalValue: string) => void;
  value: string;
  valueMode?: "decimal-rate" | "percentage-points";
};

function toDisplayValue(value: string, mode: "decimal-rate" | "percentage-points"): string {
  return mode === "decimal-rate" ? decimalRateToPercentageInput(value) : value;
}

function toCanonicalValue(value: string, mode: "decimal-rate" | "percentage-points"): string {
  return mode === "decimal-rate" ? percentageInputToDecimalRate(value) : value;
}

export function PercentageTextInput({
  ariaLabel,
  clearInitialValueOnFocus = false,
  dataPdId,
  id,
  onChange,
  value,
  valueMode = "decimal-rate",
}: PercentageTextInputProps) {
  const [displayValue, setDisplayValue] = useState(() => toDisplayValue(value, valueMode));
  const focusedRef = useRef(false);
  const handledInitialValueRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDisplayValue(toDisplayValue(value, valueMode));
  }, [value, valueMode]);

  const invalid = displayValue.trim() !== "" && (
    !Number.isFinite(Number(displayValue)) || Number(displayValue) < 0 || Number(displayValue) > 100
  );

  return (
    <span className="adorned-text-input percentage-text-input">
      <input
        aria-invalid={invalid}
        aria-label={ariaLabel}
        data-pd-id={dataPdId}
        id={id}
        inputMode="decimal"
        onBlur={() => {
          focusedRef.current = false;
          const formatted = formatDecimalInput(displayValue, { emptyValue: "" });
          setDisplayValue(formatted);
          onChange(toCanonicalValue(formatted, valueMode));
        }}
        onChange={(event) => {
          const next = sanitizeDecimalInput(event.target.value, { allowNegative: false });
          setDisplayValue(next);
          onChange(toCanonicalValue(next, valueMode));
        }}
        onFocus={(event) => {
          focusedRef.current = true;
          if (!handledInitialValueRef.current && clearInitialValueOnFocus && displayValue.trim()) {
            handledInitialValueRef.current = true;
            setDisplayValue("");
            onChange("");
          } else if (!handledInitialValueRef.current && isExplicitZero(displayValue)) {
            handledInitialValueRef.current = true;
            event.currentTarget.select();
          }
        }}
        placeholder="2.00"
        value={displayValue}
      />
      <span aria-hidden="true" className="percentage-text-input-suffix">%</span>
    </span>
  );
}
