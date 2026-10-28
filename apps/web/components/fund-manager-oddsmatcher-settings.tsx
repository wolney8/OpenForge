"use client";

import { useEffect, useState } from "react";

import { CalculatorSegmentedControl } from "@/components/calculator-segmented-control";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { apiBaseUrl } from "@/lib/api";
import {
  defaultOddsMatcherPreferences,
  type OddsMatcherPreferences,
  type OddsMatcherSavedSnapshot,
} from "@/lib/oddsmatcher";

export function FundManagerOddsmatcherSettings() {
  const [preferences, setPreferences] = useState<OddsMatcherPreferences>(defaultOddsMatcherPreferences);
  const [snapshots, setSnapshots] = useState<OddsMatcherSavedSnapshot[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      fetch(`${apiBaseUrl}/fund-manager/preferences/oddsmatcher`, { cache: "no-store", credentials: "include", signal: controller.signal }),
      fetch(`${apiBaseUrl}/oddsmatcher/snapshots`, { cache: "no-store", credentials: "include", signal: controller.signal }),
    ]).then(async ([preferencesResponse, snapshotsResponse]) => {
      if (!preferencesResponse.ok) throw new Error("Oddsmatcher settings could not be loaded.");
      const nextPreferences = await preferencesResponse.json() as OddsMatcherPreferences;
      const nextSnapshots = snapshotsResponse.ok ? await snapshotsResponse.json() as OddsMatcherSavedSnapshot[] : [];
      setPreferences(nextPreferences);
      setSnapshots(nextSnapshots);
      setState("ready");
    }).catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "Oddsmatcher settings could not be loaded.");
      setState("error");
    });
    return () => controller.abort();
  }, []);

  const selectSource = (dataSource: "live" | "replay") => {
    setPreferences((current) => ({
      ...current,
      data_source: dataSource,
      saved_snapshot_id: dataSource === "replay"
        ? current.saved_snapshot_id || snapshots[0]?.snapshot_id || ""
        : current.saved_snapshot_id,
    }));
  };

  const save = async () => {
    setState("saving");
    setMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/fund-manager/preferences/oddsmatcher`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      if (!response.ok) throw new Error("Oddsmatcher settings could not be saved.");
      setPreferences(await response.json() as OddsMatcherPreferences);
      setState("ready");
      setMessage("Oddsmatcher settings saved.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Oddsmatcher settings could not be saved.");
    }
  };

  if (state === "loading") return <LedgerLoadingIndicator label="Loading Oddsmatcher settings" />;

  return <section className="content-panel stack" data-pd-id="fund-manager-settings.oddsmatcher">
    <header className="section-heading-row"><div><span className="eyebrow">Fund Manager Settings</span><h2>Oddsmatcher</h2></div></header>
    <div className="settings-form-grid oddsmatcher-universal-settings">
      <fieldset className="content-subpanel stack">
        <legend>Data Source</legend>
        <CalculatorSegmentedControl
          ariaLabel="Oddsmatcher data source"
          dataPdId="fund-manager-settings.oddsmatcher.data-source"
          onChange={selectSource}
          options={[{ label: "Live", value: "live" }, { label: "Saved Snapshot", value: "replay" }]}
          value={preferences.data_source}
        />
        {preferences.data_source === "replay" ? <label className="field-control" htmlFor="oddsmatcher-saved-snapshot-setting">
          <span>Saved Snapshot</span>
          <select
            disabled={!snapshots.length}
            id="oddsmatcher-saved-snapshot-setting"
            onChange={(event) => setPreferences((current) => ({ ...current, saved_snapshot_id: event.target.value }))}
            value={preferences.saved_snapshot_id}
          >
            {!snapshots.length ? <option value="">No saved snapshots available</option> : null}
            {snapshots.map((snapshot) => <option key={snapshot.snapshot_id} value={snapshot.snapshot_id}>{new Date(snapshot.captured_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</option>)}
          </select>
        </label> : null}
      </fieldset>
      <fieldset className="content-subpanel stack">
        <legend>Bet Summary defaults</legend>
        <button aria-checked={preferences.auto_update_back_odds} className={`material-switch oddsmatcher-auto-switch${preferences.auto_update_back_odds ? " is-selected" : ""}`} onClick={() => setPreferences((current) => ({ ...current, auto_update_back_odds: !current.auto_update_back_odds }))} role="switch" type="button"><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span><span>Auto-update Back Odds</span></button>
        <button aria-checked={preferences.auto_update_lay_odds} className={`material-switch oddsmatcher-auto-switch${preferences.auto_update_lay_odds ? " is-selected" : ""}`} onClick={() => setPreferences((current) => ({ ...current, auto_update_lay_odds: !current.auto_update_lay_odds }))} role="switch" type="button"><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span><span>Auto-update Lay Odds</span></button>
      </fieldset>
    </div>
    {message ? <p className={state === "error" ? "error-text" : "status-message"} role={state === "error" ? "alert" : "status"}>{message}</p> : null}
    <div className="settings-action-row"><button className="modal-primary-button" disabled={state === "saving" || (preferences.data_source === "replay" && !preferences.saved_snapshot_id)} onClick={() => void save()} type="button">{state === "saving" ? "Saving…" : "Save Oddsmatcher settings"}</button></div>
  </section>;
}
