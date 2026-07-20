"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import {
  getLookupValuesByType,
  type LookupValueRecord,
  type LookupValueType,
} from "@/lib/lookup-values";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { dedupeOptions } from "@/lib/workbook-options";

const sections: Array<{
  lookupType: LookupValueType;
  title: string;
  singularLabel: string;
  description: string;
}> = [
  {
    lookupType: "exchange",
    title: "Exchanges",
    singularLabel: "exchange",
    description: "Exchange authority values used by exchange settings and matched-bet ledgers.",
  },
  {
    lookupType: "offer_name",
    title: "Sportsbook and free-bet offer names",
    singularLabel: "sportsbook or free-bet offer name",
    description:
      "Workbook OfferNameList values from Settings used by sportsbook and free-bet offer selectors.",
  },
  {
    lookupType: "casino_offer_name",
    title: "Casino offer names",
    singularLabel: "casino offer name",
    description:
      "Profile-owned casino offer authorities for casino campaigns, free spins, free play, and risk-free rows.",
  },
];

export function LookupValueSettings({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<LookupValueRecord[]>([]);
  const [drafts, setDrafts] = useState<Partial<Record<LookupValueType, string>>>({
    bookmaker: "",
    exchange: "",
    offer_name: "",
    casino_offer_name: "",
    group: "",
    platform: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [statusMessage, setStatusMessage] = useState("Loading workbook authority lists...");
  const [errorMessage, setErrorMessage] = useState("");
  const isDirty = useMemo(() => {
    const hasDrafts = Object.values(drafts).some((value) => value.trim().length > 0);
    if (hasDrafts) {
      return true;
    }
    if (!editingId) {
      return false;
    }
    const activeRow = rows.find((row) => row.lookup_value_id === editingId);
    return !!activeRow && editingValue.trim() !== activeRow.option_value.trim();
  }, [drafts, editingId, editingValue, rows]);
  useUnsavedChangesGuard(isDirty);

  const loadRows = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/lookup-values`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Unable to load workbook authority lists.");
    }
    const data = (await response.json()) as LookupValueRecord[];
    setRows(data);
    setStatusMessage(`Loaded ${data.length} workbook authority values for this profile.`);
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRows().catch((error: Error) => {
        setErrorMessage(error.message);
        setStatusMessage("Workbook authority lists could not be loaded.");
      });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRows]);

  const groupedRows = useMemo(
    () =>
      Object.fromEntries(
        sections.map(({ lookupType }) => [
          lookupType,
          dedupeOptions(getLookupValuesByType(rows, lookupType)).map((value) =>
            rows.find(
              (row) => row.lookup_type === lookupType && row.option_value === value
            ) ?? null
          ),
        ])
      ) as Record<LookupValueType, Array<LookupValueRecord | null>>,
    [rows]
  );

  async function createLookupValue(lookupType: LookupValueType) {
    const optionValue = (drafts[lookupType] ?? "").trim();
    if (!optionValue) {
      return;
    }
    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/lookup-values`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lookup_type: lookupType, option_value: optionValue }),
    });
    if (!response.ok) {
      setErrorMessage(await response.text());
      return;
    }
    setDrafts((current) => ({ ...current, [lookupType]: "" }));
    await loadRows();
    setStatusMessage(`Added ${optionValue} to ${lookupType} values for this profile.`);
  }

  async function saveLookupValue(row: LookupValueRecord) {
    const optionValue = editingValue.trim();
    if (!optionValue) {
      return;
    }
    setErrorMessage("");
    const response = await fetch(
      `${apiBaseUrl}/profiles/${profileId}/lookup-values/${row.lookup_value_id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lookup_type: row.lookup_type,
          option_value: optionValue,
        }),
      }
    );
    if (!response.ok) {
      setErrorMessage(await response.text());
      return;
    }
    setEditingId(null);
    setEditingValue("");
    await loadRows();
    setStatusMessage(`Updated ${row.lookup_type} value for this profile.`);
  }

  async function deleteLookupValue(row: LookupValueRecord) {
    setErrorMessage("");
    const response = await fetch(
      `${apiBaseUrl}/profiles/${profileId}/lookup-values/${row.lookup_value_id}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      setErrorMessage(await response.text());
      return;
    }
    if (editingId === row.lookup_value_id) {
      setEditingId(null);
      setEditingValue("");
    }
    await loadRows();
    setStatusMessage(`Removed ${row.option_value} from ${row.lookup_type} values.`);
  }

  return (
    <section className="content-subpanel stack" aria-label="Workbook authority lists">
      <div className="stack">
        <span className="eyebrow">Workbook authority lists</span>
        <p className="lede">
          These profile-scoped lists are the current Settings-owned source for named-range
          style selectors. Ledger forms should read from here rather than relying on
          scattered hardcoded values.
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
      <div className="stack">
        {sections.map(({ lookupType, title, singularLabel, description }) => (
          <section className="content-subpanel stack" key={lookupType}>
            <div className="stack">
              <span className="eyebrow">{title}</span>
              <p className="lede">{description}</p>
            </div>
            <div className="form-grid">
              <label className="field-control">
                <span>Add {singularLabel}</span>
                <input
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [lookupType]: event.target.value,
                    }))
                  }
                  placeholder={`Add ${singularLabel} value`}
                  type="text"
                  value={drafts[lookupType] ?? ""}
                />
              </label>
              <div className="field-control align-end">
                <span className="sr-only">Add {title}</span>
                <button className="button-link" onClick={() => void createLookupValue(lookupType)} type="button">
                  Add value
                </button>
              </div>
            </div>
            <div className="stack">
              {groupedRows[lookupType].length === 0 ? (
                <p className="lede">No {title.toLowerCase()} are defined yet for this profile.</p>
              ) : (
                groupedRows[lookupType]
                  .filter((row): row is LookupValueRecord => row !== null)
                  .map((row) => (
                    <div className="table-toolbar" key={row.lookup_value_id}>
                      {editingId === row.lookup_value_id ? (
                        <label className="field-control" style={{ flex: 1 }}>
                          <span>Edit value</span>
                          <input
                            onChange={(event) => setEditingValue(event.target.value)}
                            type="text"
                            value={editingValue}
                          />
                        </label>
                      ) : (
                        <div className="stack" style={{ flex: 1 }}>
                          <strong>{row.option_value}</strong>
                        </div>
                      )}
                      <div className="tracker-nav">
                        {editingId === row.lookup_value_id ? (
                          <>
                            <button className="button-link" onClick={() => void saveLookupValue(row)} type="button">
                              Save
                            </button>
                            <button
                              className="button-link"
                              onClick={() => {
                                setEditingId(null);
                                setEditingValue("");
                              }}
                              type="button"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="button-link"
                            onClick={() => {
                              setEditingId(row.lookup_value_id);
                              setEditingValue(row.option_value);
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                        )}
                        <button className="button-link" onClick={() => void deleteLookupValue(row)} type="button">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
