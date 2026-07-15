"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookmakerIdentity } from "@/components/bookmaker-identity";
import { StatusToast } from "@/components/status-toast";
import { apiBaseUrl } from "@/lib/api";
import type {
  BookmakerCatalogueRecord,
  BookmakerDisplayMode,
  BookmakerDisplaySettings,
  ProfileBookmakerDisplayMode,
} from "@/lib/bookmaker-catalogue";

type CatalogueDraft = Omit<BookmakerCatalogueRecord, "bookmaker_id" | "created_at" | "updated_at">;

const blankDraft: CatalogueDraft = {
  brand_name: "",
  short_display_name: "",
  legal_operator: "",
  operator_group: "",
  platform: "",
  risk_team: "",
  licence_reference: "",
  licence_status: "",
  canonical_domain: "",
  status: "Active",
  foreground_colour: "#FFFFFF",
  background_colour: "#455A64",
  logo_asset_path: "",
  source: "Fund Manager entry",
  confidence: "Unverified",
  last_verified_date: "",
};

const globalModes: BookmakerDisplayMode[] = ["Name", "Brand badge", "Logo"];
const profileModes: ProfileBookmakerDisplayMode[] = ["Inherit", ...globalModes];

export function BookmakerCatalogueSettings({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<BookmakerCatalogueRecord[]>([]);
  const [displaySettings, setDisplaySettings] = useState<BookmakerDisplaySettings | null>(null);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CatalogueDraft>(blankDraft);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    const [catalogueResponse, settingsResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/bookmaker-catalogue`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/profiles/${profileId}/bookmaker-display-settings`, {
        cache: "no-store",
      }),
    ]);
    if (!catalogueResponse.ok || !settingsResponse.ok) {
      throw new Error("Unable to load bookmaker catalogue settings.");
    }
    setRows((await catalogueResponse.json()) as BookmakerCatalogueRecord[]);
    setDisplaySettings((await settingsResponse.json()) as BookmakerDisplaySettings);
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load().catch((error: Error) => setErrorMessage(error.message));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return rows;
    }
    return rows.filter((row) =>
      [row.brand_name, row.short_display_name, row.operator_group, row.platform]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query, rows]);

  function beginEdit(row?: BookmakerCatalogueRecord) {
    if (!row) {
      setEditingId(null);
      setDraft(blankDraft);
      return;
    }
    const { bookmaker_id: ignoredId, created_at: ignoredCreated, updated_at: ignoredUpdated, ...nextDraft } = row;
    void ignoredId;
    void ignoredCreated;
    void ignoredUpdated;
    setEditingId(row.bookmaker_id);
    setDraft(nextDraft);
  }

  async function saveCatalogueEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    const response = await fetch(
      editingId
        ? `${apiBaseUrl}/bookmaker-catalogue/${editingId}`
        : `${apiBaseUrl}/bookmaker-catalogue`,
      {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      }
    );
    if (!response.ok) {
      setErrorMessage(await response.text());
      return;
    }
    const saved = (await response.json()) as BookmakerCatalogueRecord;
    await load();
    setEditingId(null);
    setDraft(blankDraft);
    setStatusMessage(`${saved.brand_name} ${editingId ? "updated" : "added"}.`);
  }

  async function archiveEntry(row: BookmakerCatalogueRecord) {
    const response = await fetch(`${apiBaseUrl}/bookmaker-catalogue/${row.bookmaker_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...row, status: "Archived" }),
    });
    if (!response.ok) {
      setErrorMessage(await response.text());
      return;
    }
    await load();
    setStatusMessage(`${row.brand_name} archived. Historical rows remain readable.`);
  }

  async function saveGlobalMode(mode: BookmakerDisplayMode) {
    const response = await fetch(`${apiBaseUrl}/bookmaker-display-settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    if (!response.ok) {
      setErrorMessage(await response.text());
      return;
    }
    await load();
    setStatusMessage(`Fund Manager display default set to ${mode}.`);
  }

  async function saveProfileMode(mode: ProfileBookmakerDisplayMode) {
    const response = await fetch(
      `${apiBaseUrl}/profiles/${profileId}/bookmaker-display-settings`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      }
    );
    if (!response.ok) {
      setErrorMessage(await response.text());
      return;
    }
    await load();
    setStatusMessage(`Profile bookmaker display set to ${mode}.`);
  }

  return (
    <section className="content-subpanel stack" aria-labelledby="bookmaker-catalogue-title">
      <StatusToast message={statusMessage} onDismiss={() => setStatusMessage("")} />
      <div className="sportsbook-page-header">
        <h2 id="bookmaker-catalogue-title">Bookmaker catalogue</h2>
        <button className="button-link" onClick={() => beginEdit()} type="button">
          Add bookmaker
        </button>
      </div>
      <div className="form-grid">
        <label className="field-control">
          <span>Fund Manager default</span>
          <select
            onChange={(event) => void saveGlobalMode(event.target.value as BookmakerDisplayMode)}
            value={displaySettings?.global_mode ?? "Name"}
          >
            {globalModes.map((mode) => <option key={mode}>{mode}</option>)}
          </select>
        </label>
        <label className="field-control">
          <span>This profile</span>
          <select
            onChange={(event) => void saveProfileMode(event.target.value as ProfileBookmakerDisplayMode)}
            value={displaySettings?.profile_override ?? "Inherit"}
          >
            {profileModes.map((mode) => <option key={mode}>{mode}</option>)}
          </select>
        </label>
      </div>
      {errorMessage ? <p className="error-text" role="alert">{errorMessage}</p> : null}
      <label className="field-control">
        <span>Search catalogue</span>
        <input onChange={(event) => setQuery(event.target.value)} type="search" value={query} />
      </label>
      <div className="bookmaker-catalogue-list">
        {filteredRows.map((row) => (
          <article className="bookmaker-catalogue-row" key={row.bookmaker_id}>
            <BookmakerIdentity bookmaker={row.brand_name} catalogue={rows} mode="Brand badge" />
            <div>
              <strong>{row.brand_name}</strong>
              <div className="table-status">
                {row.operator_group || "No group"} · {row.platform || "No platform"} · {row.confidence}
              </div>
            </div>
            <span className={`table-chip${row.status === "Archived" ? " table-chip-muted" : " table-chip-status-placed"}`}>
              {row.status}
            </span>
            <div className="tracker-nav">
              <button className="button-link" onClick={() => beginEdit(row)} type="button">Edit</button>
              {row.status === "Active" ? (
                <button className="button-link" onClick={() => void archiveEntry(row)} type="button">Archive</button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      <form className="form-grid bookmaker-catalogue-form" onSubmit={(event) => void saveCatalogueEntry(event)}>
        <h3 className="field-span-2">{editingId ? "Edit bookmaker" : "Add bookmaker"}</h3>
        {([
          ["brand_name", "Brand name"], ["short_display_name", "Short name"],
          ["legal_operator", "Legal operator"], ["operator_group", "Group"],
          ["platform", "Platform"], ["risk_team", "Risk team"],
          ["licence_reference", "Licence reference"], ["licence_status", "Licence status"],
          ["canonical_domain", "Domain"], ["logo_asset_path", "Local logo path"],
          ["source", "Source"], ["last_verified_date", "Last verified date"],
        ] as Array<[keyof CatalogueDraft, string]>).map(([key, label]) => (
          <label className="field-control" key={key}>
            <span>{label}</span>
            <input
              onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
              required={key === "brand_name" || key === "short_display_name"}
              type={key === "last_verified_date" ? "date" : "text"}
              value={String(draft[key])}
            />
          </label>
        ))}
        <label className="field-control">
          <span>Text colour</span>
          <input onChange={(event) => setDraft((current) => ({ ...current, foreground_colour: event.target.value }))} type="color" value={draft.foreground_colour} />
        </label>
        <label className="field-control">
          <span>Background colour</span>
          <input onChange={(event) => setDraft((current) => ({ ...current, background_colour: event.target.value }))} type="color" value={draft.background_colour} />
        </label>
        <label className="field-control">
          <span>Confidence</span>
          <select onChange={(event) => setDraft((current) => ({ ...current, confidence: event.target.value as CatalogueDraft["confidence"] }))} value={draft.confidence}>
            <option>Verified</option><option>Likely</option><option>Unverified</option>
          </select>
        </label>
        <div className="tracker-nav align-end">
          <button className="button-link" type="submit">{editingId ? "Save bookmaker" : "Add bookmaker"}</button>
          <button className="button-link" onClick={() => beginEdit()} type="button">Clear</button>
        </div>
      </form>
    </section>
  );
}
