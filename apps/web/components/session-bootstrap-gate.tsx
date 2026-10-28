"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import type { FundManagerSession } from "@/components/fund-manager-account-page";
import { clearAuthenticatedSessionState } from "@/lib/authenticated-session-state";

type BootstrapState =
  | { status: "checking"; session: null; error: "" }
  | { status: "ready"; session: FundManagerSession; error: "" }
  | { status: "error"; session: null; error: string };

const AuthoritativeSessionContext = createContext<FundManagerSession | null>(null);
let inFlightBootstrapRequest: Promise<FundManagerSession | null> | null = null;

function requestAuthoritativeSession(): Promise<FundManagerSession | null> {
  if (inFlightBootstrapRequest) return inFlightBootstrapRequest;
  inFlightBootstrapRequest = fetch("/api/auth/session", {
    cache: "no-store",
    credentials: "include",
  }).then(async (response) => {
    if (response.status === 401) {
      clearAuthenticatedSessionState();
      window.location.replace("/login?error=session_expired");
      return null;
    }
    if (!response.ok) throw new Error("The session service did not respond successfully.");
    return response.json() as Promise<FundManagerSession>;
  }).finally(() => {
    inFlightBootstrapRequest = null;
  });
  return inFlightBootstrapRequest;
}

export function useAuthoritativeSession(): FundManagerSession | null {
  return useContext(AuthoritativeSessionContext);
}

export function SessionBootstrapGate({
  children,
}: {
  children: (session: FundManagerSession) => React.ReactNode;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [showChecking, setShowChecking] = useState(false);
  const [state, setState] = useState<BootstrapState>({
    status: "checking",
    session: null,
    error: "",
  });

  useEffect(() => {
    let active = true;
    const fallbackTimer = window.setTimeout(() => {
      if (active) setShowChecking(true);
    }, 250);
    void requestAuthoritativeSession()
      .then((session) => {
        if (active && session) setState({ status: "ready", session, error: "" });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          session: null,
          error: error instanceof Error ? error.message : "Unable to verify this session.",
        });
      });
    return () => {
      active = false;
      window.clearTimeout(fallbackTimer);
    };
  }, [attempt]);

  if (state.status === "ready") {
    return (
      <AuthoritativeSessionContext.Provider value={state.session}>
        {children(state.session)}
      </AuthoritativeSessionContext.Provider>
    );
  }

  return (
    <main
      aria-busy={state.status === "checking" || undefined}
      className="main-shell session-bootstrap-shell"
      data-pd-id="session.bootstrap"
      id="main-content"
    >
      <section
        className={`hero-panel stack session-bootstrap-panel${state.status === "checking" && !showChecking ? " is-delayed" : ""}`}
        data-pd-id="session.bootstrap.panel"
      >
        {state.status === "checking" ? (
          showChecking ? (
            <>
              <div className="session-bootstrap-brand">
                <span className="brand-mark"><BrandLogo priority variant="mark" /></span>
                <strong>Plum Duff</strong>
              </div>
              <LedgerLoadingIndicator label="Checking session…" />
            </>
          ) : (
            <span aria-live="polite" className="sr-only" role="status">Checking session…</span>
          )
        ) : (
          <>
            <div className="session-bootstrap-brand">
              <span className="brand-mark"><BrandLogo priority variant="mark" /></span>
              <strong>Plum Duff</strong>
            </div>
            <span className="eyebrow">Session</span>
            <h1>We couldn&apos;t validate your session</h1>
            <p className="error-text">Your session may still be valid. Try again or sign in again.</p>
            <div className="tracker-nav tracker-nav-right">
              <button className="button-link" onClick={() => {
                setShowChecking(false);
                setState({ status: "checking", session: null, error: "" });
                setAttempt((value) => value + 1);
              }} type="button">
                Try again
              </button>
              <button className="button-link" onClick={() => {
                const next = `${window.location.pathname}${window.location.search}`;
                router.push(`/login?error=session_validation_unavailable&next=${encodeURIComponent(next)}`);
              }} type="button">
                Sign in again
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
