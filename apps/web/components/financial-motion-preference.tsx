"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { apiBaseUrl } from "@/lib/api";

export type FinancialMotionPreference = {
  enabled: boolean;
  replayDelayMs: number;
  durationMs: number;
  staggerMs: number;
};

type FinancialMotionPreferenceUpdate = Partial<FinancialMotionPreference>;

type FinancialMotionPreferenceContextValue = {
  durationMs: number;
  enabled: boolean;
  ready: boolean;
  replayDelayMs: number;
  save: (update: FinancialMotionPreferenceUpdate) => Promise<boolean>;
  saving: boolean;
  staggerMs: number;
};

const FinancialMotionPreferenceContext = createContext<FinancialMotionPreferenceContextValue>({
  durationMs: 520,
  enabled: true,
  ready: true,
  replayDelayMs: 1500,
  save: async () => false,
  saving: false,
  staggerMs: 80,
});

function fromApi(payload: {
  duration_ms?: number;
  enabled: boolean;
  replay_delay_ms?: number;
  stagger_ms?: number;
}): FinancialMotionPreference {
  return {
    durationMs: payload.duration_ms ?? 520,
    enabled: payload.enabled,
    replayDelayMs: payload.replay_delay_ms ?? 1500,
    staggerMs: payload.stagger_ms ?? 80,
  };
}

export function FinancialMotionPreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<FinancialMotionPreference>({
    durationMs: 520,
    enabled: true,
    replayDelayMs: 1500,
    staggerMs: 80,
  });
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    void fetch(`${apiBaseUrl}/fund-manager/preferences/financial-motion`, {
      cache: "no-store",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Financial motion preference is unavailable.");
        return response.json() as Promise<{
          duration_ms: number;
          enabled: boolean;
          replay_delay_ms: number;
          stagger_ms: number;
        }>;
      })
      .then((payload) => {
        if (!active) return;
        setPreference(fromApi(payload));
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  const save = useCallback(async (update: FinancialMotionPreferenceUpdate) => {
    if (savingRef.current) return false;
    const previous = preference;
    const next = { ...previous, ...update };
    savingRef.current = true;
    setPreference(next);
    setSaving(true);
    try {
      const response = await fetch(`${apiBaseUrl}/fund-manager/preferences/financial-motion`, {
        body: JSON.stringify({
          duration_ms: next.durationMs,
          enabled: next.enabled,
          replay_delay_ms: next.replayDelayMs,
          stagger_ms: next.staggerMs,
        }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      if (!response.ok) throw new Error("Financial motion preference could not be saved.");
      const payload = await response.json() as {
        duration_ms: number;
        enabled: boolean;
        replay_delay_ms: number;
        stagger_ms: number;
      };
      const saved = fromApi(payload);
      setPreference(saved);
      return Object.entries(update).every(([key, value]) => saved[key as keyof FinancialMotionPreference] === value);
    } catch {
      setPreference(previous);
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [preference]);

  const value = useMemo(
    () => ({ ...preference, ready, save, saving }),
    [preference, ready, save, saving]
  );
  return (
    <FinancialMotionPreferenceContext.Provider value={value}>
      {children}
    </FinancialMotionPreferenceContext.Provider>
  );
}

export function useFinancialMotionPreference() {
  return useContext(FinancialMotionPreferenceContext);
}
