"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";

type ExchangeCommissionRecord = {
  profile_id: string;
  exchange_name: string;
  commission_rate: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  profileId: string;
  onSaved?: () => void | Promise<void>;
};

export function ExchangeCommissionSettings({ profileId, onSaved }: Props) {
  const [rows, setRows] = useState<ExchangeCommissionRecord[]>([]);
  const [pristineRows, setPristineRows] = useState<ExchangeCommissionRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState("Loading exchange commission settings...");
  const [errorMessage, setErrorMessage] = useState("");
  const [savingExchange, setSavingExchange] = useState<string | null>(null);
  const isDirty = useMemo(
    () =>
      JSON.stringify(rows.map((row) => [row.exchange_name, row.commission_rate])) !==
      JSON.stringify(pristineRows.map((row) => [row.exchange_name, row.commission_rate])),
    [pristineRows, rows]
  );
  useUnsavedChangesGuard(isDirty);

  const loadSettings = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/exchange-commissions`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Unable to load exchange commission settings.");
    }

    const data = (await response.json()) as ExchangeCommissionRecord[];
    setRows(data);
    setPristineRows(data);
    setStatusMessage(`Loaded ${data.length} profile-scoped exchange commission settings.`);
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSettings().catch((error: Error) => {
        setErrorMessage(error.message);
        setStatusMessage("Exchange commission settings could not be loaded.");
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadSettings]);

  async function saveRow(exchangeName: string) {
    const row = rows.find((entry) => entry.exchange_name === exchangeName);
    if (!row) {
      return;
    }

    setSavingExchange(exchangeName);
    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/exchange-commissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exchange_name: row.exchange_name,
        commission_rate: row.commission_rate,
      }),
    });

    if (!response.ok) {
      setErrorMessage(await response.text());
      setSavingExchange(null);
      return;
    }

    setSavingExchange(null);
    await loadSettings();
    if (onSaved) {
      await onSaved();
    }
  }

  return (
    <section className="content-subpanel stack" aria-label="Exchange commission settings">
      <div className="stack">
        <span className="eyebrow">Exchange commission settings</span>
        <p className="lede">
          Workbook parity: commission is set once per exchange for this profile and then
          looked up on sportsbook and free-bet rows.
        </p>
      </div>
      <div className="table-status" aria-live="polite">
        {statusMessage}
      </div>
      {errorMessage ? (
        <p className="error-text" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="lede">No exchange settings exist yet for this profile.</p>
      ) : (
        <div className="form-grid">
          {rows.map((row) => (
            <label className="field-control" key={row.exchange_name}>
              <span>{row.exchange_name}</span>
              <div className="tracker-nav">
                <input
                  inputMode="decimal"
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((entry) =>
                        entry.exchange_name === row.exchange_name
                          ? { ...entry, commission_rate: event.target.value }
                          : entry
                      )
                    )
                  }
                  placeholder="0.02"
                  value={row.commission_rate}
                />
                <button
                  className="button-link"
                  disabled={savingExchange === row.exchange_name}
                  onClick={() => void saveRow(row.exchange_name)}
                  type="button"
                >
                  Save
                </button>
              </div>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
