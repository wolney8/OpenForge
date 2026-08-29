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
  dataPdId: string;
  id: string;
  onChange: (canonicalDecimalRate: string) => void;
  value: string;
};

export function PercentageTextInput({
  ariaLabel,
  dataPdId,
  id,
  onChange,
  value,
}: PercentageTextInputProps) {
  const [displayValue, setDisplayValue] = useState(() => decimalRateToPercentageInput(value));
  const focusedRef = useRef(false);
  const handledInitialZeroRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDisplayValue(decimalRateToPercentageInput(value));
  }, [value]);

  const invalid = displayValue.trim() !== "" && (
    !Number.isFinite(Number(displayValue)) || Number(displayValue) < 0 || Number(displayValue) > 100
  );

  return (
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
        onChange(percentageInputToDecimalRate(formatted));
      }}
      onChange={(event) => {
        const next = sanitizeDecimalInput(event.target.value, { allowNegative: false });
        setDisplayValue(next);
        onChange(percentageInputToDecimalRate(next));
      }}
      onFocus={(event) => {
        focusedRef.current = true;
        if (!handledInitialZeroRef.current && isExplicitZero(displayValue)) {
          handledInitialZeroRef.current = true;
          event.currentTarget.select();
        }
      }}
      placeholder="2.00"
      value={displayValue}
    />
  );
}
