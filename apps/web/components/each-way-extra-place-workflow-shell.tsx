"use client";

import { useCallback, useEffect, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { FinancialValue } from "@/components/financial-value";
import { LedgerAddRowButton } from "@/components/ledger-add-row-button";

type Row = Record<string, string | null> & {
  each_way_extra_place_id: string;
  mode: "Each Way" | "Extra Place";
  status: string;
  result: string;
  calculation_state: string;
  calculation_notes: string[];
};

type Form = {
  placed_at: string;
  runner: string;
  race: string;
  bookmaker: string;
  bookmaker_account: string;
  mode: "Each Way" | "Extra Place";
  each_way_stake: string;
  back_odds: string;
  place_term_numerator: string;
  place_term_denominator: string;
  bookmaker_places: string;
  exchange_places: string;
  win_exchange: string;
  win_lay_odds: string;
  win_commission: string;
  actual_win_lay_stake: string;
  place_exchange: string;
  place_lay_odds: string;
  place_commission: string;
  actual_place_lay_stake: string;
  status: string;
  result: string;
  finishing_position: string;
  user_notes: string;
};

const emptyForm = (): Form => ({
  placed_at: "",
  runner: "",
  race: "",
  bookmaker: "",
  bookmaker_account: "",
  mode: "Extra Place",
  each_way_stake: "",
  back_odds: "",
  place_term_numerator: "1",
  place_term_denominator: "5",
  bookmaker_places: "",
  exchange_places: "",
  win_exchange: "",
  win_lay_odds: "",
  win_commission: "0",
  actual_win_lay_stake: "",
  place_exchange: "",
  place_lay_odds: "",
  place_commission: "0",
  actual_place_lay_stake: "",
  status: "Prospecting",
  result: "Pending",
  finishing_position: "",
  user_notes: "",
});

const numberFields = new Set([
  "each_way_stake", "back_odds", "place_term_numerator", "place_term_denominator",
  "win_lay_odds", "win_commission", "actual_win_lay_stake", "place_lay_odds",
  "place_commission", "actual_place_lay_stake", "bookmaker_places", "exchange_places",
  "finishing_position",
]);

function numberValue(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: string | null | undefined) {
  const parsed = numberValue(value);
  return parsed === null ? "£ -" : <FinancialValue animate={false} label="Calculated financial value" value={parsed} />;
}

export function EachWayExtraPlaceWorkflowShell({ profileId }: { profileId: string }) {
  const baseUrl = `${apiBaseUrl}/profiles/${profileId}/each-way-extra-places`;
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [preview, setPreview] = useState<Row | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(baseUrl);
    if (response.ok) setRows(await response.json());
  }, [baseUrl]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load, profileId]);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(async () => {
      const response = await fetch(`${baseUrl}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (response.ok) setPreview(await response.json());
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [baseUrl, form, open]);

  const openNew = () => {
    setForm(emptyForm());
    setPreview(null);
    setSelectedId(null);
    setActiveStep(0);
    setError("");
    setOpen(true);
  };

  const openRow = (row: Row) => {
    const next = emptyForm();
    for (const key of Object.keys(next) as Array<keyof Form>) {
      const value = String(row[key] ?? next[key]);
      if (key === "mode") {
        next.mode = value === "Each Way" ? "Each Way" : "Extra Place";
      } else {
        next[key] = value as never;
      }
    }
    setForm(next);
    setPreview(row);
    setSelectedId(row.each_way_extra_place_id);
    setActiveStep(0);
    setError("");
    setOpen(true);
  };

  const update = (key: keyof Form, value: string) => {
    if (numberFields.has(key) && value && !/^\d*(?:\.\d*)?$/.test(value)) return;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    const response = await fetch(selectedId ? `${baseUrl}/${selectedId}` : baseUrl, {
      method: selectedId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!response.ok) {
      setError((await response.json()).detail || "Could not save the Each Way row.");
      return;
    }
    await load();
    setOpen(false);
  };

  const copyStake = async (value: string | null | undefined) => {
    if (!value) return;
    await navigator.clipboard?.writeText(value);
  };

  const steps = ["Calculate", "Bet Details", "Settlement"];
  const resultOptions = form.mode === "Extra Place"
    ? ["Pending", "Win", "Standard Place", "Extra Place", "Unplaced", "Void/NR"]
    : ["Pending", "Win", "Standard Place", "Unplaced", "Void/NR"];

  return (
    <section className="content-panel stack" data-pd-id="each-way-extra-places.ledger">
      <div className="tracker-toolbar">
        <div className="stack"><span className="eyebrow">Horse racing</span><h1>Each Way / Extra Places</h1></div>
        <LedgerAddRowButton label="Add Each Way / Extra Place row" onClick={openNew} />
      </div>
      <div className="table-scroll" data-pd-id="each-way-extra-places.table-scroll">
        <table className="data-table"><thead><tr><th>Date</th><th>Runner / Race</th><th>Mode</th><th>Bookmaker</th><th>E/W Stake</th><th>Back Odds</th><th>Win Lay</th><th>Place Lay</th><th>Qualifying Loss</th><th>Extra Place Profit</th><th>Result</th><th>Value</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.each_way_extra_place_id} onClick={() => openRow(row)}><td>{row.placed_at || "-"}</td><td><strong>{row.runner || "Runner pending"}</strong><br />{row.race || "Race pending"}</td><td>{row.mode}</td><td>{row.bookmaker || "-"}</td><td>{money(row.each_way_stake)}</td><td>{row.back_odds || "-"}</td><td>{money(row.win_lay_stake)}</td><td>{money(row.place_lay_stake)}</td><td>{money(row.qualifying_loss)}</td><td>{row.mode === "Extra Place" ? money(row.extra_place_profit) : "-"}</td><td>{row.result}</td><td>{money(row.final_value || row.current_value)}</td></tr>)}
          {rows.length === 0 ? <tr><td colSpan={12}>No Each Way / Extra Place rows yet. Use the calculator to assess an opportunity before adding race details.</td></tr> : null}</tbody>
        </table>
      </div>
      {open ? <div className="modal-backdrop" onClick={() => setOpen(false)}><section aria-label={selectedId ? "Edit Each Way / Extra Place row" : "Create Each Way / Extra Place row"} aria-modal="true" className="content-panel stack workflow-editor-panel modal-panel workflow-editor-modal sportsbook-tabbed-editor-modal" data-pd-id="each-way-extra-places.editor.dialog" onClick={(event) => event.stopPropagation()} role="dialog">
        <header className="workflow-panel-header workflow-editor-header"><div className="stack"><span className="eyebrow">{selectedId ? "Edit Each Way / Extra Place row" : "Create Each Way / Extra Place row"}</span><strong>{form.runner || "New racing opportunity"}</strong></div><div className="editor-compact-summary"><span className="table-chip">{form.mode}</span><span className="table-chip">{form.status}</span><span className="table-chip">{money(preview?.current_value)}</span></div><button aria-label="Close Each Way / Extra Place editor" className="icon-button" onClick={() => setOpen(false)} type="button"><span className="material-symbols-outlined">close</span></button></header>
        <nav aria-label="Each Way workflow steps" className="ledger-editor-tab-rail">{steps.map((step, index) => <button aria-current={activeStep === index ? "step" : undefined} className={`ledger-editor-tab-button${activeStep === index ? " is-active" : ""}`} key={step} onClick={() => setActiveStep(index)} type="button"><span className="ledger-editor-step-marker">{index + 1}</span>{step}</button>)}</nav>
        {error ? <div className="editor-validation-banner" role="alert">{error}</div> : null}
        {activeStep === 0 ? <section className="workflow-editor-body stack"><h2>Calculate</h2><div className="tracker-nav"><button aria-pressed={form.mode === "Each Way"} className="review-chip" onClick={() => update("mode", "Each Way")} type="button">Each Way</button><button aria-pressed={form.mode === "Extra Place"} className="review-chip review-chip-action-positive" onClick={() => update("mode", "Extra Place")} type="button">Extra Place</button></div><div className="form-grid calculator-input-grid"><section className="field-span-2 calculator-segment calculator-segment-back"><h3>Back Bet</h3><Field label="E/W Stake" value={form.each_way_stake} onChange={(value) => update("each_way_stake", value)} /><Field label="Back Odds" value={form.back_odds} onChange={(value) => update("back_odds", value)} /><Field label="Each-Way Terms" value={`${form.place_term_numerator}/${form.place_term_denominator}`} onChange={(value) => { const [num, den] = value.split("/"); update("place_term_numerator", num || ""); update("place_term_denominator", den || ""); }} /></section><section className="field-span-2 calculator-segment calculator-segment-lay"><h3>Lay The Win</h3><Field label="Win Lay Odds" value={form.win_lay_odds} onChange={(value) => update("win_lay_odds", value)} /><Field label="Commission %" value={form.win_commission} onChange={(value) => update("win_commission", value)} /><CalculatedStake label="Win Lay Stake" value={preview?.win_lay_stake} liability={preview?.win_liability} onCopy={copyStake} /></section><section className="field-span-2 calculator-segment calculator-segment-lay"><h3>Lay The Place</h3><Field label="Place Lay Odds" value={form.place_lay_odds} onChange={(value) => update("place_lay_odds", value)} /><Field label="Commission %" value={form.place_commission} onChange={(value) => update("place_commission", value)} /><CalculatedStake label="Place Lay Stake" value={preview?.place_lay_stake} liability={preview?.place_liability} onCopy={copyStake} /></section></div><OutcomeMatrix preview={preview} mode={form.mode} /></section> : null}
        {activeStep === 1 ? <section className="workflow-editor-body stack"><h2>Bet Details / Placement</h2><div className="form-grid"><Field label="Runner / Horse" value={form.runner} onChange={(value) => update("runner", value)} /><Field label="Race" value={form.race} onChange={(value) => update("race", value)} /><Field label="Date / Time" type="datetime-local" value={form.placed_at} onChange={(value) => update("placed_at", value)} /><Field label="Bookmaker" value={form.bookmaker} onChange={(value) => update("bookmaker", value)} /><Field label="Win Exchange" value={form.win_exchange} onChange={(value) => update("win_exchange", value)} /><Field label="Place Exchange" value={form.place_exchange} onChange={(value) => update("place_exchange", value)} /><Field label="Bookmaker Places" value={form.bookmaker_places} onChange={(value) => update("bookmaker_places", value)} /><Field label="Exchange Places" value={form.exchange_places} onChange={(value) => update("exchange_places", value)} /></div></section> : null}
        {activeStep === 2 ? <section className="workflow-editor-body stack"><h2>Settlement</h2><div className="form-grid"><Select label="Status" value={form.status} options={["Prospecting", "Placed", "Settled", "Void"]} onChange={(value) => update("status", value)} /><Select label="Result" value={form.result} options={resultOptions} onChange={(value) => update("result", value)} /><Field label="Finishing Position" value={form.finishing_position} onChange={(value) => update("finishing_position", value)} /><label className="field-span-2"><span>Notes</span><textarea value={form.user_notes} onChange={(event) => update("user_notes", event.target.value)} /></label></div><OutcomeMatrix preview={preview} mode={form.mode} /></section> : null}
        <footer className="field-span-2 workflow-editor-footer"><div className="tracker-nav"><button className="modal-primary-button" disabled={saving} onClick={() => void save()} type="button">{saving ? "Saving" : "Save"}</button><button className="button-link" onClick={() => { setForm(selectedId ? form : emptyForm()); setOpen(false); }} type="button">Cancel</button></div><div className="tracker-nav"><button className="button-link" disabled={activeStep === 0} onClick={() => setActiveStep((step) => step - 1)} type="button">Previous</button><button className="modal-primary-button" disabled={activeStep === steps.length - 1} onClick={() => setActiveStep((step) => step + 1)} type="button">Next</button></div></footer>
      </section></div> : null}
    </section>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label><span>{label}</span><input inputMode={type === "text" ? "decimal" : undefined} onChange={(event) => onChange(event.target.value)} type={type} value={value} /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label><span>{label}</span><select onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function CalculatedStake({ label, value, liability, onCopy }: { label: string; value: string | null | undefined; liability: string | null | undefined; onCopy: (value: string | null | undefined) => void }) {
  return <div className="calculator-result-card"><strong>{label}</strong><span>{money(value)}</span><small>Liability {money(liability)}</small><button className="button-link" disabled={!value} onClick={() => void onCopy(value)} type="button">Copy stake</button></div>;
}

function OutcomeMatrix({ preview, mode }: { preview: Row | null; mode: "Each Way" | "Extra Place" }) {
  const rows = [["Win", preview?.first_place_pnl], ["Standard Place", preview?.standard_place_pnl], ...(mode === "Extra Place" ? [["Extra Place", preview?.extra_place_pnl] as [string, string | null | undefined]] : []), ["Unplaced", preview?.unplaced_pnl], ["Qualifying Loss", preview?.qualifying_loss]];
  return <section className="calculator-result-card"><h3>Outcome Matrix</h3>{rows.map(([label, value]) => <div className="summary-list" key={label}><span>{label}</span><strong>{money(value)}</strong></div>)}</section>;
}
