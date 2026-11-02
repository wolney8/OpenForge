"use client";

import { useMemo, useState } from "react";
import { buildLabTodayTasks, copyLabReload, labManagedFeeSummary, labOfferTargets, labReloadDefinition, type LabCopyResult, type LabOfferProfile } from "@/lib/design-lab-operations";
import { labProfiles, summarizeDesignLab, type LabAccount, type LabRange, type LabScope, type LabProfileId } from "@/lib/design-lab-fixture";
import type { LabRecord } from "@/lib/design-lab-connected-data";
import { formatFinancialValue } from "@/lib/financial-display";
import { StatusToast } from "@/components/status-toast";
import { DesignLabSelect } from "@/components/design-lab-select";
import styles from "./design-lab-connected.module.css";
import local from "./design-lab-operations.module.css";

const profileName = (id: string) => labProfiles.find(profile => profile.id === id)?.name ?? id;
const money = (value: number) => value === 0 ? "£0.00" : formatFinancialValue(value);

export function DesignLabPositionTable({ accounts, scope, range, onOpenReport }: { accounts: LabAccount[]; scope: LabScope; range: LabRange; onOpenReport: (id: LabProfileId) => void }) {
  const rows = labProfiles.filter(profile => scope === "all" || scope === profile.id).map(profile => ({ profile,
    summary: summarizeDesignLab(accounts, profile.id, range),
    fee: profile.id === "LAB-PROFILE-A" ? { estimatedFees: 0, feesEarned: 0, availableToWithdraw: 0 } : labManagedFeeSummary,
  }));
  return <section className={styles.surface} data-pd-id="lab.position-profiles"><div className={styles.sectionHead}><h2>Profiles · financial position</h2><span>Contract-backed synthetic source records</span></div>
    <div aria-label="Multi-Profile financial position" className={local.positionScroll} role="region" tabIndex={0}><table><thead><tr><th scope="col">Profile</th><th scope="col">Realised P&amp;L</th><th scope="col">Current / Projected</th><th scope="col">Committed Exposure</th><th scope="col">Estimated Fees</th><th scope="col">Fees Earned</th><th scope="col">Available to Withdraw</th><th scope="col">Cash Readiness</th><th scope="col">Source</th></tr></thead><tbody>{rows.map(({profile,summary,fee}) => <tr key={profile.id}><th scope="row">{profile.name}<small>{profile.id === "LAB-PROFILE-A" ? "Personal · 0% fees" : "Managed · monthly periods"}</small></th><td>{money(summary.realised.knownValue)}</td><td>Unavailable<small>No validated current-value fixture</small></td><td>{money(summary.exposure.knownValue)}{summary.exposure.unknownCount ? <small>{summary.exposure.unknownCount} unavailable</small> : null}</td><td>{money(fee.estimatedFees)}<small>{profile.id === "LAB-PROFILE-B" ? "Oct · awaiting confirmation" : "Fee-less Profile"}</small></td><td>{money(fee.feesEarned)}<small>{profile.id === "LAB-PROFILE-B" ? "Sep · crystallised" : "Fee-less Profile"}</small></td><td>{money(fee.availableToWithdraw)}<small>Crystallised outstanding only</small></td><td>{money(Number(summary.cash.knownSubtotal))}<small>{summary.cashMissingCount ? `Incomplete · ${summary.cashMissingCount} unknown` : "Complete"}</small></td><td><button className={styles.linkButton} onClick={() => onOpenReport(profile.id)} type="button">Open Report</button></td></tr>)}</tbody></table></div>
    <details className={local.feeDetail}><summary>Fee Source and Limits</summary><p>Profile A has a synthetic 0% fee agreement. Profile B uses two synthetic monthly period records read by the existing fee-period summary: September confirmed (£9 earned, £5 withdrawn, £4 outstanding); October ready for confirmation (£6 estimated). Estimates are not earned or withdrawable. Current/projected bet value has no validated fixture and remains unavailable. These figures are not net platform profit.</p></details>
  </section>;
}

export type LabTaskWorkState = "To Do" | "In Progress" | "Blocked" | "Do Later" | "Done";
export function DesignLabToday({ scope, records, accounts, done, deferred, onDoneChange, onDeferredChange, onOpenSource, onOpenOffer, onInspectHistory, taskStates, taskNotes, onTaskState, onTaskNote, onActivateTask }: {
  scope: LabScope; records: LabRecord[]; accounts: LabAccount[];
  done: string[]; deferred: string[]; onDoneChange: (next: string[]) => void; onDeferredChange: (next: string[]) => void;
  onOpenSource: (id: string) => void; onOpenOffer: () => void; onInspectHistory: () => void;
  taskStates: Record<string,LabTaskWorkState>; taskNotes: Record<string,string>; onTaskState: (id:string,state:LabTaskWorkState) => void; onTaskNote: (id:string,note:string) => void; onActivateTask: (id:string) => void;
}) {
  const tasks = useMemo(() => buildLabTodayTasks(records, accounts, scope), [records, accounts, scope]);
  return <div className={local.today} data-pd-id="lab.today">
    {(["Needs Action", "Recurring Work", "Opportunities / Suggestions"] as const).map(group => <section aria-label={group} className={styles.surface} key={group}>
      <div className={styles.sectionHead}><h2>{group}</h2><span className={local.groupCount}>{tasks.filter(task => task.group === group).length} items</span></div>
      <div className={local.taskList}>{tasks.filter(task => task.group === group).map(task => {
        const isDone = done.includes(task.id);
        const isDeferred = deferred.includes(task.id);
        return <article className={local.taskCard} data-pd-id={`lab.task.${task.id}`} key={task.id}>
          <div className={local.taskCopy}><div className={local.taskMeta}><span className={local.authority}>{task.authority === "Confirmed task" ? "Confirmed Task" : task.authority === "Configured reminder" ? "Configured Reminder" : "Advisory Suggestion"}</span><span>{task.profileId ? profileName(task.profileId) : task.id === "reload" ? "Profiles A, B and C" : "All Profiles"}</span><span>{task.provider}</span>{task.due ? <time dateTime={task.due}>Due {task.due}</time> : null}</div>
            <h3>{task.title}</h3><p>{task.detail}</p><small>{task.sourceId ? `Source ${task.sourceId}` : task.authority === "Advisory suggestion" ? "Synthetic history · current availability unverified" : "Lab routine · no external check performed"}</small>
          </div>
          <div className={local.taskActions}><button className={styles.linkButton} onClick={() => onActivateTask(task.id)} type="button">Track Task</button><div className={local.taskState}><DesignLabSelect dataPdId={`lab.task-state.${task.id}`} label="Work State" onChange={state => onTaskState(task.id,state)} options={(["To Do","In Progress","Blocked","Do Later",...(task.manual ? ["Done"] : [])] as LabTaskWorkState[]).map(state => ({value:state,label:state}))} value={isDone ? "Done" : taskStates[task.id] ?? "To Do"}/></div>{taskStates[task.id] === "Blocked" ? <label className={local.reviewDate}>Blocked Reason<input aria-label={`${task.title} blocked reason`} onChange={event => onTaskNote(task.id,event.target.value)} placeholder="Why is work blocked?" value={taskNotes[task.id] ?? ""}/></label> : null}{taskStates[task.id] === "Do Later" ? <label className={local.reviewDate}>Resume Date<input aria-label={`${task.title} resume date`} onChange={event => onTaskNote(task.id,event.target.value)} type="date" value={taskNotes[task.id] ?? ""}/></label> : null}{isDone || isDeferred ? <span className={styles.status}>{isDone ? "Check recorded · lab only" : "Deferred · lab only"}</span> : <>
            <button className={styles.secondaryButton} disabled={task.previewOnly} onClick={() => task.sourceId ? onOpenSource(task.sourceId) : task.id === "reload" ? onOpenOffer() : task.manual ? onTaskState(task.id,"Done") : onInspectHistory()} type="button">{task.action}</button>
            {task.manual && task.id !== "reload" ? <button className={styles.linkButton} onClick={() => onDeferredChange([...deferred, task.id])} type="button">Defer</button> : null}
          </>}{isDone || isDeferred ? <button className={styles.linkButton} onClick={() => { onDoneChange(done.filter(id => id !== task.id)); onDeferredChange(deferred.filter(id => id !== task.id)); onTaskState(task.id,"To Do"); }} type="button">Undo</button> : null}</div>
        </article>;
      })}</div>
    </section>)}
  </div>;
}

export function DesignLabOfferWorkflow({ records, onCreated, onOpenRecord, onReturn }: {
  records: LabRecord[]; onCreated: (rows: LabRecord[]) => void; onOpenRecord: (id: string) => void; onReturn: () => void;
}) {
  const [selected, setSelected] = useState<LabOfferProfile[]>(["LAB-PROFILE-A", "LAB-PROFILE-B"]);
  const [reviewed, setReviewed] = useState(false);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [results, setResults] = useState<LabCopyResult[] | null>(null);
  const [stage, setStage] = useState<"definition" | "preview" | "results">("definition");
  const [copyError, setCopyError] = useState("");

  function confirm() {
    const copy = copyLabReload({ selected, reviewedWarnings: reviewed, existing: records,
      failProfile: simulateFailure ? "LAB-PROFILE-B" : undefined });
    onCreated(copy.created);
    setResults(copy.results);
    const failed = copy.results.find(item => item.state === "Failed");
    setCopyError(failed ? `Copy Failed — ${profileName(failed.profileId)}` : "");
    setStage("results");
  }
  return <div className={local.offer} data-pd-id="lab.offer-workflow">
    {copyError ? <StatusToast message={copyError} onDismiss={() => setCopyError("")} tone="error" /> : null}
    <button className={styles.linkButton} onClick={onReturn} type="button">← Back to Today</button>
    <div className={local.todayLead}><div><h2>Shared Offer Definition</h2><p>One definition · separate Profile-owned Prospecting records · simulation</p></div><span className={styles.status}>{labReloadDefinition.status}</span></div>
    <section className={styles.surface}><div className={styles.sectionHead}><h2>{labReloadDefinition.name}</h2><span>{labReloadDefinition.id}</span></div>
      <dl className={local.definitionGrid}><div><dt>Bookmaker</dt><dd>{labReloadDefinition.bookmaker}</dd></div><div><dt>Offer Type</dt><dd>{labReloadDefinition.offerType}</dd></div><div><dt>Schedule</dt><dd>{labReloadDefinition.schedule}</dd></div><div><dt>Last Reviewed</dt><dd>{labReloadDefinition.lastReviewed}</dd></div><div><dt>Next Expected Check</dt><dd>{labReloadDefinition.nextExpectedCheck}</dd></div><div><dt>Current Availability</dt><dd>Unverified · human check required</dd></div></dl>
      <div className={local.offerText}><strong>Original Synthetic Offer Text</strong><p>{labReloadDefinition.offerText}</p></div>
      <div className={local.offerText}><strong>Recorded Synthetic Review History</strong><p>{labReloadDefinition.reviewHistory.map(item => `${item.profile} · ${item.date}`).join("; ")}. This shows previous checks only, not current promotion availability.</p></div>
      <p className={local.subtle}>Requirements are descriptive only. Opt-in, deposit, stake, odds, strategy and placement confirmations are not copied.</p>
    </section>
    <section className={styles.surface}><div className={styles.sectionHead}><h2>Per-Profile Eligibility</h2><span>Account + Provider Authority</span></div>
      <div className={local.targetList}>{labOfferTargets.map(target => <label className={local.target} key={target.profileId}>
        <input aria-label={`Select ${target.profileName}`} checked={selected.includes(target.profileId)} disabled={target.eligibility === "blocked"} onChange={event => setSelected(current => event.target.checked ? [...current, target.profileId] : current.filter(id => id !== target.profileId))} type="checkbox" />
        <span><strong>{target.profileName}</strong><small>{target.account} · {target.exchange} · commission {target.commission}</small></span>
        <span className={styles.status}>{target.eligibility === "eligible" ? "Eligible" : target.eligibility === "review" ? "Review required" : "Blocked"}</span>
        <small className={local.targetReason}>{target.reason}</small>
      </label>)}</div>
      <label className={local.reviewCheck}><input checked={reviewed} onChange={event => setReviewed(event.target.checked)} type="checkbox" /> I reviewed Profile B&apos;s Limited Account warning</label>
      {stage === "definition" ? <div className={local.actions}><button className={styles.primaryButton} onClick={() => setStage("preview")} type="button">Preview Per-Profile Drafts</button></div> : null}
    </section>
    {stage !== "definition" ? <section className={styles.surface} data-pd-id="lab.offer-preview"><div className={styles.sectionHead}><h2>{stage === "results" ? "Copy Results" : "Preview · Prospecting Only"}</h2><span>{selected.length} selected</span></div>
      <div className={local.previewRows}>{labOfferTargets.map(target => {
        const result = results?.find(item => item.profileId === target.profileId);
        const status = result?.state ?? (target.eligibility === "blocked" ? "Blocked" : selected.includes(target.profileId) ? target.eligibility === "review" && !reviewed ? "Review required" : "Proposed" : "Skipped");
        return <div className={local.previewRow} data-result={status} key={target.profileId}><strong>{target.profileName}</strong><span>{target.account}</span><span className={status === "Failed" ? local.failedStatus : status === "Created" ? local.createdStatus : undefined}>{status === "Failed" ? <span aria-hidden="true" className="material-symbols-outlined">error</span> : null}{status}</span><small>{result?.detail ?? (status === "Proposed" ? "New separate Prospecting row; execution fields unset" : target.reason)}{status === "Failed" ? " Retry this Profile." : ""}</small>{result?.recordId && records.some(row => row.id === result.recordId) ? <button className={styles.linkButton} onClick={() => onOpenRecord(result.recordId!)} type="button">Open {result.recordId}</button> : null}</div>;
      })}</div>
      {stage === "preview" ? <><label className={local.simulationCheck}><input checked={simulateFailure} onChange={event => setSimulateFailure(event.target.checked)} type="checkbox" /> Simulate Profile B save failure on this attempt</label><div className={local.actions}><button className={styles.secondaryButton} onClick={() => setStage("definition")} type="button">Back to Definition</button><button className={styles.primaryButton} disabled={!selected.length || (selected.includes("LAB-PROFILE-B") && !reviewed)} onClick={confirm} type="button">Confirm Simulated Copy</button></div></> : <div className={local.actions}><button className={styles.secondaryButton} onClick={onReturn} type="button">Return to Today</button>{results?.some(item => item.state === "Failed") ? <button className={styles.primaryButton} onClick={() => { const failedIds = results.filter(item => item.state === "Failed").map(item => item.profileId); const retry = copyLabReload({ selected: failedIds, reviewedWarnings: reviewed, existing: records }); onCreated(retry.created); setResults(previous => previous?.map(item => failedIds.includes(item.profileId) ? retry.results.find(next => next.profileId === item.profileId) ?? item : item) ?? retry.results); setCopyError(retry.results.some(item => item.state === "Failed") ? "Copy Failed — Retry this Profile" : ""); }} type="button">Retry Failed Target</button> : null}<button className={styles.secondaryButton} onClick={() => setStage("preview")} type="button">Review Copy Again</button></div>}
    </section> : null}
    <section className={styles.surface}><h2>Recurring Definitions · Preview</h2><div className={local.definitionTiles}><article><strong>Friday Free Spins Check</strong><p>Bookmaker C · Friday routine · Profiles A/B · last check 30 Oct · next expected 6 Nov · Active</p><small>Expected check does not prove an available offer.</small></article><article><strong>Daily Casino Free Spins</strong><p>Bookmaker C · daily routine · Profile A · next check 2 Nov · Active</p><small>Per-Profile completion stays separate.</small></article><article><strong>Friday Scratch-Card Check</strong><p>Bookmaker C · Friday routine · Profile B · next expected 6 Nov · Paused</p><small>Preview only; no scheduler or transaction creation.</small></article></div></section>
  </div>;
}
