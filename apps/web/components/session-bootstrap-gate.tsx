"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import type { FundManagerSession } from "@/components/fund-manager-account-page";

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
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<BootstrapState>({
    status: "checking",
    session: null,
    error: "",
  });

  useEffect(() => {
    let active = true;
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
      <section className="content-panel stack-tight" role="status">
        {state.status === "checking" ? (
          <LedgerLoadingIndicator label="Checking session…" />
        ) : (
          <>
            <span className="eyebrow">Session</span>
            <h1>Unable to verify session</h1>
            <p className="error-text">{state.error}</p>
            <div className="tracker-nav tracker-nav-right">
              <button className="button-link" onClick={() => {
                setState({ status: "checking", session: null, error: "" });
                setAttempt((value) => value + 1);
              }} type="button">
                Try again
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
