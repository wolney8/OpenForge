"use client";

import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { DesignLabSelect } from "@/components/design-lab-select";
import { DesignOnboardingFieldRow, DesignOnboardingFooter, DesignOnboardingPanel } from "@/components/design-onboarding-field-row";
import styles from "./design-lab-onboarding.module.css";

type Step = "Identity" | "Modules" | "Accounts" | "Quick Actions" | "Review";
const steps: Step[] = ["Identity", "Modules", "Accounts", "Quick Actions", "Review"];
const decimal = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export function DesignLabOnboarding({ onExit, onCreated }: { onExit: () => void; onCreated: (profile: { name: string; code: string }) => void }) {
  const [step, setStep] = useState<Step>("Identity");
  const [path, setPath] = useState<"fresh" | "import">("fresh");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [relationship, setRelationship] = useState<"Personal" | "Managed">("Personal");
  const [trackingStart, setTrackingStart] = useState("2026-11-02");
  const [bankroll, setBankroll] = useState("0.00");
  const [managementFee, setManagementFee] = useState("");
  const [investmentFee, setInvestmentFee] = useState("");
  const [casino, setCasino] = useState(false);
  const [extraPlace, setExtraPlace] = useState(false);
  const [extraBudget, setExtraBudget] = useState("");
  const [bookmaker, setBookmaker] = useState(false);
  const [exchange, setExchange] = useState(false);
  const [commission, setCommission] = useState("");
  const [quickAction, setQuickAction] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(false);
  const [status, setStatus] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const exitRef = useRef<HTMLButtonElement>(null);
  const creationTimerRef = useRef<number | null>(null);

  useEffect(() => { headingRef.current?.focus(); }, [step, created]);
  useEffect(() => () => { if (creationTimerRef.current !== null) window.clearTimeout(creationTimerRef.current); }, []);
  useEffect(() => {
    if (!dirty || created) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty, created]);

  function edit<T>(set: (value: T) => void, value: T) { set(value); setDirty(true); setError(""); }
  function validate(current: Step): string {
    if (current === "Identity") {
      if (!name.trim()) return "Enter a Profile name.";
      if (!/^[A-Z][A-Z0-9-]{2,31}$/.test(code)) return "Enter a stable Profile code using 3–32 uppercase letters, numbers or hyphens.";
      if (["LAB-PROFILE-A", "LAB-PROFILE-B"].includes(code)) return "Choose a Profile code not already used in this lab.";
      if (!trackingStart) return "Enter the tracking start date.";
      if (!decimal.test(bankroll)) return "Enter a valid starting bankroll. Authoritative 0.00 is allowed.";
      if (relationship === "Managed" && (!decimal.test(managementFee) || !decimal.test(investmentFee) || Number(managementFee) > 100 || Number(investmentFee) > 100)) return "Enter both agreed Managed fee percentages, including an explicit zero where agreed.";
    }
    if (current === "Modules" && extraPlace && !decimal.test(extraBudget)) return "Enter the weekly Extra Place loss budget.";
    if (current === "Accounts" && path === "fresh" && !exchange) return "Select at least one Exchange for fresh setup.";
    if (current === "Accounts" && exchange && (!decimal.test(commission) || Number(commission) > 1)) return "Enter the explicit Exchange commission as a decimal rate from 0 to 1. Zero is valid only when entered.";
    return "";
  }
  function next() { const issue = validate(step); if (issue) { setError(issue); return; } setError(""); setStep(steps[steps.indexOf(step) + 1]); }
  function requestExit() { if (dirty && !created) setExitConfirm(true); else onExit(); }
  function simulateCreation() {
    for (const current of steps.slice(0, -1)) { const issue = validate(current); if (issue) { setStep(current); setError(issue); return; } }
    setSaving(true); setStatus("");
    creationTimerRef.current = window.setTimeout(() => { creationTimerRef.current = null; setSaving(false); if (failNext) { setFailNext(false); setError("Simulated creation failed. Your entries are retained; retry when ready."); return; } setCreated(true); setDirty(false); setError(""); onCreated({ name, code }); setStatus("Synthetic Profile created once. No application Profile or Account was written."); }, 350);
  }

  return <main className={styles.page} data-pd-id="lab.onboarding">
    <div className={styles.top}><div className={styles.brand}><span className="brand-mark"><BrandLogo variant="mark" /></span><span className={styles.brandText}>Plum Duff <small>Design Lab · synthetic onboarding</small></span></div><button className={styles.secondary} disabled={saving} onClick={requestExit} ref={exitRef} type="button">Exit onboarding</button></div>
    <div className={styles.content}>
      {created ? <section className={styles.panel} data-pd-id="lab.onboarding-created"><h1 ref={headingRef} tabIndex={-1}>First use · {name}</h1><p role="status">{status}</p><div className={styles.firstUse}><div><strong>Profile identity</strong><span>{code} · {relationship}</span></div><div><strong>Current cash</strong><span>{path === "import" && !bookmaker && !exchange ? "Unknown · no reviewed Accounts" : "Unknown until confirmed observations"}</span></div><div><strong>Next action</strong><span>{path === "import" ? "Review workbook mappings before any Apply" : "Confirm Account opening balances"}</span></div></div><button className={styles.primary} onClick={onExit} type="button">Return to Position</button></section> : <>
        <header className={styles.intro}><span className={styles.eyebrow}>Fund Manager · Add Profile</span><h1 ref={headingRef} tabIndex={-1}>Create a Profile</h1><p>One isolated tracker. No Account or financial record is created in this lab.</p></header>
        <ol aria-label="Onboarding progress" className={styles.stepper}>{steps.map((item, index) => <li key={item}><button aria-current={step === item ? "step" : undefined} className={step === item ? styles.stepActive : ""} disabled={index > steps.indexOf(step)} onClick={() => { setStep(item); setError(""); }} type="button"><span>{index + 1}</span>{item}</button></li>)}</ol>
        <DesignOnboardingPanel aria-label={`${step} step`}>
          {step === "Identity" ? <div className={styles.fields}>
            <h2>Identity and terms</h2><DesignOnboardingFieldRow><div className={styles.selectField}><DesignLabSelect dataPdId="lab.onboarding.path" label="Setup path" onChange={value => edit(setPath, value)} options={[{value:"fresh",label:"Fresh setup"},{value:"import",label:"Import existing tracker"}]} value={path}/></div><div className={styles.selectField}><DesignLabSelect dataPdId="lab.onboarding.relationship" label="Relationship" onChange={value => { edit(setRelationship, value); if (value === "Personal") { setManagementFee(""); setInvestmentFee(""); } }} options={[{value:"Personal",label:"Personal"},{value:"Managed",label:"Managed"}]} value={relationship}/></div></DesignOnboardingFieldRow>
            <DesignOnboardingFieldRow><label>Profile name<input autoComplete="off" data-pd-id="lab.onboarding.name" onChange={event => edit(setName, event.target.value)} value={name}/></label><label>Stable Profile code<input autoCapitalize="characters" data-pd-id="lab.onboarding.code" onChange={event => edit(setCode, event.target.value.toUpperCase())} value={code}/></label></DesignOnboardingFieldRow>
            <DesignOnboardingFieldRow><label>Tracking start<input onChange={event => edit(setTrackingStart, event.target.value)} type="date" value={trackingStart}/></label><label>Starting bankroll (£)<input data-pd-id="lab.onboarding.bankroll" inputMode="decimal" onChange={event => edit(setBankroll, event.target.value)} value={bankroll}/><small>0.00 means confirmed zero; it is not an unknown cash balance.</small></label></DesignOnboardingFieldRow>
            <DesignOnboardingFieldRow><label>Management fee (%)<input disabled={relationship === "Personal"} inputMode="decimal" onChange={event => edit(setManagementFee, event.target.value)} value={relationship === "Personal" ? "0.00" : managementFee}/></label><label>Investment fee (%)<input disabled={relationship === "Personal"} inputMode="decimal" onChange={event => edit(setInvestmentFee, event.target.value)} value={relationship === "Personal" ? "0.00" : investmentFee}/></label></DesignOnboardingFieldRow>
            <p className={styles.note}>Jurisdiction: GB. Profile access is separate from login identity.</p>
          </div> : null}
          {step === "Modules" ? <div className={styles.fields}><h2>Enabled modules</h2><p>Sportsbook, Free Bets and Cash Adjustments are required.</p><div className={styles.checks}><label><input checked disabled type="checkbox"/>Sportsbook</label><label><input checked disabled type="checkbox"/>Free Bets</label><label><input checked disabled type="checkbox"/>Cash Adjustments</label><label><input checked={casino} onChange={event => edit(setCasino, event.target.checked)} type="checkbox"/>Casino Offers</label><label><input checked={extraPlace} onChange={event => edit(setExtraPlace, event.target.checked)} type="checkbox"/>Extra Place</label></div>{extraPlace ? <label>Weekly Extra Place loss budget (£)<input inputMode="decimal" onChange={event => edit(setExtraBudget, event.target.value)} value={extraBudget}/></label> : null}</div> : null}
          {step === "Accounts" ? <div className={styles.fields}><h2>Accounts and Exchange</h2><p>{path === "import" ? "Import can start without Accounts. Current cash stays unknown until reviewed observations exist." : "Fresh setup needs an Exchange with an explicit commission."}</p><div className={styles.checks}><label><input checked={bookmaker} onChange={event => edit(setBookmaker, event.target.checked)} type="checkbox"/>Bookmaker A · synthetic catalogue</label><label><input checked={exchange} onChange={event => edit(setExchange, event.target.checked)} type="checkbox"/>Exchange A · synthetic catalogue</label></div>{exchange ? <label>Exchange A commission (decimal rate)<input aria-label="Exchange A commission" data-pd-id="lab.onboarding.commission" inputMode="decimal" onChange={event => edit(setCommission, event.target.value)} placeholder="Enter explicitly, e.g. 0.02" value={commission}/><small>No commission is inferred.</small></label> : null}</div> : null}
          {step === "Quick Actions" ? <div className={styles.fields}><h2>Quick Actions</h2><p>Required global actions are inherited. Optional favourites are Profile-specific.</p><div className={styles.checks}><label><input checked disabled type="checkbox"/>Add Sportsbook Bet · inherited</label><label><input checked={quickAction} onChange={event => edit(setQuickAction, event.target.checked)} type="checkbox"/>Favourite: Review Accounts</label></div></div> : null}
          {step === "Review" ? <div className={styles.fields}><h2>Review simulated creation</h2><dl className={styles.review}><div><dt>Profile</dt><dd>{name} · {code} · {relationship}</dd></div><div><dt>Setup</dt><dd>{path === "fresh" ? "Fresh" : "Import"} · tracking from {trackingStart}</dd></div><div><dt>New starting bankroll</dt><dd>£{Number(bankroll).toFixed(2)} · no existing Profile balance changes</dd></div><div><dt>Fees</dt><dd>Management {relationship === "Personal" ? "0.00" : managementFee}% · Investment {relationship === "Personal" ? "0.00" : investmentFee}%</dd></div><div><dt>Accounts</dt><dd>{bookmaker ? "Bookmaker A; " : ""}{exchange ? `Exchange A · commission ${commission}` : "None selected"}</dd></div><div><dt>Current cash</dt><dd>Unknown until authoritative Account observations</dd></div></dl><label className={styles.failure}><input checked={failNext} onChange={event => setFailNext(event.target.checked)} type="checkbox"/>Simulate creation failure on next attempt</label></div> : null}
          {error ? <p className={styles.error} data-pd-id="lab.onboarding-error" role="alert">{error}</p> : null}
          <DesignOnboardingFooter><button className={styles.secondary} disabled={step === "Identity" || saving} onClick={() => { setStep(steps[steps.indexOf(step) - 1]); setError(""); }} type="button">Back</button>{step === "Review" ? <button className={styles.primary} disabled={saving} onClick={simulateCreation} type="button">{saving ? "Creating…" : "Create Profile · simulation"}</button> : <button className={styles.primary} onClick={next} type="button">Continue</button>}</DesignOnboardingFooter>
        </DesignOnboardingPanel>
      </>}
    </div>
    <ConfirmationDialog cancelLabel="Keep editing" confirmLabel="Discard synthetic draft" description="Your unsaved Profile setup will be lost. No real Profile has been created." onCancel={() => setExitConfirm(false)} onConfirm={() => { setExitConfirm(false); onExit(); }} open={exitConfirm} title="Unsaved Profile setup" />
  </main>;
}
