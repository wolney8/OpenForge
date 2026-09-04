"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type KeyboardEvent } from "react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { FinancialValue } from "@/components/financial-value";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { useAuthoritativeSession } from "@/components/session-bootstrap-gate";
import { StatusToast } from "@/components/status-toast";
import { apiBaseUrl } from "@/lib/api";
import { invalidateCachedJson } from "@/lib/client-json-cache";
import { PROFILE_DIRECTORY_UPDATED_EVENT } from "@/lib/recent-profiles";

type ProfileRecord = {
  profile_id: string;
  display_name: string;
  profile_code: string;
  status: string;
  tracking_start_date: string;
  management_fee_percent: string;
  investment_fee_percent: string;
  current_cash_snapshot: string;
};

type AccountRecord = {
  account_id: string;
  current_balance: string;
  lifecycle_status?: string;
  status: string;
  type: "Bookie" | "Exchange" | "Bank";
};

type SessionRecord = {
  email: string;
  name: string;
  role: "fund_manager";
};

const sections = [
  { id: "overview", label: "Overview" },
  { id: "access", label: "Access / Subscriber" },
  { id: "financial", label: "Financial / Fees" },
  { id: "accounts", label: "Accounts" },
  { id: "security", label: "Security" },
  { id: "activity", label: "Activity / Audit" },
  { id: "lifecycle", label: "Lifecycle" },
] as const;

type SectionId = (typeof sections)[number]["id"];

function isSection(value: string): value is SectionId {
  return sections.some((section) => section.id === value);
}

function parseAmount(value: string) {
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function responseDetail(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    detail?: string | { msg?: string }[];
  } | null;
  if (Array.isArray(body?.detail)) {
    return body.detail.map((item) => item.msg).filter(Boolean).join(". ");
  }
  return body?.detail || `Request failed with status ${response.status}`;
}

export function FundManagerProfileManagement({ profileId }: { profileId: string }) {
  const router = useRouter();
  const authoritativeSession = useAuthoritativeSession();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [form, setForm] = useState<ProfileRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lifecycleConfirmation, setLifecycleConfirmation] = useState<"archive" | "restore" | "delete" | null>(null);

  useEffect(() => {
    const syncFromHash = () => {
      const value = window.location.hash.slice(1);
      if (isSection(value)) setActiveSection(value);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch(`${apiBaseUrl}/profiles/${profileId}`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/profiles/${profileId}/accounts`, { cache: "no-store" }),
    ]).then(async ([profileResponse, accountsResponse]) => {
      if (!profileResponse.ok) throw new Error(await responseDetail(profileResponse));
      if (!accountsResponse.ok) throw new Error(await responseDetail(accountsResponse));
      if (!authoritativeSession) throw new Error("Account access could not be verified.");
      const [nextProfile, nextAccounts] = await Promise.all([
        profileResponse.json() as Promise<ProfileRecord>,
        accountsResponse.json() as Promise<AccountRecord[]>,
      ]);
      if (!active) return;
      setProfile(nextProfile);
      setForm(nextProfile);
      setAccounts(nextAccounts);
      setSession(authoritativeSession);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Profile management could not be loaded.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [authoritativeSession, profileId]);

  function selectSection(section: SectionId) {
    setActiveSection(section);
    window.history.replaceState(null, "", `${window.location.pathname}#${section}`);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, section: SectionId) {
    const current = sections.findIndex((item) => item.id === section);
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % sections.length;
    if (event.key === "ArrowLeft") next = (current - 1 + sections.length) % sections.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = sections.length - 1;
    if (next === current) return;
    event.preventDefault();
    selectSection(sections[next].id);
    document.getElementById(`profile-management-tab-${sections[next].id}`)?.focus();
  }

  async function patchProfile(values: Partial<ProfileRecord>, successMessage: string) {
    if (isSaving) return false;
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(await responseDetail(response));
      const updated = (await response.json()) as ProfileRecord;
      setProfile(updated);
      setForm(updated);
      setMessage(successMessage);
      window.dispatchEvent(new CustomEvent(PROFILE_DIRECTORY_UPDATED_EVENT, { detail: { profileId } }));
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Profile update failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function saveOverview() {
    if (!form) return;
    await patchProfile({
      display_name: form.display_name.trim(),
      profile_code: form.profile_code.trim().toUpperCase(),
      tracking_start_date: form.tracking_start_date,
    }, "Profile overview saved.");
  }

  async function saveFees() {
    if (!form) return;
    await patchProfile({
      investment_fee_percent: form.investment_fee_percent,
      management_fee_percent: form.management_fee_percent,
    }, "Profile fee settings saved.");
  }

  async function updateLifecycle() {
    const action = lifecycleConfirmation;
    if (!action) return;
    const nextStatus = action === "archive" ? "Archived" : "Active";
    const saved = await patchProfile(
      { status: nextStatus },
      action === "archive" ? "Profile archived." : "Profile restored."
    );
    if (saved) setLifecycleConfirmation(null);
  }

  async function deleteProfile() {
    if (isSaving || !profile || lifecycleConfirmation !== "delete") return;
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation_name: profile.display_name }),
      });
      if (!response.ok) throw new Error(await responseDetail(response));
      invalidateCachedJson(`${apiBaseUrl}/profiles`);
      invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}`);
      window.dispatchEvent(new CustomEvent(PROFILE_DIRECTORY_UPDATED_EVENT, { detail: { profileId } }));
      setLifecycleConfirmation(null);
      router.replace("/profiles?status=Archived");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Profile deletion failed.");
    } finally {
      setIsSaving(false);
    }
  }

  const activeAccounts = accounts.filter((account) =>
    account.status !== "Archived" && account.lifecycle_status !== "Archived"
  );
  const accountTotals = {
    Bank: activeAccounts.filter((account) => account.type === "Bank").reduce((sum, account) => sum + parseAmount(account.current_balance), 0),
    Bookie: activeAccounts.filter((account) => account.type === "Bookie").reduce((sum, account) => sum + parseAmount(account.current_balance), 0),
    Exchange: activeAccounts.filter((account) => account.type === "Exchange").reduce((sum, account) => sum + parseAmount(account.current_balance), 0),
  };
  const isArchived = profile?.status === "Archived";

  if (isLoading) {
    return (
      <main aria-busy="true" className="page-shell stack">
        <section className="content-panel stack sportsbook-page-shell">
          <LedgerLoadingIndicator dataPdId="profile-management.loading" label="Loading Profile management" />
        </section>
      </main>
    );
  }

  if (!profile || !form) {
    return (
      <main className="page-shell stack">
        <section className="content-panel stack" role="alert">
          <h1>Unable to load Profile management</h1>
          <p>{error || "The requested Profile is unavailable."}</p>
          <Link className="button-link" href="/profiles">Return to Profiles</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell stack" data-pd-id="profile-management.page">
      <StatusToast message={message || error} onDismiss={() => { setMessage(""); setError(""); }} />
      <section className="hero-panel split-hero profile-management-header">
        <div className="stack-tight">
          <span className="eyebrow">Fund Manager Profile Management</span>
          <h1>{profile.display_name}</h1>
          <p>Administrative settings, access, financial configuration and lifecycle.</p>
        </div>
        <div className="profile-management-header-actions">
          <span className="badge">{profile.status}</span>
          <Link className="button-link" href={`/profiles/${profileId}/tracker/dashboard`}>Open Profile</Link>
        </div>
      </section>

      <section className="content-panel stack profile-management-shell">
        <div aria-label="Profile management sections" className="analytics-tab-list profile-settings-tab-list" data-pd-id="profile-management.navigation.tabs" role="tablist">
          {sections.map((section) => (
            <button
              aria-controls={`profile-management-panel-${section.id}`}
              aria-selected={activeSection === section.id}
              className={`analytics-tab${activeSection === section.id ? " is-active" : ""}`}
              id={`profile-management-tab-${section.id}`}
              key={section.id}
              onClick={() => selectSection(section.id)}
              onKeyDown={(event) => handleTabKeyDown(event, section.id)}
              role="tab"
              tabIndex={activeSection === section.id ? 0 : -1}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </div>

        <section aria-labelledby="profile-management-tab-overview" className="analytics-tab-panel stack" hidden={activeSection !== "overview"} id="profile-management-panel-overview" role="tabpanel">
          <div className="section-heading-row"><div><span className="eyebrow">Profile</span><h2>Overview</h2></div></div>
          <div className="profile-management-form-grid">
            <label className="field-control"><span>Display name</span><input disabled={isSaving || isArchived} maxLength={120} onChange={(event) => setForm({ ...form, display_name: event.target.value })} value={form.display_name} /></label>
            <label className="field-control"><span>Profile code</span><input disabled={isSaving || isArchived} maxLength={32} onChange={(event) => setForm({ ...form, profile_code: event.target.value.toUpperCase() })} pattern="[A-Z0-9-]+" value={form.profile_code} /></label>
            <label className="field-control"><span>Tracking start</span><input disabled={isSaving || isArchived} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setForm({ ...form, tracking_start_date: event.target.value })} type="date" value={form.tracking_start_date} /></label>
          </div>
          <div className="settings-action-row"><button className="modal-primary-button" disabled={isSaving || isArchived} onClick={() => void saveOverview()} type="button">{isSaving ? <span aria-hidden="true" className="button-spinner" /> : null}<span>{isSaving ? "Saving" : "Save overview"}</span></button></div>
          {isArchived ? <p className="field-hint">Archived Profiles are read-only. Restore this Profile to change its settings.</p> : null}
          <dl className="fund-manager-account-details">
            <div><dt>Status</dt><dd>{profile.status}</dd></div>
            <div><dt>Current cash snapshot</dt><dd><FinancialValue value={profile.current_cash_snapshot} /></dd></div>
          </dl>
        </section>

        <section aria-labelledby="profile-management-tab-access" className="analytics-tab-panel stack" hidden={activeSection !== "access"} id="profile-management-panel-access" role="tabpanel">
          <div><span className="eyebrow">Access</span><h2>Subscriber relationship</h2></div>
          <dl className="fund-manager-account-details">
            <div><dt>Linked Subscriber</dt><dd>Not linked</dd></div>
            <div><dt>Onboarding state</dt><dd>Profile configured</dd></div>
            <div><dt>Assigned Fund Manager</dt><dd>{session?.name ?? "Current Fund Manager"}</dd></div>
            <div><dt>Plan / tier</dt><dd>Not configured</dd></div>
          </dl>
          <p className="field-hint">Subscriber assignment and plan controls will appear here when those capabilities exist.</p>
        </section>

        <section aria-labelledby="profile-management-tab-financial" className="analytics-tab-panel stack" hidden={activeSection !== "financial"} id="profile-management-panel-financial" role="tabpanel">
          <div><span className="eyebrow">Financial</span><h2>Fees</h2></div>
          <div className="profile-management-form-grid">
            <label className="field-control"><span>Management fee (%)</span><input disabled={isSaving || isArchived} max="100" min="0" onChange={(event) => setForm({ ...form, management_fee_percent: event.target.value })} step="0.01" type="number" value={form.management_fee_percent} /></label>
            <label className="field-control"><span>Investment fee (%)</span><input disabled={isSaving || isArchived} max="100" min="0" onChange={(event) => setForm({ ...form, investment_fee_percent: event.target.value })} step="0.01" type="number" value={form.investment_fee_percent} /></label>
          </div>
          <div className="settings-action-row" data-pd-id="profile-management.financial.actions"><Link className="button-link" href={`/profiles?profile=${profileId}`}>Review fee position</Link><button className="modal-primary-button" disabled={isSaving || isArchived} onClick={() => void saveFees()} type="button">{isSaving ? <span aria-hidden="true" className="button-spinner" /> : null}<span>{isSaving ? "Saving" : "Save fees"}</span></button></div>
        </section>

        <section aria-labelledby="profile-management-tab-accounts" className="analytics-tab-panel stack" hidden={activeSection !== "accounts"} id="profile-management-panel-accounts" role="tabpanel">
          <div><span className="eyebrow">Accounts</span><h2>Account health</h2></div>
          <dl className="fund-manager-account-details">
            <div><dt>Active Profile Accounts</dt><dd>{activeAccounts.length}</dd></div>
            <div><dt>Bookmaker balance</dt><dd><FinancialValue value={accountTotals.Bookie} /></dd></div>
            <div><dt>Exchange balance</dt><dd><FinancialValue value={accountTotals.Exchange} /></dd></div>
            <div><dt>Bank balance</dt><dd><FinancialValue value={accountTotals.Bank} /></dd></div>
          </dl>
          <div className="settings-action-row"><Link className="button-link" href={`/profiles/${profileId}/tracker/accounts`}>Open Accounts</Link></div>
        </section>

        <section aria-labelledby="profile-management-tab-security" className="analytics-tab-panel stack" hidden={activeSection !== "security"} id="profile-management-panel-security" role="tabpanel">
          <div><span className="eyebrow">Security</span><h2>Profile access</h2></div>
          <dl className="fund-manager-account-details">
            <div><dt>Administrative role</dt><dd>Fund Manager</dd></div>
            <div><dt>Authenticated identity</dt><dd>{session?.email ?? "Current authenticated account"}</dd></div>
            <div><dt>Subscriber authentication</dt><dd>Not assigned</dd></div>
          </dl>
          <p className="field-hint">Session and personal security preferences remain under My Account.</p>
        </section>

        <section aria-labelledby="profile-management-tab-activity" className="analytics-tab-panel stack" hidden={activeSection !== "activity"} id="profile-management-panel-activity" role="tabpanel">
          <div><span className="eyebrow">Audit</span><h2>Activity and import history</h2></div>
          <dl className="fund-manager-account-details">
            <div><dt>Lifecycle history</dt><dd>Retained with Profile audit records</dd></div>
            <div><dt>Workbook imports</dt><dd>Retained with the Profile</dd></div>
          </dl>
          <div className="settings-action-row"><Link className="button-link" href={`/profiles/${profileId}/tracker/settings#import-export`}>Open Import History</Link></div>
        </section>

        <section aria-labelledby="profile-management-tab-lifecycle" className="analytics-tab-panel stack" hidden={activeSection !== "lifecycle"} id="profile-management-panel-lifecycle" role="tabpanel">
          <div><span className="eyebrow">Lifecycle</span><h2>Profile status</h2></div>
          <dl className="fund-manager-account-details"><div><dt>Current status</dt><dd>{profile.status}</dd></div></dl>
          <p className="field-hint">Archive preserves tracker, fee, import and audit history for reporting, but makes the Profile read-only until restored.</p>
          {profile.status === "Archived" ? (
            <div className="stack profile-lifecycle-actions">
              <button className="modal-primary-button" data-pd-id="profile-management.restore" disabled={isSaving} onClick={() => setLifecycleConfirmation("restore")} type="button"><span aria-hidden="true" className="material-symbols-outlined">unarchive</span><span>Restore Profile</span></button>
              <div className="content-panel stack profile-lifecycle-danger">
                <div><span className="eyebrow">Permanent deletion</span><h3>Delete Profile</h3></div>
                <p>Delete permanently removes this Profile, its Accounts, ledgers, fees, imports, review decisions and audit history. This cannot be undone.</p>
                <button className="icon-button icon-button-destructive icon-text-action" data-pd-id="profile-management.delete" disabled={isSaving} onClick={() => setLifecycleConfirmation("delete")} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span><span>Delete Profile</span></button>
              </div>
            </div>
          ) : (
            <button className="icon-button icon-button-destructive icon-text-action" data-pd-id="profile-management.archive" disabled={isSaving} onClick={() => setLifecycleConfirmation("archive")} type="button"><span aria-hidden="true" className="material-symbols-outlined">archive</span><span>Archive Profile</span></button>
          )}
        </section>
      </section>

      <ConfirmationDialog
        busy={isSaving}
        busyLabel={lifecycleConfirmation === "archive" ? "Archiving" : lifecycleConfirmation === "delete" ? "Deleting" : "Restoring"}
        confirmLabel={lifecycleConfirmation === "archive" ? "Archive Profile" : lifecycleConfirmation === "delete" ? "Delete Profile" : "Restore Profile"}
        confirmTone={lifecycleConfirmation === "restore" ? "primary" : "destructive"}
        confirmationLabel="Profile name"
        confirmationText={lifecycleConfirmation === "delete" ? profile.display_name : undefined}
        description={lifecycleConfirmation === "archive" ? `Archive ${profile.display_name}? Historical records remain reportable, but any open positions become read-only until the Profile is restored.` : lifecycleConfirmation === "delete" ? `Permanently delete ${profile.display_name} and all Profile-scoped financial, import and audit data? This cannot be undone.` : `Restore ${profile.display_name} to active Profile views?`}
        onCancel={() => setLifecycleConfirmation(null)}
        onConfirm={() => lifecycleConfirmation === "delete" ? void deleteProfile() : void updateLifecycle()}
        open={lifecycleConfirmation !== null}
        title={lifecycleConfirmation === "archive" ? "Archive Profile?" : lifecycleConfirmation === "delete" ? "Delete Profile permanently?" : "Restore Profile?"}
      />
    </main>
  );
}
