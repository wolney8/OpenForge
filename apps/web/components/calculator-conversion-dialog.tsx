"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { apiBaseUrl } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/api-error";
import { useDialogFocusLifecycle } from "@/lib/ledger-ui";
import type { BlackjackSessionSourceSnapshot } from "@/lib/blackjack-session";

type Profile = { profile_id: string; display_name: string; profile_code: string; status: string };
type Account = { account_id: string; account: string; type: string; status: string; lifecycle_status: string; restrictions: string[] };
type TargetResult = { profile_id: string; account: string; state: "succeeded" | "failed" | "already_succeeded"; record_id: string; href: string; reasons: string[] };
export type CalculatorFinancialSource = {
  kind: "standard" | "multi-lay" | "each-way-extra-place";
  envelope: { calculator_family: string; calculator_version: string; calculator_mode: string; canonical_inputs: Record<string, unknown>; created_at: string };
  calculator: Record<string, unknown>;
};

type Props = {
  blackjack?: BlackjackSessionSourceSnapshot;
  financial?: CalculatorFinancialSource;
  onClose: () => void;
};

function standardDestinationOfferType(financial?: CalculatorFinancialSource) {
  if (financial?.kind !== "standard") return financial?.kind === "multi-lay" ? "Qualifying Bet" : "";
  const betType = String(financial.calculator.bet_type ?? "");
  if (betType === "qualifying" && financial.calculator.promotion_mode === "cashback") return "Cashback";
  if (betType === "qualifying") return "Qualifying Bet";
  if (betType === "cashback") return "Cashback";
  if (betType === "money_back" || betType === "bonus_lock_in") return "Bonus Lock-In";
  if (betType === "profit_boost") return "Profit Boost";
  return "";
}

const blockedStatuses = new Set(["archived", "blocked", "closed", "inactive", "not using", "suspended"]);
const blockedLifecycles = new Set(["archived", "closed", "not signed up", "suspended"]);

function accountReview(account: Account, isBlackjack: boolean, promotional: boolean) {
  const restrictions = new Set(account.restrictions.map((value) => value.trim().toLowerCase()));
  const hardRestrictions = ["kyc blocked", "login restricted", "risk blocked"]
    .filter((value) => restrictions.has(value));
  if (isBlackjack && restrictions.has("sportsbook only")) hardRestrictions.push("sportsbook only");
  if (!isBlackjack && restrictions.has("casino only")) hardRestrictions.push("casino only");
  if (promotional && restrictions.has("bonus restricted")) hardRestrictions.push("bonus restricted");
  const blocked = blockedStatuses.has(account.status.toLowerCase())
    || blockedLifecycles.has(account.lifecycle_status.toLowerCase())
    || hardRestrictions.length > 0;
  if (blocked) return { blocked, message: hardRestrictions.length ? `Blocked: ${hardRestrictions.join(", ")}.` : `Unavailable: ${account.lifecycle_status || account.status}.` };
  if (restrictions.has("soft limited") || ["pending sign up", "verification pending"].includes(account.lifecycle_status.toLowerCase())) {
    return { blocked: false, message: `${account.lifecycle_status || account.status}: confirm this Account can be used.` };
  }
  return { blocked: false, message: "" };
}

export function CalculatorConversionDialog({ blackjack, financial, onClose }: Props) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [accounts, setAccounts] = useState<Record<string, Account[]>>({});
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string>>({});
  const [eventName, setEventName] = useState("");
  const [offerType, setOfferType] = useState(() => standardDestinationOfferType(financial));
  const [betType, setBetType] = useState("Single");
  const [offerName, setOfferName] = useState("");
  const [fixtureType, setFixtureType] = useState("");
  const [runner, setRunner] = useState("");
  const [race, setRace] = useState("");
  const [activityName, setActivityName] = useState("Blackjack session");
  const [offerIdentity, setOfferIdentity] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<TargetResult[]>([]);
  const isBlackjack = Boolean(blackjack);
  const isEachWay = financial?.kind === "each-way-extra-place";
  const standardBetType = financial?.kind === "standard" ? String(financial.calculator.bet_type ?? "") : "";
  const offerTypeIsSourceGoverned = standardBetType !== "" && standardBetType !== "free_bet";
  const financialLabel = standardBetType === "free_bet" ? "Free Bet" : financial?.kind === "standard" ? "Standard" : financial?.kind === "multi-lay" ? "Multi-Lay" : "Each Way / Extra Place";
  useDialogFocusLifecycle(true, dialogRef);

  function selectedAccountForProfile(profileId: string) {
    const selectedAccountId = selectedAccounts[profileId];
    return (accounts[profileId] ?? []).find((account) => account.account_id === selectedAccountId);
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${apiBaseUrl}/profiles`, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load Profiles.");
        const loaded = await response.json() as Profile[];
        setProfiles(loaded.filter((profile) => profile.status === "Active"));
      })
      .catch((caught) => { if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : "Unable to load Profiles."); })
      .finally(() => setBusy(false));
    return () => controller.abort();
  }, []);

  async function loadAccounts(profileId: string) {
    if (accounts[profileId]) return;
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/accounts`, { credentials: "include" });
    if (!response.ok) throw new Error("Unable to load Profile Accounts.");
    const loaded = await response.json() as Account[];
    setAccounts((current) => ({ ...current, [profileId]: loaded }));
  }

  function toggleProfile(profileId: string, checked: boolean) {
    setError(""); setMessage("");
    setSelectedProfiles((current) => checked ? [...new Set([...current, profileId])] : current.filter((id) => id !== profileId));
    if (checked) void loadAccounts(profileId).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load Profile Accounts."));
  }

  const ready = useMemo(() => {
    if (busy || selectedProfiles.length === 0) return false;
    if (selectedProfiles.some((profileId) => !selectedAccounts[profileId])) return false;
    if (isBlackjack) return selectedProfiles.length === 1 && activityName.trim() !== "" && (blackjack?.activity_source !== "promotion" || offerIdentity.trim() !== "");
    return isEachWay ? runner.trim() !== "" && race.trim() !== "" : eventName.trim() !== "" && offerType.trim() !== "" && betType.trim() !== "";
  }, [activityName, betType, blackjack?.activity_source, busy, eventName, isBlackjack, isEachWay, offerIdentity, offerType, race, runner, selectedAccounts, selectedProfiles]);

  async function submit() {
    if (!ready) return;
    setBusy(true); setError(""); setMessage("");
    const endpoint = isBlackjack ? "blackjack" : financial!.kind;
    const body = isBlackjack ? {
      snapshot: blackjack, profile_id: selectedProfiles[0], casino_account: selectedAccountForProfile(selectedProfiles[0])?.account,
      activity_name: activityName, offer_identity: offerIdentity,
    } : isEachWay ? {
      source: financial!.envelope, calculator: financial!.calculator,
      targets: selectedProfiles.map((profile_id) => ({ profile_id, bookmaker: selectedAccountForProfile(profile_id)?.account })),
      runner, race,
    } : {
      source: financial!.envelope, calculator: financial!.calculator,
      targets: selectedProfiles.map((profile_id) => ({ profile_id, bookmaker: selectedAccountForProfile(profile_id)?.account })),
      event_name: eventName, offer_type: offerType, bet_type: betType, offer_name: offerName, fixture_type: fixtureType,
    };
    try {
      const response = await fetch(`${apiBaseUrl}/fund-manager/calculator-conversions/${endpoint}`, {
        body: JSON.stringify(body), credentials: "include", headers: { "Content-Type": "application/json" }, method: "POST",
      });
      if (!response.ok) throw new Error(formatApiErrorBody(await response.text(), "Unable to complete conversion."));
      const converted = await response.json() as { notification: string; results: TargetResult[] };
      setResults(converted.results); setMessage(converted.notification);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to complete conversion.");
    } finally { setBusy(false); }
  }

  const markup = <div className="modal-backdrop modal-backdrop-elevated" onClick={onClose}>
    <section aria-label={isBlackjack ? "Save Blackjack session as Casino activity" : `Convert ${financialLabel} calculation to opportunity`} aria-modal="true" className="modal-panel multi-profile-opportunity-dialog" data-pd-id="calculator-conversion.dialog" onClick={(event) => event.stopPropagation()} ref={dialogRef} role="dialog" tabIndex={-1}>
      <header className="modal-sticky-header workflow-panel-header"><div className="stack-tight"><span className="eyebrow">Fund Manager</span><strong>{isBlackjack ? "Save as Casino activity" : "Convert to opportunity"}</strong></div><button aria-label="Close conversion" className="modal-close-button" data-initial-focus onClick={onClose} type="button">×</button></header>
      <div className="multi-profile-opportunity-content stack">
        {busy && profiles.length === 0 ? <LedgerLoadingIndicator label="Loading conversion details" /> : null}
        {error ? <p className="field-validation-text" role="alert">{error}</p> : null}
        {message ? <p className="status-message" role="status">{message}</p> : null}
        {!isBlackjack ? <section className="stack-tight"><h3>Destination details</h3><div className="form-grid opportunity-setup-grid">
          {isEachWay ? <><label className="field-control"><span>Runner</span><input onChange={(event) => setRunner(event.target.value)} value={runner} /></label><label className="field-control"><span>Race</span><input onChange={(event) => setRace(event.target.value)} value={race} /></label></> : <>
          <label className="field-control field-span-2"><span>Event / fixture</span><input onChange={(event) => setEventName(event.target.value)} value={eventName} /></label>
          <label className="field-control"><span>Offer type</span><input onChange={(event) => setOfferType(event.target.value)} readOnly={offerTypeIsSourceGoverned} value={offerType} /></label>
          <label className="field-control"><span>Bet type</span><input onChange={(event) => setBetType(event.target.value)} value={betType} /></label>
          <label className="field-control"><span>Offer name</span><input onChange={(event) => setOfferName(event.target.value)} value={offerName} /></label>
          <label className="field-control"><span>Fixture type</span><input onChange={(event) => setFixtureType(event.target.value)} value={fixtureType} /></label>
          </>}
        </div></section> : <section className="stack-tight"><h3>Activity details</h3><div className="form-grid opportunity-setup-grid"><label className="field-control"><span>Activity name</span><input onChange={(event) => setActivityName(event.target.value)} value={activityName} /></label>{blackjack?.activity_source === "promotion" ? <label className="field-control"><span>Promotion / offer identity</span><input onChange={(event) => setOfferIdentity(event.target.value)} value={offerIdentity} /></label> : null}</div></section>}
        <section className="stack-tight"><h3>{isBlackjack ? "Target Profile and Casino Account" : "Profiles and bookmaker Accounts"}</h3><div className="multi-profile-target-list">
          {profiles.map((profile) => {
            const selected = selectedProfiles.includes(profile.profile_id);
            const profileAccounts = (accounts[profile.profile_id] ?? []).filter((account) => account.type === "Bookie");
            const selectedAccount = selectedAccountForProfile(profile.profile_id);
            const selectedReview = selectedAccount ? accountReview(selectedAccount, isBlackjack, isBlackjack ? blackjack?.activity_source === "promotion" : !["", "Mug Bet", "No Offer", "Qualifying Bet"].includes(offerType)) : null;
            return <div className="stack-tight" key={profile.profile_id}><label className="multi-profile-target-row"><input checked={selected} disabled={isBlackjack && selectedProfiles.length === 1 && !selected} onChange={(event) => toggleProfile(profile.profile_id, event.target.checked)} type={isBlackjack ? "radio" : "checkbox"} /><span className="table-cell-stack"><strong>{profile.display_name}</strong><small>{profile.profile_code}</small></span></label>{selected ? <label className="field-control"><span>{isBlackjack ? "Casino Account" : "Bookmaker Account"}</span><select aria-describedby={selectedReview?.message ? `conversion-account-review-${profile.profile_id}` : undefined} onChange={(event) => setSelectedAccounts((current) => ({ ...current, [profile.profile_id]: event.target.value }))} value={selectedAccounts[profile.profile_id] ?? ""}><option value="">Select eligible Account</option>{profileAccounts.map((account) => { const review = accountReview(account, isBlackjack, isBlackjack ? blackjack?.activity_source === "promotion" : !["", "Mug Bet", "No Offer", "Qualifying Bet"].includes(offerType)); return <option disabled={review.blocked} key={account.account_id} value={account.account_id}>{account.account} — {review.blocked ? review.message : account.status} · {account.account_id}</option>; })}</select>{selectedReview?.message ? <small className={selectedReview.blocked ? "field-validation-text" : "field-warning-text"} id={`conversion-account-review-${profile.profile_id}`}>{selectedReview.message}</small> : null}</label> : null}</div>;
          })}
        </div></section>
        {results.length ? <section className="stack-tight" aria-label="Conversion results">{results.map((result) => <p className={result.state === "failed" ? "field-validation-text" : "status-message"} key={`${result.profile_id}:${result.account}`}>{result.account}: {result.state === "failed" ? result.reasons.join(" · ") : result.state === "already_succeeded" ? "Already saved" : "Saved"}{result.href ? <> · <Link href={result.href}>Open row</Link></> : null}</p>)}</section> : null}
      </div>
      <footer className="modal-sticky-footer"><button className="button-link" onClick={onClose} type="button">Close</button><button className="modal-primary-button" disabled={!ready || busy} onClick={() => void submit()} type="button">{busy ? "Saving…" : isBlackjack ? "Save as Casino activity" : "Convert to opportunity"}</button></footer>
    </section>
  </div>;
  return typeof document === "undefined" ? null : createPortal(markup, document.body);
}
