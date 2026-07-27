"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  financialMotionDirection,
  formatFinancialValue,
  moneyTone,
  type MoneyMotionDirection,
} from "@/lib/financial-display";

type FinancialValueProps = {
  animate?: boolean;
  className?: string;
  label?: string;
  showPositiveSign?: boolean;
  title?: string;
  value: number | string;
  zeroTone?: "positive" | "neutral";
};

export function FinancialValue({
  animate = true,
  className = "",
  label,
  showPositiveSign = false,
  title,
  value,
  zeroTone = "positive",
}: FinancialValueProps) {
  const numericValue = typeof value === "number" ? value : Number(value);
  const isValid = Number.isFinite(numericValue);
  const tone = isValid ? moneyTone(numericValue, { zeroTone }) : "neutral";
  const display = isValid
    ? formatFinancialValue(numericValue, { showPositiveSign })
    : "Unavailable";
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [motion, setMotion] = useState<MoneyMotionDirection>("none");
  const previousValueRef = useRef<number | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => setPrefersReducedMotion(mediaQuery.matches);
    syncReducedMotion();
    mediaQuery.addEventListener("change", syncReducedMotion);
    return () => mediaQuery.removeEventListener("change", syncReducedMotion);
  }, []);

  useEffect(() => {
    if (!isValid || !animate) {
      previousValueRef.current = isValid ? numericValue : null;
      return;
    }

    const direction = financialMotionDirection(
      previousValueRef.current,
      numericValue,
      prefersReducedMotion
    );
    previousValueRef.current = numericValue;
    if (direction === "none") return;

    setMotion(direction);
    const timeoutId = window.setTimeout(() => setMotion("none"), 320);
    return () => window.clearTimeout(timeoutId);
  }, [animate, isValid, numericValue, prefersReducedMotion]);

  const motionCharacters = useMemo(
    () => display.split("").map((character, index) => ({ character, key: `${display}-${index}` })),
    [display]
  );

  return (
    <span
      aria-label={label ? `${label}: ${display}` : undefined}
      className={`financial-value financial-value-${tone} financial-value-motion-${motion}${className ? ` ${className}` : ""}`}
      data-money-motion={motion}
      data-money-tone={tone}
      title={title}
    >
      <span aria-hidden="true" className="financial-value-visual">
        {motionCharacters.map(({ character, key }) => (
          <span className="financial-value-character" key={key}>
            {character}
          </span>
        ))}
      </span>
    </span>
  );
}
