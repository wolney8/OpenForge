"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";

type ExchangeCommissionRecord = {
  profile_id: string;
  exchange_name: string;
  commission_rate: string;
  created_at: string;
  updated_at: string;
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
  const timers = useRef<Record<string, number>>({});
  const rowsRef = useRef<ExchangeCommissionRecord[]>([]);
  const pendingValues = useRef<Record<string, string>>({});

  useUnsavedChangesGuard(rows.some((row) => !isValidCommission(row.commission_rate)));

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const loadSettings = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/exchange-commissions`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load exchange commission settings.");
    const data = (await response.json()) as ExchangeCommissionRecord[];
    setRows(data);
    setSavedAt(Object.fromEntries(data.map((row) => [row.exchange_name, row.updated_at])));
  }, [profileId]);

  useEffect(() => {
    const activeTimers = timers.current;
    const timeoutId = window.setTimeout(() => {
      void loadSettings().catch((error: Error) => {
        setErrorMessage(error.message);
      });
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      Object.values(activeTimers).forEach((timer) => window.clearTimeout(timer));
    };
  }, [loadSettings]);

  const saveRow = useCallback(async (exchangeName: string, pendingValue?: string) => {
    const row = rowsRef.current.find((entry) => entry.exchange_name === exchangeName);
    const commissionRate = pendingValue ?? pendingValues.current[exchangeName] ?? row?.commission_rate ?? "";
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
    setSaveStates((current) => ({ ...current, [exchangeName]: "saved" }));
    delete pendingValues.current[exchangeName];
    if (onSaved) await onSaved();
  }, [onSaved, profileId]);

  function scheduleSave(exchangeName: string, value: string) {
    window.clearTimeout(timers.current[exchangeName]);
    pendingValues.current[exchangeName] = value;
    setRows((current) => current.map((entry) => entry.exchange_name === exchangeName ? { ...entry, commission_rate: value } : entry));
    setSaveStates((current) => ({ ...current, [exchangeName]: "idle" }));
    if (!isValidCommission(value)) return;
    timers.current[exchangeName] = window.setTimeout(() => void saveRow(exchangeName, value), 550);
  }

  function saveOnBlur(exchangeName: string) {
    window.clearTimeout(timers.current[exchangeName]);
    void saveRow(exchangeName, pendingValues.current[exchangeName]);
  }

  return (
    <section aria-label="Exchange commission settings" className="content-subpanel stack" data-pd-id="profile-settings.commission">
      <div><span className="eyebrow">Exchange commission</span><h2>Profile commission defaults</h2></div>
      {errorMessage ? <p className="error-text" role="alert">{errorMessage}</p> : null}
      {rows.length === 0 ? <p className="field-hint">No exchange settings exist yet for this profile.</p> : (
        <div className="form-grid commission-settings-grid">
          {rows.map((row) => {
            const state = saveStates[row.exchange_name] ?? "idle";
            const valid = isValidCommission(row.commission_rate);
            return (
              <label className="field-control commission-setting" key={`${row.profile_id}:${row.exchange_name}`}>
                <span>{row.exchange_name}</span>
                <input aria-describedby={`commission-status-${row.exchange_name}`} aria-invalid={!valid} inputMode="decimal" onBlur={() => saveOnBlur(row.exchange_name)} onChange={(event) => scheduleSave(row.exchange_name, event.target.value)} placeholder="0.02" value={row.commission_rate} />
                <small id={`commission-status-${row.exchange_name}`}>
                  {!valid ? "Enter a decimal fraction from 0 to 1." : null}
                  {state === "saving" ? "Saving" : null}
                  {state === "saved" ? <><span aria-hidden="true" className="material-symbols-outlined">check_circle</span>{formatUpdatedAt(savedAt[row.exchange_name] ?? row.updated_at)}</> : null}
                  {state === "error" ? "Could not save." : null}
                </small>
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}
