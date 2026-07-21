"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { StatusToast } from "@/components/status-toast";
import { apiBaseUrl } from "@/lib/api";
import {
  getActiveMasterAccountNames,
  type MasterAccountCatalogue,
} from "@/lib/bookmaker-catalogue";
import {
  betTypeOptions,
  casinoOfferTypeOptions,
  fixtureTypeOptions,
  sportsbookOfferTypeOptions,
} from "@/lib/workbook-options";

export type CommonBetCombo = {
  preset_id: string;
  name: string;
  ledger_type: "Sportsbook" | "Casino";
  bookmaker: string;
  bookmakers: string[];
  offer_type: string;
  bet_type: string;
  offer_name: string;
  fixture_type: string;
  default_back_stake: string;
  minimum_back_odds: string;
  game: string;
  cash_stake: string;
  credit_amount: string;
  bonus_amount: string;
  wager_multiplier: string;
  required_spins: string;
  spin_stake: string;
  free_spins_awarded: string;
  free_spins_value: string;
  default_strategy: string;
  allowed_strategies: string[];
  status: "Active" | "Archived";
  version: number;
  sort_order: number;
};

const strategies = ["", "Standard", "Underlay", "Overlay", "Custom", "No Lay", "Partial Lay", "Multilay"];
const emptyDraft: CommonBetCombo = {
  preset_id: "",
  name: "",
  ledger_type: "Sportsbook",
  bookmaker: "",
  bookmakers: [],
  offer_type: "",
  bet_type: "",
  offer_name: "",
  fixture_type: "",
  default_back_stake: "",
  minimum_back_odds: "",
  game: "",
  cash_stake: "",
  credit_amount: "",
  bonus_amount: "",
  wager_multiplier: "",
  required_spins: "",
  spin_stake: "",
  free_spins_awarded: "",
  free_spins_value: "",
  default_strategy: "",
  allowed_strategies: ["Standard", "Underlay", "Overlay", "Custom"],
  status: "Active",
  version: 0,
  sort_order: 0,
};

export function CommonBetComboSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState<CommonBetCombo[]>([]);
  const [bookmakers, setBookmakers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [bookmakerSearch, setBookmakerSearch] = useState("");
  const [draft, setDraft] = useState<CommonBetCombo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [presetResponse, catalogueResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/fund-manager/common-bet-combos`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/account-catalogue/source`, { cache: "no-store" }),
      ]);
      if (!presetResponse.ok || !catalogueResponse.ok) {
        throw new Error("Common bet combos could not be loaded.");
      }
      const catalogue = (await catalogueResponse.json()) as MasterAccountCatalogue;
      setRows((await presetResponse.json()) as CommonBetCombo[]);
      setBookmakers(getActiveMasterAccountNames(catalogue.records, "Bookmaker"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Common bet combos could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, load]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!showArchived && row.status === "Archived") return false;
      return !query || [row.name, row.ledger_type, ...(row.bookmakers || []), row.bookmaker, row.offer_type, row.bet_type]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [rows, search, showArchived]);

  const visibleBookmakers = useMemo(() => {
    const query = bookmakerSearch.trim().toLowerCase();
    return bookmakers.filter((bookmaker) => !query || bookmaker.toLowerCase().includes(query));
  }, [bookmakerSearch, bookmakers]);

  function toggleBookmaker(bookmaker: string) {
    if (!draft) return;
    const isSelected = draft.bookmakers.includes(bookmaker);
    setDraft({
      ...draft,
      bookmaker: "",
      bookmakers: isSelected
        ? draft.bookmakers.filter((value) => value !== bookmaker)
        : [...draft.bookmakers, bookmaker],
    });
  }

  function bookmakerSummary(row: CommonBetCombo) {
    const values = row.bookmakers?.length ? row.bookmakers : row.bookmaker ? [row.bookmaker] : [];
    if (!values.length) return "Any eligible";
    if (values.length === 1) return values[0];
    return `${values.length} bookmakers`;
  }

  function openDialog() {
    setDraft(null);
    setSearch("");
    setShowArchived(false);
    setBookmakerSearch("");
    setError("");
    setIsOpen(true);
  }

  function closeDialog() {
    setIsOpen(false);
    setDraft(null);
    setSearch("");
    setShowArchived(false);
    setBookmakerSearch("");
    setError("");
  }

  async function save() {
    if (!draft?.name.trim()) return;
    setIsSaving(true);
    setError("");
    const isEditing = Boolean(draft.preset_id);
    const response = await fetch(
      isEditing
        ? `${apiBaseUrl}/fund-manager/common-bet-combos/${draft.preset_id}`
        : `${apiBaseUrl}/fund-manager/common-bet-combos`,
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      }
    );
    if (!response.ok) {
      setError(await response.text());
      setIsSaving(false);
      return;
    }
    setMessage(`${isEditing ? "Updated" : "Added"} ${draft.name}.`);
    setDraft(null);
    await load();
    setIsSaving(false);
  }

  return (
    <>
      <section className="content-panel stack" data-pd-id="common-bet-combos.section">
        <span className="eyebrow">Fund Manager quick actions</span>
        <h2>Common Bet Combos</h2>
        <button
          className="button-link settings-card-action"
          data-pd-id="common-bet-combos.manage"
          onClick={openDialog}
          type="button"
        >
          Manage Common Bet Combos
        </button>
      </section>
      {isOpen ? (
        <div className="modal-backdrop modal-backdrop-elevated">
          <section aria-label="Manage common bet combos" aria-modal="true" className="modal-panel workflow-editor-modal fund-manager-settings-modal common-bet-combo-modal" data-pd-id="common-bet-combos.dialog" role="dialog">
            <header className="workflow-editor-modal-header">
              <div><span className="eyebrow">Fund Manager Settings</span><h2>Common Bet Combos</h2></div>
              <button aria-label="Close common bet combos" className="modal-close-button" onClick={closeDialog} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button>
            </header>
            <div className="workflow-editor-modal-body stack common-bet-combo-body">
              {isLoading ? <LedgerLoadingIndicator label="Loading common bet combos" /> : null}
              {error ? <p className="error-text" role="alert">{error}</p> : null}
              {!isLoading && !draft ? (
                <>
                  <div className="table-toolbar common-bet-combo-toolbar">
                    <label className="field-control table-search-field"><span>Search</span><input aria-label="Search common bet combos" data-pd-id="common-bet-combos.search" onChange={(event) => setSearch(event.target.value)} type="search" value={search} /></label>
                    <label className={`profile-filter-chip common-bet-combo-archive-toggle${showArchived ? " is-selected" : ""}`}>
                      <input
                        checked={showArchived}
                        data-pd-id="common-bet-combos.show-archived"
                        onChange={(event) => setShowArchived(event.target.checked)}
                        type="checkbox"
                      />
                      <span>Show Archived</span>
                    </label>
                    <button className="button-link icon-text-action" data-pd-id="common-bet-combos.add" onClick={() => setDraft({ ...emptyDraft, sort_order: rows.length * 10 + 10 })} type="button"><span aria-hidden="true" className="material-symbols-outlined">add</span><span>Add Combo</span></button>
                  </div>
                  <div className="table-scroll" data-pd-id="common-bet-combos.table-scroll">
                    <table className="data-table"><thead><tr><th>Name</th><th>Ledger</th><th>Offer</th><th>Bookmaker</th><th>Status</th><th>Action</th></tr></thead><tbody>
                      {visibleRows.map((row) => <tr key={row.preset_id}><td>{row.name}</td><td>{row.ledger_type}</td><td>{row.offer_type || "Not set"}</td><td>{bookmakerSummary(row)}</td><td><span className="table-chip">{row.status}</span></td><td><button aria-label={`Edit ${row.name}`} className="icon-button" onClick={() => setDraft({ ...row, bookmakers: row.bookmakers?.length ? row.bookmakers : row.bookmaker ? [row.bookmaker] : [] })} type="button"><span aria-hidden="true" className="material-symbols-outlined">edit</span></button></td></tr>)}
                    </tbody></table>
                  </div>
                </>
              ) : null}
              {draft ? (
                <div className="stack common-bet-combo-editor" data-pd-id="common-bet-combos.editor">
                  <div className="form-grid common-bet-combo-form-grid">
                    <label className="field-control"><span>Combo Name</span><input maxLength={80} onChange={(event) => setDraft({ ...draft, name: event.target.value })} value={draft.name} /></label>
                    <label className="field-control"><span>Ledger</span><select aria-label="Combo ledger" data-pd-id="common-bet-combos.editor.ledger" onChange={(event) => setDraft({ ...draft, ledger_type: event.target.value as CommonBetCombo["ledger_type"], offer_type: "" })} value={draft.ledger_type}><option>Sportsbook</option><option>Casino</option></select></label>
                    <label className="field-control"><span>Offer Type</span><select onChange={(event) => setDraft({ ...draft, offer_type: event.target.value })} value={draft.offer_type}><option value="">Select</option>{(draft.ledger_type === "Casino" ? casinoOfferTypeOptions : sportsbookOfferTypeOptions).map((value) => <option key={value}>{value}</option>)}</select></label>
                    {draft.ledger_type === "Sportsbook" ? <label className="field-control"><span>Bet Type</span><select onChange={(event) => setDraft({ ...draft, bet_type: event.target.value })} value={draft.bet_type}><option value="">Select</option>{betTypeOptions.map((value) => <option key={value}>{value}</option>)}</select></label> : null}
                    <label className="field-control"><span>Offer Name</span><input maxLength={200} onChange={(event) => setDraft({ ...draft, offer_name: event.target.value })} placeholder="Optional free-text offer name" value={draft.offer_name} /></label>
                    {draft.ledger_type === "Sportsbook" ? <><label className="field-control"><span>Fixture Type</span><select onChange={(event) => setDraft({ ...draft, fixture_type: event.target.value })} value={draft.fixture_type}><option value="">Not set</option>{fixtureTypeOptions.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field-control"><span>Default Back Stake</span><input inputMode="decimal" onChange={(event) => setDraft({ ...draft, default_back_stake: event.target.value })} value={draft.default_back_stake} /></label><label className="field-control"><span>Minimum Back Odds</span><input inputMode="decimal" onChange={(event) => setDraft({ ...draft, minimum_back_odds: event.target.value })} value={draft.minimum_back_odds} /></label><label className="field-control"><span>Preferred Strategy</span><select aria-describedby="preferred-strategy-help" onChange={(event) => setDraft({ ...draft, default_strategy: event.target.value })} value={draft.default_strategy || ""}>{strategies.map((value) => <option key={value || "none"} value={value}>{value ? value === "Custom" ? "Custom Lay" : value === "Multilay" ? "Multi Lay" : value : "No preference"}</option>)}</select><small className="field-support-text" id="preferred-strategy-help">Sets the initial strategy only. It never prevents a later change.</small></label></> : <><label className="field-control"><span>Game / Slot</span><input maxLength={200} onChange={(event) => setDraft({ ...draft, game: event.target.value })} value={draft.game} /></label><label className="field-control"><span>Cash Stake</span><input inputMode="decimal" onChange={(event) => setDraft({ ...draft, cash_stake: event.target.value })} value={draft.cash_stake} /></label><label className="field-control"><span>Credit Amount</span><input inputMode="decimal" onChange={(event) => setDraft({ ...draft, credit_amount: event.target.value })} value={draft.credit_amount} /></label><label className="field-control"><span>Bonus Amount</span><input inputMode="decimal" onChange={(event) => setDraft({ ...draft, bonus_amount: event.target.value })} value={draft.bonus_amount} /></label><label className="field-control"><span>Wager Multiplier</span><input inputMode="decimal" onChange={(event) => setDraft({ ...draft, wager_multiplier: event.target.value })} value={draft.wager_multiplier} /></label><label className="field-control"><span>Required Spins</span><input inputMode="decimal" onChange={(event) => setDraft({ ...draft, required_spins: event.target.value })} value={draft.required_spins} /></label><label className="field-control"><span>Spin Stake</span><input inputMode="decimal" onChange={(event) => setDraft({ ...draft, spin_stake: event.target.value })} value={draft.spin_stake} /></label><label className="field-control"><span>Free Spins Awarded</span><input inputMode="decimal" onChange={(event) => setDraft({ ...draft, free_spins_awarded: event.target.value })} value={draft.free_spins_awarded} /></label><label className="field-control"><span>Free Spins Value</span><input inputMode="decimal" onChange={(event) => setDraft({ ...draft, free_spins_value: event.target.value })} value={draft.free_spins_value} /></label></>}
                    <label className="field-control"><span>Status</span><select onChange={(event) => setDraft({ ...draft, status: event.target.value as CommonBetCombo["status"] })} value={draft.status}><option>Active</option><option>Archived</option></select></label>
                  </div>
                  <fieldset className="common-bet-combo-choice-group"><legend>Known Bookmakers</legend><p className="field-support-text">Universal offer associations. Profile status is checked only when this combo is applied.</p>{draft.bookmakers.length ? <div aria-label="Selected known bookmakers" className="common-combo-candidate-row">{draft.bookmakers.map((bookmaker) => <button aria-label={`Remove ${bookmaker} from known bookmakers`} className="common-combo-candidate is-selected" key={bookmaker} onClick={() => toggleBookmaker(bookmaker)} type="button"><span>{bookmaker}</span><span aria-hidden="true" className="material-symbols-outlined">close</span></button>)}</div> : <p className="field-support-text">No associations selected; any eligible bookmaker may be used.</p>}<label className="field-control table-search-field common-bet-combo-bookmaker-search"><span>Search Bookmakers</span><input aria-label="Search known bookmakers" data-pd-id="common-bet-combos.bookmaker-search" onChange={(event) => setBookmakerSearch(event.target.value)} type="search" value={bookmakerSearch} /></label><div className="common-bet-combo-choice-grid">{visibleBookmakers.map((bookmaker) => <label className={`profile-filter-chip${draft.bookmakers.includes(bookmaker) ? " is-selected" : ""}`} key={bookmaker}><input checked={draft.bookmakers.includes(bookmaker)} onChange={() => toggleBookmaker(bookmaker)} type="checkbox" /><span>{bookmaker}</span></label>)}</div></fieldset>
                </div>
              ) : null}
            </div>
            <footer className="workflow-editor-modal-footer"><button className="button-link" onClick={() => draft ? setDraft(null) : closeDialog()} type="button">{draft ? "Back to Combos" : "Close"}</button>{draft ? <button className="modal-primary-button" disabled={!draft.name.trim() || isSaving} onClick={() => void save()} type="button">{isSaving ? "Saving" : "Save Combo"}</button> : null}</footer>
          </section>
        </div>
      ) : null}
      {message ? <StatusToast message={message} onDismiss={() => setMessage("")} tone="success" /> : null}
    </>
  );
}
