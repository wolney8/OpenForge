"use client";

import {
  useCallback, useEffect, useMemo, useRef, useState,
  type AnimationEvent, type CSSProperties, type ComponentPropsWithoutRef,
} from "react";
import { useFinancialMotionPreference } from "@/components/financial-motion-preference";
import { MotionReplayGroup, useMotionReplayRegistration } from "@/components/motion-replay-group";
import {
  financialMotionDirection, formatFinancialValue, moneyTone, type MoneyMotionDirection,
} from "@/lib/financial-display";

export const FinancialValueReplayGroup = MotionReplayGroup;

export function FinancialValueReplayRow(props: ComponentPropsWithoutRef<"tr">) {
  return (
    <FinancialValueReplayGroup>
      <tr {...props} />
    </FinancialValueReplayGroup>
  );
}

type FinancialValueProps = {
  animate?: boolean;
  className?: string;
  label?: string;
  showPositiveSign?: boolean;
  tone?: "auto" | "inherit" | "neutral";
  title?: string;
  value: number | string;
  zeroTone?: "positive" | "neutral";
};

export function FinancialValue({
  animate = true, className = "", label, showPositiveSign = false,
  tone: tonePreference = "auto", title, value, zeroTone = "neutral",
}: FinancialValueProps) {
  const numericValue = typeof value === "number" ? value : Number(value);
  const isValid = Number.isFinite(numericValue);
  const tone = isValid
    ? tonePreference === "auto" ? moneyTone(numericValue, { zeroTone }) : tonePreference
    : "neutral";
  const display = isValid ? formatFinancialValue(numericValue, { showPositiveSign }) : "Unavailable";
  const {
    durationMs, enabled: preferenceEnabled, ready: preferenceReady, replayDelayMs, staggerMs,
  } = useFinancialMotionPreference();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [motion, setMotion] = useState<MoneyMotionDirection>("none");
  const [motionCycle, setMotionCycle] = useState(0);
  const previousValueRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const motionCycleRef = useRef(0);
  const replayBlockedUntilRef = useRef(0);
  const motionAllowed = animate && preferenceReady && preferenceEnabled && !prefersReducedMotion && numericValue !== 0;
  const motionCharacters = useMemo(
    () => display.split("").map((character, index) => ({ character, key: `${index}-${character}` })),
    [display]
  );
  const movingCharacterCount = motionCharacters.filter(({ character }) => /^\d$/.test(character)).length;

  const settleMotion = useCallback((cycle?: number) => {
    if (cycle !== undefined && cycle !== motionCycleRef.current) return;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
    timeoutRef.current = null;
    animationFrameRef.current = null;
    setMotion("none");
  }, []);

  const startMotion = useCallback((requestedDirection?: Exclude<MoneyMotionDirection, "none">) => {
    if (!motionAllowed || !isValid) return;
    settleMotion();
    const direction = requestedDirection ?? (numericValue < 0 ? "down" : "up");
    replayBlockedUntilRef.current = performance.now() + replayDelayMs;
    const cycle = motionCycleRef.current + 1;
    motionCycleRef.current = cycle;
    setMotionCycle(cycle);
    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null;
        if (cycle === motionCycleRef.current) setMotion(direction);
      });
    });
    const finalDigitDelay = Math.max(0, movingCharacterCount - 1) * staggerMs;
    timeoutRef.current = window.setTimeout(
      () => settleMotion(cycle),
      durationMs + finalDigitDelay + 400
    );
  }, [durationMs, isValid, motionAllowed, movingCharacterCount, numericValue, replayDelayMs, settleMotion, staggerMs]);

  const requestReplay = useCallback(() => {
    if (performance.now() < replayBlockedUntilRef.current) return;
    startMotion();
  }, [startMotion]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => setPrefersReducedMotion(mediaQuery.matches);
    syncReducedMotion();
    mediaQuery.addEventListener("change", syncReducedMotion);
    return () => mediaQuery.removeEventListener("change", syncReducedMotion);
  }, []);

  useEffect(() => {
    if (!motionAllowed || !isValid) {
      settleMotion();
      previousValueRef.current = !preferenceReady || !preferenceEnabled || prefersReducedMotion
        ? null : isValid ? numericValue : null;
      return;
    }
    const direction = numericValue === 0
      ? "none"
      : financialMotionDirection(previousValueRef.current, numericValue, false);
    previousValueRef.current = numericValue;
    if (direction === "none") {
      settleMotion();
      return;
    }
    startMotion(direction);
  }, [isValid, motionAllowed, numericValue, preferenceEnabled, preferenceReady, prefersReducedMotion, settleMotion, startMotion]);

  const grouped = useMotionReplayRegistration(startMotion);
  useEffect(() => () => settleMotion(), [settleMotion]);

  function onAnimationEnd(event: AnimationEvent<HTMLSpanElement>) {
    const order = Number((event.target as HTMLElement).dataset.financialMotionOrder);
    if (Number.isFinite(order) && order === movingCharacterCount - 1) settleMotion(motionCycle);
  }

  return (
    <span
      aria-label={label ? `${label}: ${display}` : display}
      className={`financial-value financial-value-${tone} financial-value-motion-${motion}${className ? ` ${className}` : ""}`}
      data-money-motion={motion}
      data-money-motion-cycle={motionCycle}
      data-money-tone={tone}
      onClick={grouped ? undefined : requestReplay}
      onPointerEnter={grouped ? undefined : requestReplay}
      style={{
        "--financial-motion-duration": `${durationMs}ms`,
        "--financial-motion-stagger": `${staggerMs}ms`,
      } as CSSProperties}
      title={title}
    >
      <span aria-hidden="true" className="financial-value-visual">
        {motionCharacters.map(({ character, key }, characterIndex) => {
          const isDigit = /^\d$/.test(character);
          if (!isDigit) {
            return <span className="financial-value-character" key={key}>{character}</span>;
          }
          const digitIndex = motionCharacters.slice(0, characterIndex).filter(
            (entry) => /^\d$/.test(entry.character)
          ).length;
          const numericDigit = Number(character);
          return (
            <span
              className="financial-value-digit-window"
              key={`${key}-${motionCycle}`}
              style={{
                "--financial-digit-index": digitIndex,
                "--financial-digit-position": `${-(numericDigit + 1)}lh`,
                "--financial-digit-up-start": "-1lh",
                "--financial-digit-down-start": "-11lh",
              } as CSSProperties}
            >
              <span
                className="financial-value-digit-strip"
                data-financial-motion-order={digitIndex}
                onAnimationEnd={onAnimationEnd}
              >
                {[9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit, index) => (
                  <span key={`${digit}-${index}`}>{digit}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span><span aria-hidden="true" className="financial-value-canonical-text">{display}</span>
    </span>
  );
}
