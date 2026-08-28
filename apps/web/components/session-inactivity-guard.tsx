"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import type { FundManagerSession } from "@/components/fund-manager-account-page";
import {
  inactivityRemainingMs,
  loadSessionSecurityPreference,
  SESSION_ACTIVITY_STORAGE_KEY,
  SESSION_LOGOUT_STORAGE_KEY,
  SESSION_SECURITY_PREFERENCE_EVENT,
  type SessionSecurityPreference,
} from "@/lib/session-inactivity";

const WARNING_WINDOW_MS = 60_000;
const ACTIVITY_WRITE_THROTTLE_MS = 5_000;

export function SessionInactivityGuard() {
  const [session, setSession] = useState<FundManagerSession | null>(null);
  const [preference, setPreference] = useState<SessionSecurityPreference | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const logoutStartedRef = useRef(false);
  const lastActivityWriteRef = useRef(0);

  const markActivity = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastActivityWriteRef.current < ACTIVITY_WRITE_THROTTLE_MS) return;
    lastActivityWriteRef.current = now;
    window.localStorage.setItem(SESSION_ACTIVITY_STORAGE_KEY, String(now));
    setWarningOpen(false);
  }, []);

  const logout = useCallback(async (reason: "expired" | "manual") => {
    if (logoutStartedRef.current) return;
    logoutStartedRef.current = true;
    try {
      await fetch("/api/auth/logout", { credentials: "include", method: "POST" });
    } finally {
      window.localStorage.setItem(SESSION_LOGOUT_STORAGE_KEY, String(Date.now()));
      window.location.replace(reason === "expired" ? "/login?error=session_expired" : "/login?signed_out=1");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/session", { cache: "no-store", credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("Session unavailable");
        return response.json() as Promise<FundManagerSession>;
      })
      .then((value) => {
        if (!active) return;
        setSession(value);
        setPreference(loadSessionSecurityPreference(value.email));
        if (!window.localStorage.getItem(SESSION_ACTIVITY_STORAGE_KEY)) markActivity(true);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [markActivity]);

  useEffect(() => {
    if (!session) return;
    const refreshPreference = () => setPreference(loadSessionSecurityPreference(session.email));
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SESSION_LOGOUT_STORAGE_KEY && event.newValue) {
        window.location.replace("/login?error=session_expired");
        return;
      }
      if (event.key === SESSION_ACTIVITY_STORAGE_KEY) setWarningOpen(false);
      if (event.key === `pd-session-security:${session.email.toLocaleLowerCase()}`) {
        refreshPreference();
      }
    };
    window.addEventListener(SESSION_SECURITY_PREFERENCE_EVENT, refreshPreference);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(SESSION_SECURITY_PREFERENCE_EVENT, refreshPreference);
      window.removeEventListener("storage", handleStorage);
    };
  }, [session]);

  useEffect(() => {
    if (!session || !preference?.autoLogoutEnabled) {
      return;
    }

    const recordActivity = () => markActivity();
    const checkExpiry = () => {
      const now = Date.now();
      const lastActivityAt = Number(
        window.localStorage.getItem(SESSION_ACTIVITY_STORAGE_KEY) ?? now
      );
      const remaining = Math.min(
        inactivityRemainingMs({
          lastActivityAt: Number.isFinite(lastActivityAt) ? lastActivityAt : now,
          now,
          timeoutMinutes: preference.timeoutMinutes,
        }),
        session.expires_at * 1000 - now
      );
      if (remaining <= 0) {
        void logout("expired");
      } else {
        setWarningOpen(remaining <= WARNING_WINDOW_MS);
      }
    };

    for (const eventName of ["keydown", "pointerdown", "touchstart", "focus"] as const) {
      window.addEventListener(eventName, recordActivity, { passive: true });
    }
    const interval = window.setInterval(checkExpiry, 1_000);
    checkExpiry();
    return () => {
      window.clearInterval(interval);
      for (const eventName of ["keydown", "pointerdown", "touchstart", "focus"] as const) {
        window.removeEventListener(eventName, recordActivity);
      }
    };
  }, [logout, markActivity, preference, session]);

  return (
    <ConfirmationDialog
      busyLabel="Signing out"
      cancelLabel="Stay signed in"
      confirmLabel="Sign out"
      description="Continue now to keep this session active."
      onCancel={() => markActivity(true)}
      onConfirm={() => void logout("manual")}
      open={Boolean(session && preference?.autoLogoutEnabled && warningOpen)}
      title="Your session is about to expire"
    />
  );
}
