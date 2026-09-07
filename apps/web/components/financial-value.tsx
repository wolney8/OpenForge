"use client";

import {
  Children, cloneElement, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type AnimationEvent, type CSSProperties, type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent, type ReactElement,
} from "react";
import { useFinancialMotionPreference } from "@/components/financial-motion-preference";
import {
  financialMotionDirection, formatFinancialValue, moneyTone, type MoneyMotionDirection,
} from "@/lib/financial-display";

type ReplayRegistration = (direction?: Exclude<MoneyMotionDirection, "none">) => void;
type ReplayGroupContextValue = { register: (replay: ReplayRegistration) => () => void };
const FinancialValueReplayContext = createContext<ReplayGroupContextValue | null>(null);
const replayHandledKey = Symbol("financial-value-replay-handled");

type ReplayGroupChildProps = {
  onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
  onPointerEnter?: (event: ReactPointerEvent<HTMLElement>) => void;
};

export function FinancialValueReplayGroup({ children }: { children: ReactElement<ReplayGroupChildProps> }) {
  const [members] = useState(() => new Set<ReplayRegistration>());
  const register = useCallback((replay: ReplayRegistration) => {
    members.add(replay);
    return () => { members.delete(replay); };
  }, [members]);
  const replayAll = useCallback((event: ReactMouseEvent<HTMLElement> | ReactPointerEvent<HTMLElement>) => {
    const nativeEvent = event.nativeEvent as Event & { [replayHandledKey]?: boolean };
    if (nativeEvent[replayHandledKey]) return;
    nativeEvent[replayHandledKey] = true;
    members.forEach((replay) => replay());
  }, [members]);
  const onlyChild = Children.only(children);

  return (
    <FinancialValueReplayContext.Provider value={{ register }}>
      {cloneElement(onlyChild, {
        onClick: (event) => {
          onlyChild.props.onClick?.(event);
          if (!event.defaultPrevented) replayAll(event);
        },
        onPointerEnter: (event) => {
          onlyChild.props.onPointerEnter?.(event);
          if (!event.defaultPrevented) replayAll(event);
        },
      })}
    </FinancialValueReplayContext.Provider>
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
  const { enabled: preferenceEnabled, ready: preferenceReady } = useFinancialMotionPreference();
  const group = useContext(FinancialValueReplayContext);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [motion, setMotion] = useState<MoneyMotionDirection>("none");
  const [motionCycle, setMotionCycle] = useState(0);
  const previousValueRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const motionCycleRef = useRef(0);
  const motionAllowed = animate && preferenceReady && preferenceEnabled && !prefersReducedMotion;

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
    const cycle = motionCycleRef.current + 1;
    motionCycleRef.current = cycle;
    setMotionCycle(cycle);
    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null;
        if (cycle === motionCycleRef.current) setMotion(direction);
      });
    });
    timeoutRef.current = window.setTimeout(() => settleMotion(cycle), 1_250);
  }, [isValid, motionAllowed, numericValue, settleMotion]);

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
      ? previousValueRef.current === 0 ? "none" : "up"
      : financialMotionDirection(previousValueRef.current, numericValue, false);
    previousValueRef.current = numericValue;
    if (direction === "none") {
      settleMotion();
      return;
    }
    startMotion(direction);
  }, [isValid, motionAllowed, numericValue, preferenceEnabled, preferenceReady, prefersReducedMotion, settleMotion, startMotion]);

  useEffect(() => group?.register(startMotion), [group, startMotion]);
  useEffect(() => () => settleMotion(), [settleMotion]);

  const motionCharacters = useMemo(
    () => display.split("").map((character, index) => ({ character, key: `${index}-${character}` })),
    [display]
  );
  const movingCharacterCount = motionCharacters.filter(
    ({ character }) => /^\d$/.test(character) || (character === "-" && numericValue === 0)
  ).length;

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
      onClick={group ? undefined : () => startMotion()}
      onPointerEnter={group ? undefined : () => startMotion()}
      title={title}
    >
      <span aria-hidden="true" className="financial-value-visual">
        {motionCharacters.map(({ character, key }, characterIndex) => {
          const isDigit = /^\d$/.test(character);
          const isPlaceholder = character === "-" && numericValue === 0;
          if (!isDigit && !isPlaceholder) {
            return <span className="financial-value-character" key={key}>{character}</span>;
          }
          const digitIndex = motionCharacters.slice(0, characterIndex).filter(
            (entry) => /^\d$/.test(entry.character) || (entry.character === "-" && numericValue === 0)
          ).length;
          const numericDigit = isDigit ? Number(character) : 0;
          return (
            <span
              className={`financial-value-digit-window${isPlaceholder ? " financial-value-placeholder-window" : ""}`}
              key={`${key}-${motionCycle}`}
              style={{
                "--financial-digit-index": digitIndex,
                "--financial-digit-position": isPlaceholder ? "-1lh" : `${-(numericDigit + 1)}lh`,
                "--financial-digit-up-start": isPlaceholder ? "-2lh" : `${-(numericDigit + 2)}lh`,
                "--financial-digit-down-start": isPlaceholder ? "0lh" : `${-numericDigit}lh`,
              } as CSSProperties}
            >
              <span
                className="financial-value-digit-strip"
                data-financial-motion-order={digitIndex}
                onAnimationEnd={onAnimationEnd}
              >
                {(isPlaceholder ? ["−", "-", "−"] : [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]).map((digit, index) => (
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
