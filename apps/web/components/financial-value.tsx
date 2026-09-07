"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
  tone?: "auto" | "neutral";
  title?: string;
  value: number | string;
  zeroTone?: "positive" | "neutral";
};

export function FinancialValue({
  animate = true,
  className = "",
  label,
  showPositiveSign = false,
  tone: tonePreference = "auto",
  title,
  value,
  zeroTone = "neutral",
}: FinancialValueProps) {
  const numericValue = typeof value === "number" ? value : Number(value);
  const isValid = Number.isFinite(numericValue);
  const tone = isValid
    ? tonePreference === "neutral"
      ? "neutral"
      : moneyTone(numericValue, { zeroTone })
    : "neutral";
  const display = isValid
    ? formatFinancialValue(numericValue, { showPositiveSign })
    : "Unavailable";
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [motion, setMotion] = useState<MoneyMotionDirection>("none");
  const [motionCycle, setMotionCycle] = useState(0);
  const previousValueRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const startMotion = useCallback((direction: Exclude<MoneyMotionDirection, "none">) => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    setMotion("none");
    setMotionCycle((current) => current + 1);
    window.requestAnimationFrame(() => setMotion(direction));
    timeoutRef.current = window.setTimeout(() => {
      setMotion("none");
      timeoutRef.current = null;
    }, 900);
  }, []);

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
    if (direction === "none") {
      setMotion("none");
      return;
    }

    startMotion(direction);
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, [animate, isValid, numericValue, prefersReducedMotion, startMotion]);

  const motionCharacters = useMemo(
    () => display.split("").map((character, index) => ({ character, key: `${index}-${character}` })),
    [display]
  );

  return (
    <span
      aria-label={label ? `${label}: ${display}` : display}
      className={`financial-value financial-value-${tone} financial-value-motion-${motion}${className ? ` ${className}` : ""}`}
      data-money-motion={motion}
      data-money-motion-cycle={motionCycle}
      data-money-tone={tone}
      onClick={() => {
        if (!animate || !isValid || numericValue === 0 || prefersReducedMotion) return;
        startMotion(numericValue > 0 ? "up" : "down");
      }}
      title={title}
    >
      <span aria-hidden="true" className="financial-value-visual">
        {motionCharacters.map(({ character, key }, characterIndex) => {
          if (!/^\d$/.test(character)) {
            return <span className="financial-value-character" key={key}>{character}</span>;
          }
          const digitIndex = motionCharacters
            .slice(0, characterIndex)
            .filter((entry) => /^\d$/.test(entry.character)).length;
          return (
            <span
              className="financial-value-digit-window"
              key={`${key}-${motionCycle}`}
              style={{
                "--financial-digit-index": digitIndex,
                "--financial-digit-position": `${-(Number(character) + 1)}lh`,
                "--financial-digit-up-start": `${-(Number(character) + 2)}lh`,
                "--financial-digit-down-start": `${-Number(character)}lh`,
              } as CSSProperties}
            >
              <span className="financial-value-digit-strip">
                {[9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit, index) => (
                  <span key={`${digit}-${index}`}>{digit}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
