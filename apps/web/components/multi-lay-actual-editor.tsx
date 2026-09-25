"use client";

import type { AccountAuthorityRecord } from "@/lib/account-authorities";
import { commissionRatioToPercentage, percentageToCommissionRatio } from "@/lib/commission-input";
import { CopyableFinancialValue } from "@/components/copyable-financial-value";
import { CalculatorOutcomes } from "@/components/calculator-outcomes";

export type MultiLayExecution = {
  version: "multi-lay-actual-v1"; revision: number; exchangeAccountId: string; market: string; commission: string;
  fills: Array<{ id: string; outcomeId: string; stake: string; odds: string }>;
  unmatched: Record<string, string>;
};
export type MultiLayActual = {
  exchange_exposure: string; matched_stake: string; unmatched_stake: string;
  scenarios: Array<{ key: string; label: string; total: string; exchange_gross: string; commission: string }>;
};

/** Uses the same form, disclosure, value and Outcomes primitives as CoreLayPlanner. */
export function MultiLayActualEditor({ accounts, legs, execution, savedExecution, actual, correctionReason, onCorrectionReason, onChange, onStart }: {
  accounts: AccountAuthorityRecord[]; legs: Array<{ id: string; label: string }>;
  execution?: MultiLayExecution; savedExecution?: MultiLayExecution; actual?: MultiLayActual | null;
  correctionReason: string; onCorrectionReason: (value: string) => void;
  onChange: (value: MultiLayExecution) => void; onStart: () => void;
}) {
  if (!execution) return <div className="stack" data-pd-id="sportsbook.multi-lay.actual">
    <p className="field-help">References and Copy do not record matches. Record the back bet and each actual exchange fill explicitly.</p>
    <button className="button-link icon-text-action" type="button" onClick={onStart}><span className="material-symbols-outlined" aria-hidden="true">add</span>Record actual placements</button>
  </div>;
  const patch = (values: Partial<MultiLayExecution>) => onChange({ ...execution, ...values });
  const exchanges = accounts.filter(a => a.type === "Exchange" && (a.account_id === execution.exchangeAccountId || (a.status !== "Archived" && a.lifecycle_status !== "Archived")));
  return <section className="content-subpanel stack" data-pd-id="sportsbook.multi-lay.actual" aria-label="Actual Multi-Lay placements">
    <h3>Actual placements</h3>
    <p className="field-help">Record fills from one Exchange Account and one market. Commission applies once to that market’s net winnings. Outcomes without a recorded fill remain unfilled. Unmatched orders never count as matches.</p>
    <div className="form-grid">
      <label className="field-control"><span>Actual Exchange Account</span><select aria-label="Actual Exchange Account" value={execution.exchangeAccountId} disabled={Boolean(savedExecution)} onChange={e => patch({ exchangeAccountId: e.target.value })}><option value="">Select Account</option>{exchanges.map(a => <option key={a.account_id} value={a.account_id}>{a.account}{exchanges.filter(b => b.account === a.account).length > 1 ? ` · ${a.account_id.slice(-8)}` : ""}</option>)}</select></label>
      <label className="field-control"><span>Exchange market</span><input value={execution.market} readOnly={Boolean(savedExecution)} onChange={e => patch({ market: e.target.value })} /></label>
      <label className="field-control"><span>Actual market commission (%)</span><input inputMode="decimal" value={commissionRatioToPercentage(execution.commission)} onChange={e => patch({ commission: percentageToCommissionRatio(e.target.value) })} /></label>
    </div>
    {legs.map((leg, index) => <fieldset className="section-fieldset stack" key={leg.id} data-pd-id={`sportsbook.multi-lay.actual.${leg.id}`}>
      <legend>{leg.label}</legend>
      {execution.fills.filter(f => f.outcomeId === leg.id).map((fill, fillIndex) => <div className="form-grid" key={fill.id}>
        <label className="field-control"><span>Matched stake (£)</span><input aria-label={`${leg.label} fill ${fillIndex + 1} matched stake`} inputMode="decimal" value={fill.stake} onChange={e => patch({ fills: execution.fills.map(f => f.id === fill.id ? { ...f, stake: e.target.value } : f) })} /></label>
        <label className="field-control"><span>Actual lay odds</span><input aria-label={`${leg.label} fill ${fillIndex + 1} actual odds`} inputMode="decimal" value={fill.odds} onChange={e => patch({ fills: execution.fills.map(f => f.id === fill.id ? { ...f, odds: e.target.value } : f) })} /></label>
        <button className="icon-button danger-button" aria-label={`Remove ${leg.label} fill ${fillIndex + 1}`} type="button" onClick={() => patch({ fills: execution.fills.filter(f => f.id !== fill.id) })}><span className="material-symbols-outlined" aria-hidden="true">delete</span></button>
      </div>)}
      <div className="form-grid">
        <label className="field-control"><span>Unmatched stake (£)</span><input aria-label={`${leg.label} unmatched stake`} inputMode="decimal" value={execution.unmatched[leg.id] ?? ""} onChange={e => patch({ unmatched: { ...execution.unmatched, [leg.id]: e.target.value } })} /><span className="field-help">Enter 0 only when no order remains unmatched.</span></label>
        <button className="button-link icon-text-action" type="button" onClick={() => patch({ fills: [...execution.fills, { id: crypto.randomUUID(), outcomeId: leg.id, stake: "", odds: "" }] })}><span className="material-symbols-outlined" aria-hidden="true">add</span>Add fill for {leg.label || `outcome ${index + 1}`}</button>
      </div>
    </fieldset>)}
    {savedExecution ? <label className="field-control"><span>Correction reason</span><input value={correctionReason} onChange={e => onCorrectionReason(e.target.value)} /><span className="field-help">Required to change saved fills, commission or a settled outcome. Previous values remain in History.</span></label> : null}
    <div className="form-grid">
      <p>Recorded matched stake <CopyableFinancialValue label="Recorded matched stake" value={actual?.matched_stake} /></p>
      <p>Unmatched orders <CopyableFinancialValue label="Unmatched orders" value={actual?.unmatched_stake} /></p>
      <p>Exchange exposure <CopyableFinancialValue label="Actual exchange exposure" value={actual?.exchange_exposure} /></p>
    </div>
    {actual ? <CalculatorOutcomes inspectionId="sportsbook.multi-lay.actual.outcomes" title="Actual-fill outcomes" rows={actual.scenarios.map(s => ({ ...s, copyableTotal: true }))} /> : <p role="status">Complete actual inputs to calculate the recorded position.</p>}
  </section>;
}
