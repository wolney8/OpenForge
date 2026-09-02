"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import type { FundManagerSession } from "@/components/fund-manager-account-page";
import {
  DEFAULT_SESSION_SECURITY_PREFERENCE,
  loadSessionSecurityPreference,
  MEANINGFUL_SESSION_ACTIVITY_EVENTS,
  persistSessionSecurityPreference,
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
  const resumeValidationRef = useRef<Promise<boolean> | null>(null);

  const expireClientSession = useCallback(() => {
    window.localStorage.setItem(SESSION_LOGOUT_STORAGE_KEY, String(Date.now()));
    window.location.replace("/login?error=session_expired");
  }, []);

  const validateResumedSession = useCallback(() => {
    if (resumeValidationRef.current) return resumeValidationRef.current;
    const validation = fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "include",
    }).then(async (response) => {
      if (response.status === 401) {
        expireClientSession();
        return false;
      }
      if (!response.ok) return false;
      const value = (await response.json()) as FundManagerSession;
      setSession(value);
      return true;
    }).catch(() => false).finally(() => {
      resumeValidationRef.current = null;
    });
    resumeValidationRef.current = validation;
    return validation;
  }, [expireClientSession]);

  const markActivity = useCallback((force = false) => {
    if (document.visibilityState !== "visible") return;
    const now = Date.now();
    if (!force && now - lastActivityWriteRef.current < ACTIVITY_WRITE_THROTTLE_MS) return;
    lastActivityWriteRef.current = now;
    window.localStorage.setItem(SESSION_ACTIVITY_STORAGE_KEY, String(now));
    setWarningOpen(false);
    void fetch("/api/auth/activity", {
      credentials: "include",
      method: "POST",
    }).then(async (response) => {
      if (response.status === 401) {
        expireClientSession();
        return;
      }
      if (!response.ok) return;
      const payload = (await response.json()) as {
        session_policy?: FundManagerSession["session_policy"];
      };
      if (!payload.session_policy) return;
      setSession((current) => current ? { ...current, session_policy: payload.session_policy } : current);
    }).catch(() => undefined);
  }, [expireClientSession]);

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
        if (!response.ok) {
          if (
            response.status === 401 &&
            !["localhost", "127.0.0.1"].includes(window.location.hostname)
          ) {
            window.location.replace("/login?error=session_expired");
          }
          throw new Error("Session unavailable");
        }
        return response.json() as Promise<FundManagerSession>;
      })
      .then(async (value) => {
        if (!active) return;
        setSession(value);
        const policy = value.session_policy;
        let resolved = policy?.preference_configured
          ? {
              autoLogoutEnabled: policy.auto_logout_enabled,
              timeoutMinutes: policy.timeout_minutes as SessionSecurityPreference["timeoutMinutes"],
            }
          : loadSessionSecurityPreference(value.email);
        if (!policy?.preference_configured) {
          const saved = await persistSessionSecurityPreference(resolved);
          if (!active) return;
          if (!saved) resolved = DEFAULT_SESSION_SECURITY_PREFERENCE;
        }
        setPreference(resolved);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const validateOnFocus = () => {
      void validateResumedSession();
    };
    const validateOnVisibility = () => {
      if (document.visibilityState === "visible") void validateResumedSession();
    };
    window.addEventListener("focus", validateOnFocus);
    window.addEventListener("pageshow", validateOnFocus);
    document.addEventListener("visibilitychange", validateOnVisibility);
    return () => {
      window.removeEventListener("focus", validateOnFocus);
      window.removeEventListener("pageshow", validateOnFocus);
      document.removeEventListener("visibilitychange", validateOnVisibility);
    };
  }, [session, validateResumedSession]);

  useEffect(() => {
    if (!session) return;
    const refreshPreference = () => setPreference(loadSessionSecurityPreference(session.email));
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SESSION_LOGOUT_STORAGE_KEY && event.newValue) {
        window.location.replace("/login?error=session_expired");
        return;
      }
      if (event.key === SESSION_ACTIVITY_STORAGE_KEY) {
        setWarningOpen(false);
        void fetch("/api/auth/session", { cache: "no-store", credentials: "include" })
          .then((response) => response.ok ? response.json() as Promise<FundManagerSession> : null)
          .then((value) => { if (value) setSession(value); })
          .catch(() => undefined);
      }
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
      const remaining =
        (session.session_policy?.effective_expires_at ?? session.expires_at) * 1000 - now;
      if (remaining <= 0) {
        void logout("expired");
      } else {
        setWarningOpen(remaining <= WARNING_WINDOW_MS);
      }
    };

    for (const eventName of MEANINGFUL_SESSION_ACTIVITY_EVENTS) {
      window.addEventListener(eventName, recordActivity, { passive: true });
    }
    const interval = window.setInterval(checkExpiry, 1_000);
    checkExpiry();
    return () => {
      window.clearInterval(interval);
      for (const eventName of MEANINGFUL_SESSION_ACTIVITY_EVENTS) {
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
