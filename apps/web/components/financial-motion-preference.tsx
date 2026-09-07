"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { apiBaseUrl } from "@/lib/api";

type FinancialMotionPreferenceContextValue = {
  enabled: boolean;
  ready: boolean;
  save: (enabled: boolean) => Promise<boolean>;
};

const FinancialMotionPreferenceContext = createContext<FinancialMotionPreferenceContextValue>({
  enabled: true,
  ready: true,
  save: async () => false,
});

export function FinancialMotionPreferenceProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`${apiBaseUrl}/fund-manager/preferences/financial-motion`, {
      cache: "no-store",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Financial motion preference is unavailable.");
        return response.json() as Promise<{ enabled: boolean }>;
      })
      .then((payload) => {
        if (!active) return;
        setEnabled(payload.enabled);
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  const save = useCallback(async (next: boolean) => {
    const response = await fetch(`${apiBaseUrl}/fund-manager/preferences/financial-motion`, {
      body: JSON.stringify({ enabled: next }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    if (!response.ok) return false;
    const payload = await response.json() as { enabled: boolean };
    setEnabled(payload.enabled);
    return payload.enabled === next;
  }, []);

  const value = useMemo(() => ({ enabled, ready, save }), [enabled, ready, save]);
  return (
    <FinancialMotionPreferenceContext.Provider value={value}>
      {children}
    </FinancialMotionPreferenceContext.Provider>
  );
}

export function useFinancialMotionPreference() {
  return useContext(FinancialMotionPreferenceContext);
}
