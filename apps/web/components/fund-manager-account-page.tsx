"use client";

import { useEffect, useState } from "react";

export type FundManagerSession = {
  authenticated: true;
  email: string;
  expires_at: number;
  name: string;
  role: "fund_manager";
};

export function FundManagerAccountPage() {
  const [session, setSession] = useState<FundManagerSession | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/session", { cache: "no-store", credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("Session unavailable");
        return response.json() as Promise<FundManagerSession>;
      })
      .then((value) => {
        if (active) setSession(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

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
        <p className="field-hint">
          Google controls your name and email. Additional account and security controls will appear here as they become available.
        </p>
        {session ? (
          <div className="profile-future-setting-row">
            <span>Current session</span>
            <span className="table-chip table-chip-status-placed">
              Active until {new Date(session.expires_at * 1000).toLocaleString("en-GB")}
            </span>
          </div>
        ) : null}
      </section>
    </main>
  );
}
