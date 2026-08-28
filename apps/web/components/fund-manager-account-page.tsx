"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DEFAULT_SESSION_SECURITY_PREFERENCE,
  loadSessionSecurityPreference,
  saveSessionSecurityPreference,
  SESSION_LOGOUT_STORAGE_KEY,
  SESSION_TIMEOUT_OPTIONS,
  type SessionSecurityPreference,
  type SessionTimeoutMinutes,
} from "@/lib/session-inactivity";
import { COOKIE_NOTICE_OPEN_EVENT } from "@/lib/storage-consent";

export type FundManagerSession = {
  authenticated: true;
  email: string;
  expires_at: number;
  name: string;
  role: "fund_manager";
};

export function FundManagerAccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<FundManagerSession | null>(null);
  const [failed, setFailed] = useState(false);
  const [preference, setPreference] = useState<SessionSecurityPreference>(
    DEFAULT_SESSION_SECURITY_PREFERENCE
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/session", { cache: "no-store", credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("Session unavailable");
        return response.json() as Promise<FundManagerSession>;
      })
      .then((value) => {
        if (active) {
          setSession(value);
          setPreference(loadSessionSecurityPreference(value.email));
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  function updatePreference(next: SessionSecurityPreference) {
    setPreference(next);
    if (session) saveSessionSecurityPreference(session.email, next);
  }

  async function logout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { credentials: "include", method: "POST" });
    } finally {
      window.localStorage.setItem(SESSION_LOGOUT_STORAGE_KEY, String(Date.now()));
      router.replace("/login?signed_out=1");
    }
  }

  return (
    <main className="page-shell stack">
      <section className="hero-panel stack">
        <span className="eyebrow">Fund Manager</span>
        <h1>My Account</h1>
      </section>
      <section className="content-panel stack" data-pd-id="fund-manager-account.identity">
        <div className="section-heading-row">
          <div>
            <span className="eyebrow">Google Identity</span>
            <h2>Account Details</h2>
          </div>
          <span className="table-chip table-chip-info">Fund Manager</span>
        </div>
        {failed ? <p className="error-text" role="alert">Account details could not be loaded.</p> : null}
        {!failed && !session ? <p className="field-hint" role="status">Loading account details...</p> : null}
        {session ? (
          <dl className="fund-manager-account-details">
            <div><dt>Display Name</dt><dd>{session.name}</dd></div>
            <div><dt>Email</dt><dd>{session.email}</dd></div>
            <div><dt>Role</dt><dd>Fund Manager</dd></div>
            <div><dt>Identity Provider</dt><dd>Google OAuth</dd></div>
          </dl>
        ) : null}
      </section>
      <section className="content-panel stack" data-pd-id="fund-manager-account.security">
        <div>
          <span className="eyebrow">Security</span>
          <h2>Access</h2>
        </div>
        {session ? (
          <div className="stack fund-manager-security-controls">
            <div className="profile-future-setting-row">
              <span>Current session</span>
              <span className="table-chip table-chip-status-placed">
                Active until {new Date(session.expires_at * 1000).toLocaleString("en-GB")}
              </span>
            </div>
            <div className="profile-future-setting-row">
              <span>
                <strong>Auto Logout</strong>
                <small>End this session after a period without activity.</small>
              </span>
              <button
                aria-pressed={preference.autoLogoutEnabled}
                className={`material-switch${preference.autoLogoutEnabled ? " is-selected" : ""}`}
                data-pd-id="fund-manager-account.auto-logout"
                onClick={() => updatePreference({ ...preference, autoLogoutEnabled: !preference.autoLogoutEnabled })}
                type="button"
              >
                <span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span>
                <span>{preference.autoLogoutEnabled ? "On" : "Off"}</span>
              </button>
            </div>
            {preference.autoLogoutEnabled ? (
              <label className="field-control fund-manager-timeout-field">
                <span>Inactivity period</span>
                <select
                  data-pd-id="fund-manager-account.auto-logout-timeout"
                  onChange={(event) => updatePreference({
                    ...preference,
                    timeoutMinutes: Number(event.target.value) as SessionTimeoutMinutes,
                  })}
                  value={preference.timeoutMinutes}
                >
                  {SESSION_TIMEOUT_OPTIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} minutes` : `${minutes / 60} ${minutes === 60 ? "hour" : "hours"}`}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <footer className="settings-action-row">
              <button
                className="button-link"
                data-pd-id="fund-manager-account.cookie-information"
                onClick={() => window.dispatchEvent(new Event(COOKIE_NOTICE_OPEN_EVENT))}
                type="button"
              >
                Cookie information
              </button>
              <button
                className="button-link destructive-action"
                data-pd-id="fund-manager-account.logout"
                disabled={isLoggingOut}
                onClick={() => void logout()}
                type="button"
              >
                <span aria-hidden="true" className="material-symbols-outlined">logout</span>
                <span>{isLoggingOut ? "Signing out..." : "Logout"}</span>
              </button>
            </footer>
          </div>
        ) : null}
        <p className="field-hint">Additional security controls will appear here when they are available.</p>
      </section>
    </main>
  );
}
