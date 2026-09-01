"use client";

import { useCallback, useEffect, useState } from "react";

import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { apiBaseUrl } from "@/lib/api";
import { FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT } from "@/lib/notifications";
import { dispatchTrackerDataUpdated } from "@/lib/tracker-data-events";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";

type ExchangeCommissionRecord = {
  profile_id: string;
  exchange_name: string;
  commission_rate: string;
  created_at: string;
  updated_at: string;
  configured: boolean;
  suggested_commission_rate: string;
  suggestion_source: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type Props = { profileId: string; onSaved?: () => void | Promise<void> };

function isValidCommission(value: string) {
  const normalized = value.trim();
  if (!normalized) return true;
  if (!/^\d*(?:\.\d*)?$/.test(normalized)) return false;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1;
}

function formatUpdatedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Last updated";
  return `Last updated ${new Intl.DateTimeFormat(undefined, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(parsed)}`;
}

export function ExchangeCommissionSettings({ profileId, onSaved }: Props) {
  const [rows, setRows] = useState<ExchangeCommissionRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [savedAt, setSavedAt] = useState<Record<string, string>>({});
  const [savedRates, setSavedRates] = useState<Record<string, string>>({});
  const [confirmExchange, setConfirmExchange] = useState<string | null>(null);

  useUnsavedChangesGuard(rows.some((row) => row.commission_rate !== savedRates[row.exchange_name]));

  const loadSettings = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/exchange-commissions`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load exchange commission settings.");
    const data = (await response.json()) as ExchangeCommissionRecord[];
    setRows(data);
    setSavedAt(Object.fromEntries(data.map((row) => [row.exchange_name, row.updated_at])));
    setSavedRates(Object.fromEntries(data.map((row) => [row.exchange_name, row.commission_rate])));
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSettings().catch((error: Error) => {
        setErrorMessage(error.message);
      });
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadSettings]);

  const saveRow = useCallback(async (exchangeName: string) => {
    const row = rows.find((entry) => entry.exchange_name === exchangeName);
    const commissionRate = row?.commission_rate ?? "";
    if (!row || !isValidCommission(commissionRate)) return;
    setSaveStates((current) => ({ ...current, [exchangeName]: "saving" }));
    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/exchange-commissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exchange_name: row.exchange_name, commission_rate: commissionRate.trim() }),
    });
    if (!response.ok) {
      setSaveStates((current) => ({ ...current, [exchangeName]: "error" }));
      setErrorMessage(await response.text());
      return;
    }
    const saved = (await response.json()) as ExchangeCommissionRecord;
    setRows((current) => current.map((entry) => entry.exchange_name === exchangeName ? saved : entry));
    setSavedAt((current) => ({ ...current, [exchangeName]: saved.updated_at }));
    setSavedRates((current) => ({ ...current, [exchangeName]: saved.commission_rate }));
    setSaveStates((current) => ({ ...current, [exchangeName]: "saved" }));
    dispatchTrackerDataUpdated({ profileId });
    window.dispatchEvent(new Event(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT));
    if (onSaved) await onSaved();
    setConfirmExchange(null);
  }, [onSaved, profileId, rows]);

  return (
    <section aria-label="Exchange commission settings" className="content-subpanel stack" data-pd-id="profile-settings.commission">
      <div><span className="eyebrow">Exchange commission</span><h2>Profile commission defaults</h2></div>
      {errorMessage ? <p className="error-text" role="alert">{errorMessage}</p> : null}
      {rows.length === 0 ? <p className="field-hint">No Exchange Accounts are attached to this Profile.</p> : (
        <div className="form-grid commission-settings-grid">
          {rows.map((row) => {
            const state = saveStates[row.exchange_name] ?? "idle";
            const valid = isValidCommission(row.commission_rate);
            const dirty = row.commission_rate !== savedRates[row.exchange_name];
            return (
              <div className="field-control commission-setting" key={`${row.profile_id}:${row.exchange_name}`}>
                <label htmlFor={`commission-${row.exchange_name}`}>{row.exchange_name}</label>
                <input aria-describedby={`commission-status-${row.exchange_name}`} aria-invalid={!valid} id={`commission-${row.exchange_name}`} inputMode="decimal" onChange={(event) => {
                  const value = event.target.value;
                  setRows((current) => current.map((entry) => entry.exchange_name === row.exchange_name ? { ...entry, commission_rate: value } : entry));
                  setSaveStates((current) => ({ ...current, [row.exchange_name]: "idle" }));
                }} placeholder="0.02" value={row.commission_rate} />
                <small id={`commission-status-${row.exchange_name}`}>
                  {!valid ? "Enter a decimal fraction from 0 to 1." : null}
                  {state === "saving" ? "Saving" : null}
                  {state === "saved" ? <><span aria-hidden="true" className="material-symbols-outlined">check_circle</span>{formatUpdatedAt(savedAt[row.exchange_name] ?? row.updated_at)}</> : null}
                  {state === "error" ? "Could not save." : null}
                </small>
                {row.suggested_commission_rate && !row.configured ? <p className="field-hint">Suggested {Number(row.suggested_commission_rate) * 100}% from {row.suggestion_source.toLowerCase()}.</p> : null}
                <div className="inline-actions">
                  {row.suggested_commission_rate && !row.configured ? <button className="button-link compact-action" disabled={state === "saving"} onClick={() => setRows((current) => current.map((entry) => entry.exchange_name === row.exchange_name ? { ...entry, commission_rate: row.suggested_commission_rate } : entry))} type="button">Use suggestion</button> : null}
                  <button className="modal-primary-button compact-action" disabled={!dirty || !valid || !row.commission_rate.trim() || state === "saving"} onClick={() => setConfirmExchange(row.exchange_name)} type="button">{state === "saving" ? <span aria-hidden="true" className="button-spinner" /> : null}<span>{state === "saving" ? "Saving" : "Save commission"}</span></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmationDialog
        busy={Boolean(confirmExchange && saveStates[confirmExchange] === "saving")}
        busyLabel="Saving"
        confirmLabel="Apply commission"
        confirmTone="primary"
        description={confirmExchange ? `Apply the entered commission to ${confirmExchange} for this Profile. New calculations will use this Profile-specific value.` : ""}
        onCancel={() => setConfirmExchange(null)}
        onConfirm={() => confirmExchange && void saveRow(confirmExchange)}
        open={Boolean(confirmExchange)}
        title="Confirm Exchange commission"
      />
    </section>
  );
}
