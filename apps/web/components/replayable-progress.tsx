"use client";

import {
  useCallback, useEffect, useRef, useState,
  type CSSProperties, type ReactNode, type SVGProps,
} from "react";

import { useFinancialMotionPreference } from "@/components/financial-motion-preference";
import { useMotionReplayRegistration } from "@/components/motion-replay-group";

function clampPercent(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function useReplayableProgress(valueKey: number | string) {
  const { durationMs, enabled, ready, staggerMs } = useFinancialMotionPreference();
  const [reduced, setReduced] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [replaying, setReplaying] = useState(false);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const allowed = ready && enabled && !reduced;
  const chartDurationMs = durationMs + 500;

  const settle = useCallback(() => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    frameRef.current = null;
    timeoutRef.current = null;
    setReplaying(false);
  }, []);
  const replay = useCallback(() => {
    if (!allowed) return;
    settle();
    setCycle((value) => value + 1);
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        setReplaying(true);
      });
    });
    timeoutRef.current = window.setTimeout(settle, chartDurationMs + staggerMs * 5 + 400);
  }, [allowed, chartDurationMs, settle, staggerMs]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (allowed) replay();
      else settle();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [allowed, replay, settle, valueKey]);
  useEffect(() => settle, [settle]);
  useMotionReplayRegistration(replay, cycle);
  return { chartDurationMs, cycle, replaying, settle, staggerMs };
}

export function ReplayableProgressFill({
  className = "",
  minimum = "0",
  staggerIndex = 0,
  value,
}: {
  className?: string;
  minimum?: string;
  staggerIndex?: number;
  value: number;
}) {
  const motion = useReplayableProgress(value);
  const target = `max(${minimum}, ${clampPercent(value)}%)`;
  return (
    <span
      aria-hidden="true"
      className={`${className}${motion.replaying ? " is-progress-replaying" : ""}`}
      data-progress-motion={motion.replaying ? "running" : "settled"}
      data-progress-motion-cycle={motion.cycle}
      onAnimationEnd={motion.settle}
      style={{
        "--progress-motion-delay": `${staggerIndex * motion.staggerMs}ms`,
        "--progress-motion-duration": `${motion.chartDurationMs}ms`,
        "--progress-motion-target": target,
        width: target,
      } as CSSProperties}
    />
  );
}

export function ReplayableProgressRing({
  children,
  className = "",
  label,
  value,
}: {
  children?: ReactNode;
  className?: string;
  label: string;
  value: number;
}) {
  const motion = useReplayableProgress(value);
  return (
    <div
      aria-label={label}
      className={`${className}${motion.replaying ? " is-progress-replaying" : ""}`}
      data-progress-motion={motion.replaying ? "running" : "settled"}
      data-progress-motion-cycle={motion.cycle}
      onAnimationEnd={motion.settle}
      role="img"
      style={{
        "--progress-motion-duration": `${motion.chartDurationMs}ms`,
        "--progress-motion-target": `${clampPercent(value)}%`,
        "--progress-motion-visible": `${clampPercent(value)}%`,
      } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function ReplayableGraph({
  children,
  className = "",
  valueKey,
  ...props
}: SVGProps<SVGSVGElement> & { valueKey: string }) {
  const motion = useReplayableProgress(valueKey);
  return (
    <svg
      {...props}
      className={`${className}${motion.replaying ? " is-progress-replaying" : ""}`}
      data-chart-motion={motion.replaying ? "running" : "settled"}
      data-chart-motion-cycle={motion.cycle}
      style={{
        ...props.style,
        "--progress-motion-duration": `${motion.chartDurationMs}ms`,
      } as CSSProperties}
    >
      {children}
    </svg>
  );
}
