"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { apiBaseUrl } from "@/lib/api";
import type { TableColumn } from "@/lib/tracker-modules";
import {
  filterTrackerRows,
  getTrackerPageCount,
  paginateTrackerRows,
} from "@/lib/tracker-table";
import type { TrackerRow } from "@/lib/tracker-types";

type SportsbookRecord = {
  sportsbook_bet_id: string;
  profile_id: string;
  event_name: string;
  offer_text: string;
  bookmaker: string;
  offer_type: string;
  status: string;
  result: string;
  back_stake: string;
  back_odds: string;
  match_strategy: string;
  lay_odds_1: string;
  lay_commission_1: string;
  exchange_name: string;
  date_settled: string;
  user_notes: string;
  manual_override_value: string;
  manual_override_reason: string;
  created_at: string;
  updated_at: string;
  calculation_state: string;
  calculation_notes: string[];
  match_rating: string | null;
  calculated_liability_1: string | null;
  projected_current_pnl: string | null;
  actual_net_pnl: string | null;
  final_net_pnl: string | null;
  reporting_value: string | null;
  lay_status: string;
  counts_as_open: boolean;
  is_overdue: boolean;
};

type SportsbookFormState = {
  sportsbook_bet_id?: string;
  event_name: string;
  offer_text: string;
  bookmaker: string;
  offer_type: string;
  status: string;
  result: string;
  back_stake: string;
  back_odds: string;
  match_strategy: string;
  lay_odds_1: string;
  lay_commission_1: string;
  exchange_name: string;
  date_settled: string;
  user_notes: string;
  manual_override_value: string;
  manual_override_reason: string;
};

const tableColumns: TableColumn[] = [
  { key: "sportsbook_bet_id", label: "Bet ID" },
  { key: "date_settled", label: "Settles" },
  { key: "bookmaker", label: "Bookmaker" },
  { key: "status", label: "Status" },
  { key: "result", label: "Result" },
  { key: "back_stake", label: "Back stake", align: "end" },
  { key: "back_odds", label: "Back odds", align: "end" },
  { key: "match_strategy", label: "Strategy" },
  { key: "lay_odds_1", label: "Lay odds", align: "end" },
  { key: "lay_commission_1", label: "Commission", align: "end" },
  { key: "projected_current_pnl", label: "Current value", align: "end" },
  { key: "calculated_liability_1", label: "Liability", align: "end" },
  { key: "calculation_state", label: "Calc state" },
  { key: "exchange_name", label: "Exchange" },
  { key: "event_name", label: "Event" },
];

const statusOptions = ["Prospecting", "Not Placed", "Placed", "Settled"];
const resultOptions = [
  "Pending",
  "Back Won",
  "Lay Won",
  "Lay Won + Cashback",
  "Outcome 2 Won",
  "Outcome 3 Won",
  "Void",
  "Mixed",
];
const strategyOptions = [
  "Standard",
  "Underlay",
  "Overlay",
  "Custom",
  "No Lay",
  "Partial Lay",
  "Multilay",
  "Multilay-Underlay",
];

function createBlankForm(): SportsbookFormState {
  return {
    event_name: "",
    offer_text: "",
    bookmaker: "",
    offer_type: "",
    status: "Prospecting",
    result: "Pending",
    back_stake: "",
    back_odds: "",
    match_strategy: "Standard",
    lay_odds_1: "",
    lay_commission_1: "",
    exchange_name: "",
    date_settled: "",
    user_notes: "",
    manual_override_value: "",
    manual_override_reason: "",
  };
}

function recordToForm(record: SportsbookRecord): SportsbookFormState {
  return {
    sportsbook_bet_id: record.sportsbook_bet_id,
    event_name: record.event_name,
    offer_text: record.offer_text,
    bookmaker: record.bookmaker,
    offer_type: record.offer_type,
    status: record.status,
    result: record.result,
    back_stake: record.back_stake,
    back_odds: record.back_odds,
    match_strategy: record.match_strategy,
    lay_odds_1: record.lay_odds_1,
    lay_commission_1: record.lay_commission_1,
    exchange_name: record.exchange_name,
    date_settled: record.date_settled,
    user_notes: record.user_notes,
    manual_override_value: record.manual_override_value,
    manual_override_reason: record.manual_override_reason,
  };
}

export function SportsbookWorkflowShell({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<SportsbookRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<SportsbookFormState>(createBlankForm);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState("Loading sportsbook workflow...");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const pageSize = 10;

  const loadRows = useCallback(
    async (preferredSelection?: string | null) => {
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load sportsbook rows");
      }

      const nextRows = (await response.json()) as SportsbookRecord[];
      startTransition(() => {
        setRows(nextRows);
        const selected =
          preferredSelection &&
          nextRows.some((row) => row.sportsbook_bet_id === preferredSelection)
            ? preferredSelection
            : nextRows[0]?.sportsbook_bet_id ?? null;
        setSelectedId(selected);
        if (selected) {
          const activeRecord = nextRows.find((row) => row.sportsbook_bet_id === selected);
          if (activeRecord) {
            setFormState(recordToForm(activeRecord));
          }
        } else {
          setFormState(createBlankForm());
        }
        setStatusMessage(`Loaded ${nextRows.length} sportsbook rows for this profile.`);
      });
    },
    [profileId, startTransition]
  );

  useEffect(() => {
    loadRows().catch((error: Error) => {
      setErrorMessage(error.message);
      setStatusMessage("Sportsbook workflow could not be loaded.");
    });
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const tableRows: TrackerRow[] = rows.map((row) => ({
      sportsbook_bet_id: row.sportsbook_bet_id,
      date_settled: row.date_settled,
      bookmaker: row.bookmaker,
      status: row.status,
      result: row.result,
      back_stake: row.back_stake,
      back_odds: row.back_odds,
      match_strategy: row.match_strategy,
      lay_odds_1: row.lay_odds_1,
      lay_commission_1: row.lay_commission_1,
      projected_current_pnl: row.projected_current_pnl ?? "",
      calculated_liability_1: row.calculated_liability_1 ?? "",
      calculation_state: row.calculation_state,
      exchange_name: row.exchange_name,
      event_name: row.event_name,
    }));

    return filterTrackerRows(tableRows, tableColumns, query);
  }, [query, rows]);

  const pageCount = getTrackerPageCount(filteredRows.length, pageSize);
  const effectivePage = Math.min(currentPage, pageCount);
  const pagedRows = useMemo(
    () => paginateTrackerRows(filteredRows, effectivePage, pageSize),
    [effectivePage, filteredRows]
  );

  function selectRow(rowId: string) {
    const record = rows.find((entry) => entry.sportsbook_bet_id === rowId);
    if (!record) {
      return;
    }
    setSelectedId(rowId);
    setFormState(recordToForm(record));
    setErrorMessage("");
    setStatusMessage(`Loaded ${rowId} for review and editing.`);
  }

  function startNewRow() {
    setSelectedId(null);
    setFormState(createBlankForm());
    setErrorMessage("");
    setStatusMessage("Creating a new sportsbook row for this profile.");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    const isEditing = Boolean(selectedId);
    const url = isEditing
      ? `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${selectedId}`
      : `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`;
    const method = isEditing ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formState),
    });

    if (!response.ok) {
      const detail = await response.text();
      setErrorMessage(detail);
      return;
    }

    const saved = (await response.json()) as SportsbookRecord;
    await loadRows(saved.sportsbook_bet_id);
    setStatusMessage(
      isEditing
        ? `Updated ${saved.sportsbook_bet_id} inside this profile tracker.`
        : `Created ${saved.sportsbook_bet_id} inside this profile tracker.`
    );
  }

  return (
    <section className="stack">
      <section className="content-panel stack">
        <div className="table-toolbar">
          <div className="stack">
            <span className="eyebrow">Sportsbook workflow</span>
            <p className="lede">
              This is the first route, API, and storage-backed tracker workflow. It
              now renders contract-backed sportsbook values when required inputs are
              present. Missing or unresolved workbook inputs are flagged instead of
              guessed.
            </p>
          </div>
          <button className="button-link" onClick={startNewRow} type="button">
            Add sportsbook row
          </button>
        </div>
        <div className="table-controls" aria-label="Sportsbook table controls">
          <label className="field-control">
            <span>Filter rows</span>
            <input
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search sportsbook rows"
              type="search"
              value={query}
            />
          </label>
          <div className="table-status" aria-live="polite">
            {statusMessage}
          </div>
        </div>
        {errorMessage ? (
          <p className="error-text" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {tableColumns.map((column) => (
                  <th
                    className={column.align === "end" ? "align-end" : undefined}
                    key={column.key}
                    scope="col"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={tableColumns.length}>
                    No sportsbook rows match the current filter.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, index) => {
                  const rowId = String(row.sportsbook_bet_id);
                  const isSelected = selectedId === rowId;
                  return (
                    <tr
                      className={isSelected ? "is-selected-row" : undefined}
                      key={`${rowId}-${index}`}
                      onClick={() => selectRow(rowId)}
                    >
                      {tableColumns.map((column) => (
                        <td
                          className={column.align === "end" ? "align-end" : undefined}
                          key={column.key}
                        >
                          {row[column.key] || "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="table-pagination" aria-label="Sportsbook pagination">
          <div className="table-status">
            Page {effectivePage} of {pageCount}
          </div>
          <div className="tracker-nav">
            <button
              className="button-link"
              disabled={effectivePage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              type="button"
            >
              Previous
            </button>
            <button
              className="button-link"
              disabled={effectivePage === pageCount}
              onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="content-panel stack">
        <div className="stack">
          <span className="eyebrow">
            {selectedId ? `Editing ${selectedId}` : "New sportsbook row"}
          </span>
          <p className="lede">
            Contract-backed calculation outputs are shown below when the sportsbook row
            has enough approved inputs, including exchange commission.
          </p>
        </div>
        {selectedId ? (
          <section className="stat-strip" aria-label="Sportsbook calculation summary">
            <article className="stat-card">
              <span className="eyebrow">Calculation state</span>
              <strong>{rows.find((row) => row.sportsbook_bet_id === selectedId)?.calculation_state ?? "—"}</strong>
              <p className="lede">
                Lay status: {rows.find((row) => row.sportsbook_bet_id === selectedId)?.lay_status ?? "—"}
              </p>
            </article>
            <article className="stat-card">
              <span className="eyebrow">Current value</span>
              <strong>{rows.find((row) => row.sportsbook_bet_id === selectedId)?.projected_current_pnl ?? "—"}</strong>
              <p className="lede">
                Final value: {rows.find((row) => row.sportsbook_bet_id === selectedId)?.final_net_pnl ?? "—"}
              </p>
            </article>
            <article className="stat-card">
              <span className="eyebrow">Liability</span>
              <strong>{rows.find((row) => row.sportsbook_bet_id === selectedId)?.calculated_liability_1 ?? "—"}</strong>
              <p className="lede">
                Match rating: {rows.find((row) => row.sportsbook_bet_id === selectedId)?.match_rating ?? "—"}
              </p>
            </article>
          </section>
        ) : null}
        {selectedId && rows.find((row) => row.sportsbook_bet_id === selectedId)?.calculation_notes.length ? (
          <section className="content-subpanel stack">
            <span className="eyebrow">Calculation notes</span>
            {rows
              .find((row) => row.sportsbook_bet_id === selectedId)
              ?.calculation_notes.map((note) => (
                <p className="lede" key={note}>
                  {note}
                </p>
              ))}
          </section>
        ) : null}
        <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field-control">
            <span>Event name</span>
            <input
              onChange={(event) =>
                setFormState((current) => ({ ...current, event_name: event.target.value }))
              }
              required
              value={formState.event_name}
            />
          </label>
          <label className="field-control">
            <span>Bookmaker</span>
            <input
              onChange={(event) =>
                setFormState((current) => ({ ...current, bookmaker: event.target.value }))
              }
              required
              value={formState.bookmaker}
            />
          </label>
          <label className="field-control">
            <span>Status</span>
            <select
              onChange={(event) =>
                setFormState((current) => ({ ...current, status: event.target.value }))
              }
              value={formState.status}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field-control">
            <span>Result</span>
            <select
              onChange={(event) =>
                setFormState((current) => ({ ...current, result: event.target.value }))
              }
              value={formState.result}
            >
              {resultOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field-control">
            <span>Offer text</span>
            <input
              onChange={(event) =>
                setFormState((current) => ({ ...current, offer_text: event.target.value }))
              }
              value={formState.offer_text}
            />
          </label>
          <label className="field-control">
            <span>Offer type</span>
            <input
              onChange={(event) =>
                setFormState((current) => ({ ...current, offer_type: event.target.value }))
              }
              value={formState.offer_type}
            />
          </label>
          <label className="field-control">
            <span>Back stake</span>
            <input
              onChange={(event) =>
                setFormState((current) => ({ ...current, back_stake: event.target.value }))
              }
              value={formState.back_stake}
            />
          </label>
          <label className="field-control">
            <span>Back odds</span>
            <input
              onChange={(event) =>
                setFormState((current) => ({ ...current, back_odds: event.target.value }))
              }
              value={formState.back_odds}
            />
          </label>
          <label className="field-control">
            <span>Strategy</span>
            <select
              onChange={(event) =>
                setFormState((current) => ({ ...current, match_strategy: event.target.value }))
              }
              value={formState.match_strategy}
            >
              {strategyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field-control">
            <span>Lay odds 1</span>
            <input
              onChange={(event) =>
                setFormState((current) => ({ ...current, lay_odds_1: event.target.value }))
              }
              value={formState.lay_odds_1}
            />
          </label>
          <label className="field-control">
            <span>Exchange commission</span>
            <input
              onChange={(event) =>
                setFormState((current) => ({ ...current, lay_commission_1: event.target.value }))
              }
              placeholder="0.02"
              value={formState.lay_commission_1}
            />
          </label>
          <label className="field-control">
            <span>Exchange</span>
            <input
              onChange={(event) =>
                setFormState((current) => ({ ...current, exchange_name: event.target.value }))
              }
              value={formState.exchange_name}
            />
          </label>
          <label className="field-control">
            <span>Settles</span>
            <input
              onChange={(event) =>
                setFormState((current) => ({ ...current, date_settled: event.target.value }))
              }
              value={formState.date_settled}
            />
          </label>
          <label className="field-control field-span-2">
            <span>Manual override value</span>
            <input
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  manual_override_value: event.target.value,
                }))
              }
              value={formState.manual_override_value}
            />
          </label>
          <label className="field-control field-span-2">
            <span>Manual override reason</span>
            <input
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  manual_override_reason: event.target.value,
                }))
              }
              value={formState.manual_override_reason}
            />
          </label>
          <label className="field-control field-span-2">
            <span>Notes</span>
            <textarea
              onChange={(event) =>
                setFormState((current) => ({ ...current, user_notes: event.target.value }))
              }
              rows={5}
              value={formState.user_notes}
            />
          </label>
          <div className="tracker-nav field-span-2">
            <button className="button-link" disabled={isPending} type="submit">
              {selectedId ? "Save sportsbook row" : "Create sportsbook row"}
            </button>
            <button className="button-link" onClick={startNewRow} type="button">
              Reset form
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
