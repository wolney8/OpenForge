"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusToast } from "@/components/status-toast";
import { PersistedToggle } from "@/components/persisted-toggle";
import { useAuthoritativeSession } from "@/components/session-bootstrap-gate";
import {
  DEFAULT_SESSION_SECURITY_PREFERENCE,
  loadSessionSecurityPreference,
  persistSessionSecurityPreference,
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
  session_policy?: {
    absolute_expires_at: number;
    auto_logout_enabled: boolean;
    effective_expires_at: number;
    inactivity_expires_at: number | null;
    last_activity_at: number;
    preference_configured: boolean;
    timeout_minutes: number;
    valid_now: boolean;
  };
};

export function FundManagerAccountPage() {
  const router = useRouter();
  const authoritativeSession = useAuthoritativeSession();
  const [session, setSession] = useState<FundManagerSession | null>(authoritativeSession);
  const [failed, setFailed] = useState(false);
  const [preference, setPreference] = useState<SessionSecurityPreference>(
    DEFAULT_SESSION_SECURITY_PREFERENCE
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!authoritativeSession) return;
    let active = true;
    void (async () => {
        const value = authoritativeSession;
        if (active) {
          setSession(value);
          const legacyPreference = loadSessionSecurityPreference(value.email);
          const policy = value.session_policy;
          const resolved = policy?.preference_configured
            ? {
                autoLogoutEnabled: policy.auto_logout_enabled,
                timeoutMinutes: policy.timeout_minutes as SessionTimeoutMinutes,
              }
            : legacyPreference;
          if (!policy?.preference_configured) {
            const saved = await persistSessionSecurityPreference(resolved);
            if (!active) return;
            if (!saved) {
              setFailed(true);
              return;
            }
          }
          setPreference(resolved);
          saveSessionSecurityPreference(value.email, resolved);
        }
      })()
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [authoritativeSession]);

  async function updatePreference(next: SessionSecurityPreference): Promise<boolean> {
    if (!session || isSavingPreference) return false;
    setIsSavingPreference(true);
    try {
      const saved = await persistSessionSecurityPreference(next);
      if (!saved) {
        setStatusMessage("Security preference was not saved. Try again.");
        return false;
      }
      setPreference(next);
      saveSessionSecurityPreference(session.email, next);
      const sessionResponse = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "include",
      });
      if (!sessionResponse.ok) {
        setStatusMessage("Security preference was saved, but session status could not be refreshed.");
        return true;
      }
      const refreshedSession = (await sessionResponse.json()) as FundManagerSession;
      setSession(refreshedSession);
      setStatusMessage(
        next.autoLogoutEnabled
          ? `Auto Logout is on after ${next.timeoutMinutes} minutes of inactivity.`
          : "Auto Logout is off. The absolute session expiry still applies."
      );
      return true;
    } catch {
      setStatusMessage("Security preference was not saved. Try again.");
      return false;
    } finally {
      setIsSavingPreference(false);
    }
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
      <StatusToast message={statusMessage} onDismiss={() => setStatusMessage("")} />
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
            <div className="fund-manager-account-details fund-manager-security-details">
              <div>
                <span>
                  <strong>Current session</strong>
                  <small>
                    {session.session_policy?.auto_logout_enabled
                      ? `${session.session_policy.timeout_minutes} minute inactivity policy is active.`
                      : "Auto Logout is off; this is the absolute session expiry."}
                  </small>
                </span>
                <span className="table-chip table-chip-status-placed">
                  Active until {new Date(
                    (session.session_policy?.effective_expires_at ?? session.expires_at) * 1000
                  ).toLocaleString("en-GB")}
                </span>
              </div>
              <div>
                <span>
                <strong>Auto Logout</strong>
                <small>End this session after a period without activity.</small>
                </span>
                <PersistedToggle
                checked={preference.autoLogoutEnabled}
                dataPdId="fund-manager-account.auto-logout"
                disabled={isSavingPreference}
                label="Auto Logout"
                onChange={(autoLogoutEnabled) => updatePreference({ ...preference, autoLogoutEnabled })}
                />
              </div>
            </div>
            {preference.autoLogoutEnabled ? (
              <label className="field-control fund-manager-timeout-field">
                <span>Inactivity period</span>
                <select
                  data-pd-id="fund-manager-account.auto-logout-timeout"
                  disabled={isSavingPreference}
                  onChange={(event) => void updatePreference({
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
            <div className="fund-manager-account-details fund-manager-security-actions">
              <div>
                <span><strong>Cookie information</strong><small>Review storage used by Plum Duff.</small></span>
                <button className="button-link" data-pd-id="fund-manager-account.cookie-information" onClick={() => window.dispatchEvent(new Event(COOKIE_NOTICE_OPEN_EVENT))} type="button">View</button>
              </div>
              <div>
                <span><strong>Logout</strong><small>End the current Plum Duff session.</small></span>
                <button className="button-link destructive-action" data-pd-id="fund-manager-account.logout" disabled={isLoggingOut} onClick={() => void logout()} type="button">
                  <span aria-hidden="true" className="material-symbols-outlined">logout</span>
                  <span>{isLoggingOut ? "Signing out..." : "Logout"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <p className="field-hint">Additional security controls will appear here when they are available.</p>
      </section>
    </main>
  );
}
