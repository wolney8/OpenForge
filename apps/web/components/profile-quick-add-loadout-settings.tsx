"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";

import { apiBaseUrl } from "@/lib/api";
import type { AccountAuthorityRecord } from "@/lib/account-authorities";
import { useBodyScrollLock, useDialogFocusLifecycle } from "@/lib/ledger-ui";

type LedgerType = "Sportsbook" | "Free Bets" | "Casino" | "Cash Adjustments" | "Extra Place";
type Loadout = {
  preset_id: string;
  label: string;
  ledger_type: LedgerType;
  defaults: Record<string, string>;
  enabled: boolean;
  availability: "eligible" | "limited" | "blocked";
  availability_reason: string;
  bookmaker: string;
  archived: boolean;
  sort_order: number;
  is_favourite: boolean;
  favourite_order: number;
  source: "fund_manager" | "profile";
  enforced: boolean;
  enabled_fields: string[];
  allowed_profile_override_fields: string[];
};

type ActionDraft = {
  ledger_type: LedgerType;
  label: string;
  enabled_fields: string[];
  defaults: Record<string, string>;
  enabled: boolean;
  is_favourite: boolean;
  favourite_order: number;
  sort_order: number;
};

const ledgers: LedgerType[] = ["Sportsbook", "Free Bets", "Casino", "Cash Adjustments", "Extra Place"];
const fieldLabels: Record<string, string> = {
  offerName: "Offer Name", bookmaker: "Bookmaker", betType: "Bet Type", offerType: "Offer Type", fixtureType: "Fixture Type", event: "Event", market: "Market", stake: "Stake", backOdds: "Back Odds", exchange: "Exchange", layMode: "Lay Mode", freeBetValue: "Free Bet Value", retention: "Retention", cashStake: "Cash Stake", creditAmount: "Credit Amount", bonusAmount: "Bonus Amount", wagerMultiplier: "Wager Multiplier", game: "Game / Slot", spinCount: "Number Of Spins", spinStake: "Spin Stake", reward: "Reward", convertedWin: "Converted Win", adjustmentType: "Adjustment Type", linkedAccount: "Linked Account", amount: "Amount", direction: "Direction", adjustmentDate: "Adjustment Date", notes: "Notes", runner: "Runner / Horse", race: "Race", eachWayStake: "E/W Stake", placeTermDenominator: "E/W Terms", bookmakerPlaces: "Bookmaker Places", exchangePlaces: "Exchange Places", winExchange: "Win Exchange", placeExchange: "Place Exchange", winLayOdds: "Win Lay Odds", placeLayOdds: "Place Lay Odds",
};

function emptyDraft(ledgerType: LedgerType = "Sportsbook"): ActionDraft {
  return { ledger_type: ledgerType, label: "", enabled_fields: [], defaults: {}, enabled: true, is_favourite: true, favourite_order: 1, sort_order: 0 };
}

export function ProfileQuickAddLoadoutSettings({ profileId }: { profileId: string }) {
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [bookmakers, setBookmakers] = useState<AccountAuthorityRecord[]>([]);
  const [schemas, setSchemas] = useState<Record<LedgerType, string[]>>({} as Record<LedgerType, string[]>);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [draft, setDraft] = useState<ActionDraft | null>(null);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);

  useBodyScrollLock(Boolean(draft));
  useDialogFocusLifecycle(Boolean(draft), dialogRef);

  const load = useCallback(async () => {
    setError("");
    const [loadoutResponse, accountResponse, schemaResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/fund-manager/common-bet-combos/profile-overrides/${profileId}?include_hidden=true`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/profiles/${profileId}/accounts`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/fund-manager/common-bet-combos/profile-actions/schemas`, { cache: "no-store" }),
    ]);
    if (!loadoutResponse.ok || !accountResponse.ok || !schemaResponse.ok) throw new Error("Quick Actions could not be loaded.");
    setLoadouts((await loadoutResponse.json()) as Loadout[]);
    setBookmakers(((await accountResponse.json()) as AccountAuthorityRecord[]).filter((account) => account.type === "Bookie"));
    setSchemas((await schemaResponse.json()) as Record<LedgerType, string[]>);
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load().catch((caught) => setError(caught instanceof Error ? caught.message : "Quick Actions could not be loaded.")), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const bookmakerOptions = useMemo(() => {
    const unique = new Map<string, AccountAuthorityRecord>();
    for (const bookmaker of bookmakers) if (!unique.has(bookmaker.account.trim().toLocaleLowerCase())) unique.set(bookmaker.account.trim().toLocaleLowerCase(), bookmaker);
    return [...unique.values()].sort((left, right) => left.account.localeCompare(right.account));
  }, [bookmakers]);

  async function updateGlobal(loadout: Loadout, changes: Partial<Pick<Loadout, "enabled" | "bookmaker" | "defaults">>) {
    const saveKey = `${loadout.preset_id}-${loadout.ledger_type}`;
    setSavingId(saveKey); setError("");
    const response = await fetch(`${apiBaseUrl}/fund-manager/common-bet-combos/profile-overrides/${profileId}/${loadout.preset_id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: loadout.enforced ? true : (changes.enabled ?? loadout.enabled), bookmaker_override: changes.bookmaker ?? loadout.bookmaker, defaults: changes.defaults, availability_reason: "" }),
    });
    if (!response.ok) setError((await response.json().catch(() => null) as { detail?: string } | null)?.detail || "Quick Action could not be saved.");
    else await load();
    setSavingId("");
  }

  async function updateFavourite(loadout: Loadout, isFavourite: boolean, favouriteOrder?: number) {
    const saveKey = `${loadout.preset_id}-${loadout.ledger_type}`;
    setSavingId(saveKey); setError("");
    const response = await fetch(`${apiBaseUrl}/fund-manager/common-bet-combos/profile-overrides/${profileId}/${loadout.preset_id}/favourite`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ledger_type: loadout.ledger_type, is_favourite: isFavourite, favourite_order: favouriteOrder }),
    });
    if (!response.ok) setError((await response.json().catch(() => null) as { detail?: string } | null)?.detail || "Quick Action favourite could not be saved.");
    else await load();
    setSavingId("");
  }

  function openCreate(ledgerType: LedgerType) { setEditingActionId(null); setDraft(emptyDraft(ledgerType)); }
  function openEdit(loadout: Loadout) {
    setEditingActionId(loadout.preset_id);
    setDraft({ ledger_type: loadout.ledger_type, label: loadout.label, enabled_fields: loadout.enabled_fields, defaults: loadout.defaults, enabled: loadout.enabled, is_favourite: loadout.is_favourite, favourite_order: loadout.favourite_order, sort_order: loadout.sort_order });
  }

  async function saveProfileAction() {
    if (!draft || !draft.label.trim() || !draft.enabled_fields.length) return;
    setSavingId("profile-action"); setError("");
    const response = await fetch(`${apiBaseUrl}/fund-manager/common-bet-combos/profile-actions/${profileId}${editingActionId ? `/${editingActionId}` : ""}`, {
      method: editingActionId ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, label: draft.label.trim() }),
    });
    if (!response.ok) setError((await response.json().catch(() => null) as { detail?: string } | null)?.detail || "Profile Quick Action could not be saved.");
    else { setDraft(null); setEditingActionId(null); await load(); }
    setSavingId("");
  }

  async function archiveProfileAction(loadout: Loadout) {
    setSavingId(loadout.preset_id); setError("");
    const response = await fetch(`${apiBaseUrl}/fund-manager/common-bet-combos/profile-actions/${profileId}/${loadout.preset_id}`, { method: "DELETE" });
    if (!response.ok) setError("Profile Quick Action could not be removed."); else await load();
    setSavingId("");
  }

  async function updateProfileAction(loadout: Loadout, changes: Partial<Pick<ActionDraft, "enabled" | "is_favourite" | "favourite_order">>) {
    setSavingId(loadout.preset_id); setError("");
    const response = await fetch(`${apiBaseUrl}/fund-manager/common-bet-combos/profile-actions/${profileId}/${loadout.preset_id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ledger_type: loadout.ledger_type,
        label: loadout.label,
        enabled_fields: loadout.enabled_fields,
        defaults: loadout.defaults,
        enabled: changes.enabled ?? loadout.enabled,
        is_favourite: changes.is_favourite ?? loadout.is_favourite,
        favourite_order: changes.favourite_order ?? loadout.favourite_order,
        sort_order: loadout.sort_order,
      }),
    });
    if (!response.ok) setError((await response.json().catch(() => null) as { detail?: string } | null)?.detail || "Profile Quick Action could not be saved.");
    else await load();
    setSavingId("");
  }

  function toggleDraftField(field: string) {
    if (!draft) return;
    const selected = draft.enabled_fields.includes(field);
    const enabledFields = selected ? draft.enabled_fields.filter((value) => value !== field) : [...draft.enabled_fields, field];
    const defaults = { ...draft.defaults };
    if (selected) delete defaults[field];
    setDraft({ ...draft, enabled_fields: enabledFields, defaults });
  }

  return (
    <section className="stack" data-pd-id="profile-quick-actions.settings">
      <div><span className="eyebrow">Profile Defaults</span><h2>Quick Actions</h2><p className="field-hint">Fund Manager actions marked required are always available to eligible profiles. Profile actions stay isolated to this profile.</p></div>
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      {ledgers.map((ledger) => {
        const globalActions = loadouts.filter((item) => item.ledger_type === ledger && item.source === "fund_manager");
        const profileActions = loadouts.filter((item) => item.ledger_type === ledger && item.source === "profile");
        return (
          <section className="content-subpanel stack quick-actions-ledger-section" data-pd-id={`profile-quick-actions.${ledger}`} key={ledger}>
            <header className="quick-actions-ledger-header"><div><span className="eyebrow">{ledger}</span><h3>Quick Actions</h3></div><button className="button-link icon-text-action" onClick={() => openCreate(ledger)} type="button"><span aria-hidden="true" className="material-symbols-outlined">add</span><span>Add Action</span></button></header>
            <div className="quick-actions-group"><strong>Fund Manager Actions</strong>{globalActions.length ? globalActions.map((loadout) => <GlobalActionRow key={`${loadout.preset_id}-${loadout.ledger_type}`} favouriteCount={loadouts.filter((item) => item.ledger_type === ledger && item.is_favourite).length} loadout={loadout} bookmakers={bookmakerOptions} onFavourite={updateFavourite} onUpdate={updateGlobal} savingId={savingId} />) : <p className="field-hint">No global Quick Actions for this ledger.</p>}</div>
            <div className="quick-actions-group"><strong>Profile Actions</strong>{profileActions.length ? profileActions.map((loadout) => {
              const busy = savingId === loadout.preset_id;
              const favouriteCount = loadouts.filter((item) => item.ledger_type === ledger && item.is_favourite).length;
              return <article className="quick-action-row" key={loadout.preset_id}><div><strong>{loadout.label}</strong><small>{loadout.enabled_fields.map((field) => fieldLabels[field] ?? field).join(" · ")}</small></div><label className="profile-filter-chip"><input checked={loadout.enabled} disabled={busy} onChange={(event) => void updateProfileAction(loadout, { enabled: event.target.checked })} type="checkbox" /><span>Enabled</span></label><label className="profile-filter-chip"><input checked={loadout.is_favourite} disabled={busy || !loadout.enabled || (!loadout.is_favourite && favouriteCount >= 4)} onChange={(event) => void updateProfileAction(loadout, { is_favourite: event.target.checked })} type="checkbox" /><span>Carousel</span></label><div className="table-action-group"><button aria-label={`Edit ${loadout.label}`} className="icon-button" onClick={() => openEdit(loadout)} type="button"><span aria-hidden="true" className="material-symbols-outlined">edit</span></button><button aria-label={`Delete ${loadout.label}`} className="icon-button destructive-icon-button" disabled={busy} onClick={() => void archiveProfileAction(loadout)} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span></button></div></article>;
            }) : <p className="field-hint">No profile-owned actions yet.</p>}</div>
          </section>
        );
      })}
      {draft ? <QuickActionDialog actionId={editingActionId} draft={draft} fields={schemas[draft.ledger_type] ?? []} onChange={setDraft} onClose={() => { setDraft(null); setEditingActionId(null); }} onSave={() => void saveProfileAction()} ref={dialogRef} saving={savingId === "profile-action"} toggleField={toggleDraftField} /> : null}
    </section>
  );
}

function GlobalActionRow({ loadout, bookmakers, onFavourite, onUpdate, savingId, favouriteCount }: { loadout: Loadout; bookmakers: AccountAuthorityRecord[]; onFavourite: (loadout: Loadout, favourite: boolean, order?: number) => Promise<void>; onUpdate: (loadout: Loadout, changes: Partial<Pick<Loadout, "enabled" | "bookmaker" | "defaults">>) => Promise<void>; savingId: string; favouriteCount: number }) {
  const busy = savingId === `${loadout.preset_id}-${loadout.ledger_type}`;
  const isBlocked = loadout.availability === "blocked";
  const canOverrideBookmaker = loadout.allowed_profile_override_fields.includes("bookmaker");
  const defaultFields = loadout.allowed_profile_override_fields.filter((field) => field !== "bookmaker");
  return <article className="quick-action-row"><div><strong>{loadout.label}</strong><small>{loadout.enforced ? "Required by Fund Manager" : loadout.availability === "eligible" ? "Eligible" : loadout.availability_reason || loadout.availability}</small></div><label className="profile-filter-chip"><input checked={loadout.enabled} disabled={busy || isBlocked || loadout.enforced} onChange={(event) => void onUpdate(loadout, { enabled: event.target.checked })} type="checkbox" /><span>{loadout.enforced ? "Required" : "Enabled"}</span></label><label className="profile-filter-chip"><input checked={loadout.is_favourite} disabled={busy || isBlocked || !loadout.enabled || (!loadout.is_favourite && favouriteCount >= 4)} onChange={(event) => void onFavourite(loadout, event.target.checked)} type="checkbox" /><span>Carousel</span></label>{canOverrideBookmaker ? <label className="field-control quick-action-provider-select"><span>Bookmaker</span><select disabled={busy || isBlocked} onChange={(event) => void onUpdate(loadout, { bookmaker: event.target.value })} value={loadout.bookmaker}><option value="">Template default</option>{bookmakers.map((bookmaker) => <option key={bookmaker.account_id} value={bookmaker.account}>{bookmaker.account}</option>)}</select></label> : null}{defaultFields.map((field) => <label className="field-control quick-action-default-input" key={field}><span>{fieldLabels[field] ?? field}</span><input defaultValue={loadout.defaults[field] ?? ""} disabled={busy || isBlocked} onBlur={(event) => { const value = event.target.value.trim(); if (value !== (loadout.defaults[field] ?? "")) void onUpdate(loadout, { defaults: { ...loadout.defaults, [field]: value } }); }} /></label>)}</article>;
}

const QuickActionDialog = ({ actionId, draft, fields, onChange, onClose, onSave, saving, toggleField, ref }: { actionId: string | null; draft: ActionDraft; fields: string[]; onChange: (draft: ActionDraft) => void; onClose: () => void; onSave: () => void; saving: boolean; toggleField: (field: string) => void; ref: RefObject<HTMLElement | null> }) => (
  <div className="modal-backdrop modal-backdrop-elevated"><section aria-label={`${actionId ? "Edit" : "Add"} Profile Quick Action`} aria-modal="true" className="modal-panel workflow-editor-modal fund-manager-settings-modal profile-quick-action-modal" ref={ref} role="dialog" tabIndex={-1}>
    <header className="workflow-editor-modal-header"><div><span className="eyebrow">Profile Quick Actions</span><h2>{actionId ? "Edit Action" : "Add Action"}</h2></div><button aria-label="Close Quick Action" className="modal-close-button" onClick={onClose} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></header>
    <div className="workflow-editor-modal-body stack"><div className="form-grid"><label className="field-control"><span>Ledger</span><select data-initial-focus disabled={Boolean(actionId)} onChange={(event) => onChange({ ...draft, ledger_type: event.target.value as LedgerType, enabled_fields: [], defaults: {} })} value={draft.ledger_type}>{ledgers.map((ledger) => <option key={ledger}>{ledger}</option>)}</select></label><label className="field-control"><span>Action Label</span><input maxLength={80} onChange={(event) => onChange({ ...draft, label: event.target.value })} value={draft.label} /></label></div><fieldset className="quick-action-field-picker"><legend>Prefill fields</legend><div className="quick-action-field-grid">{fields.map((field) => <label className={`profile-filter-chip${draft.enabled_fields.includes(field) ? " is-selected" : ""}`} key={field}><input checked={draft.enabled_fields.includes(field)} onChange={() => toggleField(field)} type="checkbox" /><span>{fieldLabels[field] ?? field}</span></label>)}</div></fieldset>{draft.enabled_fields.length ? <section className="stack"><h3>Defaults</h3><div className="form-grid">{draft.enabled_fields.map((field) => <label className="field-control" key={field}><span>{fieldLabels[field] ?? field}</span><input onChange={(event) => onChange({ ...draft, defaults: { ...draft.defaults, [field]: event.target.value } })} value={draft.defaults[field] ?? ""} /></label>)}</div></section> : null}</div>
    <footer className="workflow-editor-modal-footer"><button className="button-link" onClick={onClose} type="button">Cancel</button><button className="button-link icon-text-action" disabled={saving || !draft.label.trim() || !draft.enabled_fields.length} onClick={onSave} type="button">{saving ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">save</span>}<span>{saving ? "Saving" : "Save"}</span></button></footer>
  </section></div>
);
