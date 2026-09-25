"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { apiBaseUrl } from "@/lib/api";
import type { AccountAuthorityRecord } from "@/lib/account-authorities";
import { accountMoneyDisplayValue, accountMoneyError, normalizeAccountMoney } from "@/lib/account-money";
import { formatDisplayDate, formatHumanDisplayDate } from "@/lib/tracker-summary";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { ModalBoundary } from "@/components/modal-boundary";
import { FinancialValue } from "@/components/financial-value";
import { CopyableFinancialValue } from "@/components/copyable-financial-value";
import { FinancialTextInput } from "@/components/financial-text-input";
import { MotionReplayGroup } from "@/components/motion-replay-group";

type Observation = { balance_snapshot_id: string; snapshot_at: string; snapshot_type: string; balance_amount: string; balance_change: string | null; notes: string };
type Review = { profile_name: string; account: AccountAuthorityRecord; observations: Observation[]; latest_observation_id: string };

/** The accepted Account editor summary is shared with ledger-context review. */
export function AccountFinancialSummary({ account }: { account: AccountAuthorityRecord }) {
  return <section className="stat-strip" aria-label="Account summary">
    <article className="stat-card"><span className="eyebrow">Status</span><strong>{account.status}</strong><p className="lede">Type: {account.type}</p></article>
    <MotionReplayGroup><article className="stat-card"><span className="eyebrow">Current balance</span><strong><FinancialValue value={accountMoneyDisplayValue(account.current_balance)} /></strong><p className="lede">Pending withdrawal: <FinancialValue value={accountMoneyDisplayValue(account.pending_withdrawal_amount)} /></p></article></MotionReplayGroup>
    <article className="stat-card"><span className="eyebrow">Cash total</span><strong>{account.counts_in_cash_total ? "Included" : "Excluded"}</strong><p className="lede">Last update: {account.last_balance_update ? formatDisplayDate(account.last_balance_update) : "—"}</p></article>
  </section>;
}

export function AccountReviewButton({ profileId, accounts, accountName, accountId, children, onConfirmed }: {
  profileId: string; accounts: AccountAuthorityRecord[]; accountName?: string; accountId?: string; children?: ReactNode; onConfirmed?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const candidates = accounts.filter(a => accountId ? a.account_id === accountId : a.account === accountName);
  return <><button aria-label={`Review Account ${accountName || candidates[0]?.account || "details"}`} className="button-link" data-pd-id="account.review.open" disabled={!candidates.length} onClick={e => { e.stopPropagation(); setOpen(true); }} type="button">{children || "Review account"}</button>
    {open ? <AccountReviewDialog key={`${profileId}:${accountId || accountName}`} accounts={candidates} onClose={() => setOpen(false)} onConfirmed={onConfirmed} profileId={profileId} /> : null}</>;
}

function AccountReviewDialog({ profileId, accounts, onClose, onConfirmed }: { profileId: string; accounts: AccountAuthorityRecord[]; onClose: () => void; onConfirmed?: () => void }) {
  const [accountId, setAccountId] = useState(accounts.length === 1 ? accounts[0].account_id : "");
  const [review, setReview] = useState<Review | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(accounts.length === 1);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const pending = useRef(false);
  const operation = useRef<{ key: string; id: string } | null>(null);
  const dirty = review !== null && (amount !== review.account.current_balance || reason !== "");
  const confirmDiscard = useUnsavedChangesGuard(dirty, "Discard this unconfirmed Account balance? Your bet draft is unchanged.");
  const endpoint = `${apiBaseUrl}/profiles/${profileId}/accounts/${accountId}/balance-observations`;
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    if (!accountId) return () => { current = false; controller.abort(); };
    void fetch(endpoint, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Account observations could not be loaded. Retry to confirm its current state.");
      const value: Review = await response.json();
      if (current) { setReview(value); setAmount(value.account.current_balance); }
    }).catch(error => { if (current) setError(error instanceof Error ? error.message : "Account review unavailable."); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [accountId, endpoint, reload]);
  function resetRead(hasAccount = true) { setReview(null); setError(""); setMessage(""); setAmount(""); setReason(""); operation.current = null; setLoading(hasAccount); }
  const close = useCallback(async () => { if (!pending.current && await confirmDiscard()) onClose(); }, [confirmDiscard, onClose]);
  const known = amount.trim() !== "" && !accountMoneyError(amount);
  async function confirm() {
    if (!review || pending.current || !known) return;
    pending.current = true; setSaving(true); setError(""); setMessage("");
    const body = { balance_amount: normalizeAccountMoney(amount), reason, expected_balance: review.account.current_balance, expected_observation_id: review.latest_observation_id };
    const key = JSON.stringify(body); if (operation.current?.key !== key) operation.current = { key, id: crypto.randomUUID() };
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, operation_id: operation.current.id }) });
      if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(typeof result.detail === "string" ? result.detail : "Balance was not confirmed. Your draft is retained."); }
      await response.json();
      // A lost response may be retried after a newer observation; use the server's current Account.
      const latest = await fetch(endpoint, { cache: "no-store" });
      if (!latest.ok) throw new Error("Balance was confirmed, but history could not be refreshed. Retry safely or reload observations.");
      const refreshed: Review = await latest.json(); setReview(refreshed); setAmount(refreshed.account.current_balance); setReason(""); operation.current = null;
      setMessage("Balance confirmed. This does not create betting profit."); onConfirmed?.();
    } catch (error) { setError(error instanceof Error ? error.message : "Balance was not confirmed. Retry safely."); }
    finally { pending.current = false; setSaving(false); }
  }
  return <ModalBoundary onDismiss={() => void close()}><div className="modal-backdrop" onClick={e => e.stopPropagation()} onMouseDown={e => { if (e.target === e.currentTarget) void close(); }}>
    <section aria-label="Account review" aria-modal="true" className="content-panel stack workflow-editor-panel modal-panel workflow-editor-modal accounts-editor-modal" data-pd-id="account.review.dialog" role="dialog" tabIndex={-1}>
      <div className="workflow-panel-header"><div className="stack"><span className="eyebrow">Account review</span><strong>{review?.account.account || "Choose the Account"}</strong></div><button aria-label="Close Account review" className="modal-close-button" disabled={saving} onClick={() => void close()} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></div>
      <div className="workflow-editor-body stack">
        {accounts.length > 1 ? <label className="field-control"><span>Account to review</span><select disabled={saving} onChange={async e => { const id = e.target.value; if (await confirmDiscard()) { resetRead(Boolean(id)); setAccountId(id); } }} value={accountId}><option value="">Select the exact Account</option>{accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.account} · {a.type} · {a.channel} · {a.account_id}</option>)}</select></label> : null}
        {loading ? <p role="status">Loading Account and observations…</p> : null}
        {error ? <p className="error-text" role="alert">{error}</p> : null}
        {!loading && accountId ? <button className="button-link" disabled={saving} onClick={async () => { if (await confirmDiscard()) { resetRead(); setReload(v => v + 1); } }} type="button">Reload observations</button> : null}
        {review ? <>
          <p className="field-hint">Profile: {review.profile_name}</p><AccountFinancialSummary account={review.account} />
          <section className="content-subpanel stack-tight"><h3>Access and confirmation</h3><p>Stake access: {review.account.stake_access || "Not Checked"} · Promotion access: {review.account.promo_access || "Not Checked"}</p><p>Restrictions: {review.account.restrictions?.join(", ") || "None recorded"}</p><p>Last confirmation: {review.observations.find(o => o.snapshot_type.startsWith("account-observation-v1:"))?.snapshot_at ? formatHumanDisplayDate(review.observations.find(o => o.snapshot_type.startsWith("account-observation-v1:"))!.snapshot_at, true) : "No recorded confirmation"}</p></section>
          <form className="form-grid" id="account-balance-confirmation" onSubmit={e => { e.preventDefault(); e.stopPropagation(); void confirm(); }}>
            <label className="field-control"><span>Observed balance</span><FinancialTextInput ariaLabel="Observed balance" ariaInvalid={Boolean(amount && !known)} disabled={saving} dataPdId="account.review.balance" id="account-review-balance" onBlur={() => setAmount(value => normalizeAccountMoney(value))} onChange={setAmount} sanitizeInput={false} value={amount} />{amount && !known ? <small className="error-text">{accountMoneyError(amount)}</small> : null}</label>
            <label className="field-control"><span>Reason (optional)</span><input aria-label="Balance observation reason" disabled={saving} maxLength={500} onChange={e => setReason(e.target.value)} value={reason} /></label>
            <p className="field-hint field-span-2">Confirm saves only this Account. The current bet draft stays open. An unchanged amount records a fresh confirmation with no balance movement.</p>
          </form>
          {message ? <p data-pd-id="account.review.confirmation-status" role="status">{message}</p> : null}
          <section className="stack-tight" aria-label="Previous balance observations"><h3>Previous observations</h3><p className="field-hint">Changes are observed balance changes, not betting profit. Missing observations are not filled in.</p>
            {review.observations.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Recorded at</th><th>Observed balance</th><th>Change since previous observation</th><th>Source / reason</th></tr></thead><tbody>{review.observations.map(o => <tr key={o.balance_snapshot_id}><td><time dateTime={o.snapshot_at} title={o.snapshot_at}>{formatHumanDisplayDate(o.snapshot_at, true)}</time></td><td><CopyableFinancialValue label="Observed balance" value={accountMoneyDisplayValue(o.balance_amount)} /></td><td><FinancialValue animate={false} value={o.balance_change ?? "Unavailable"} /></td><td>{o.snapshot_type === "account-observation-v1:manual-confirmation" ? "Manual confirmation" : o.snapshot_type === "account-observation-v1:account-editor" ? "Account editor" : `Snapshot: ${o.snapshot_type}`}{o.notes ? ` · ${o.notes}` : ""}</td></tr>)}</tbody></table></div> : <p>No recorded observations. The current balance is not backfilled into history.</p>}
          </section>
        </> : null}
      </div>
      <div className="workflow-editor-footer"><button className="modal-primary-button" disabled={!review || loading || saving || !known || review.account.lifecycle_status === "Archived"} form="account-balance-confirmation" type="submit">{saving ? "Confirming…" : "Confirm balance"}</button><button className="review-chip" disabled={saving} onClick={() => { setAmount(review?.account.current_balance || ""); setReason(""); setError(""); operation.current = null; }} type="button">Revert</button><button className="review-chip" disabled={saving} onClick={() => void close()} type="button">Close</button></div>
    </section>
  </div></ModalBoundary>;
}
