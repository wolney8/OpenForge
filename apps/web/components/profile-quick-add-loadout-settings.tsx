"use client";

import { useCallback, useEffect, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import type { AccountAuthorityRecord } from "@/lib/account-authorities";

type Loadout = {
  preset_id: string;
  label: string;
  ledger_type: "Sportsbook" | "Free Bets" | "Casino" | "Cash Adjustments" | "Extra Place";
  defaults: Record<string, string>;
  enabled: boolean;
  availability: "eligible" | "limited" | "blocked";
  availability_reason: string;
  bookmaker: string;
  sort_order: number;
  is_favourite: boolean;
  favourite_order: number;
};

export function ProfileQuickAddLoadoutSettings({ profileId }: { profileId: string }) {
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [bookmakers, setBookmakers] = useState<AccountAuthorityRecord[]>([]);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  const load = useCallback(async () => {
    setError("");
    const [loadoutResponse, accountResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/fund-manager/common-bet-combos/profile-overrides/${profileId}?include_hidden=true`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/profiles/${profileId}/accounts`, { cache: "no-store" }),
    ]);
    if (!loadoutResponse.ok || !accountResponse.ok) throw new Error("Quick Add settings could not be loaded.");
    setLoadouts((await loadoutResponse.json()) as Loadout[]);
    setBookmakers(((await accountResponse.json()) as AccountAuthorityRecord[]).filter((account) => account.type === "Bookie"));
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load().catch((caught) => setError(caught instanceof Error ? caught.message : "Quick Add settings could not be loaded."));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  async function update(loadout: Loadout, changes: Partial<Pick<Loadout, "enabled" | "bookmaker">>) {
    const saveKey = `${loadout.preset_id}-${loadout.ledger_type}`;
    setSavingId(saveKey);
    setError("");
    const response = await fetch(`${apiBaseUrl}/fund-manager/common-bet-combos/profile-overrides/${profileId}/${loadout.preset_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: changes.enabled ?? loadout.enabled,
        bookmaker_override: changes.bookmaker ?? loadout.bookmaker,
        availability_reason: "",
      }),
    });
    if (!response.ok) {
      setError("Quick Add settings could not be saved.");
    } else {
      await load();
    }
    setSavingId("");
  }

  async function updateFavourite(loadout: Loadout, isFavourite: boolean, favouriteOrder?: number) {
    const saveKey = `${loadout.preset_id}-${loadout.ledger_type}`;
    setSavingId(saveKey);
    setError("");
    const response = await fetch(`${apiBaseUrl}/fund-manager/common-bet-combos/profile-overrides/${profileId}/${loadout.preset_id}/favourite`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ledger_type: loadout.ledger_type,
        is_favourite: isFavourite,
        favourite_order: favouriteOrder,
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { detail?: string } | null;
      setError(body?.detail || "Quick Add favourite could not be saved.");
    } else {
      await load();
    }
    setSavingId("");
  }

  return (
    <section className="stack" data-pd-id="profile-quick-add-settings.section">
      <div><span className="eyebrow">Profile Defaults</span><h2>Quick Add Loadouts</h2><p className="field-hint">Global templates stay managed by the Fund Manager. Set whether this profile can use each template, its eligible bookmaker, and up to four quick-access favourites for each ledger.</p></div>
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      {!loadouts.length ? <p className="field-hint">No global Quick Add loadouts are available yet.</p> : null}
      <div className="stack-tight">
        {loadouts.map((loadout) => {
          const saveKey = `${loadout.preset_id}-${loadout.ledger_type}`;
          const favouriteCount = loadouts.filter((item) => item.ledger_type === loadout.ledger_type && item.is_favourite).length;
          const favouriteDisabled = savingId === saveKey || !loadout.enabled || (!loadout.is_favourite && favouriteCount >= 4);
          return (
          <article className="content-subpanel quick-add-loadout-row" data-pd-id={`profile-quick-add-settings.${loadout.preset_id}.${loadout.ledger_type}`} key={`${loadout.preset_id}-${loadout.ledger_type}`}>
            <div><strong>{loadout.label}</strong><small>{loadout.ledger_type} · {loadout.availability === "eligible" ? "Eligible" : loadout.availability_reason || loadout.availability}</small></div>
            <label className="profile-filter-chip"><input checked={loadout.enabled} data-pd-id={`profile-quick-add-settings.${loadout.preset_id}.${loadout.ledger_type}.enabled`} disabled={savingId === saveKey} onChange={(event) => void update(loadout, { enabled: event.target.checked })} type="checkbox" /><span>Enabled</span></label>
            <label className="profile-filter-chip" title={!loadout.is_favourite && favouriteCount >= 4 ? "Remove a favourite for this ledger before adding another." : undefined}>
              <input checked={loadout.is_favourite} data-pd-id={`profile-quick-add-settings.${loadout.preset_id}.${loadout.ledger_type}.favourite`} disabled={favouriteDisabled} onChange={(event) => void updateFavourite(loadout, event.target.checked)} type="checkbox" />
              <span>Quick access</span>
            </label>
            {loadout.is_favourite ? <label className="field-control"><span>Quick access order</span><select aria-label={`${loadout.label} quick access order`} data-pd-id={`profile-quick-add-settings.${loadout.preset_id}.${loadout.ledger_type}.favourite-order`} disabled={savingId === saveKey} onChange={(event) => void updateFavourite(loadout, true, Number(event.target.value))} value={loadout.favourite_order}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></label> : null}
            <label className="field-control"><span>Bookmaker</span><select aria-label={`${loadout.label} bookmaker`} disabled={savingId === saveKey} onChange={(event) => void update(loadout, { bookmaker: event.target.value })} value={loadout.bookmaker}><option value="">Use template default</option>{bookmakers.map((bookmaker) => {
              const accountState = `${bookmaker.status} ${bookmaker.lifecycle_status ?? ""} ${bookmaker.restrictions_json ?? ""} ${JSON.stringify(bookmaker.restrictions ?? [])}`.toLowerCase();
              const blocked = ["blocked", "gubbed", "closed", "kyc blocked", "risk blocked", "bonus restricted"].some((state) => accountState.includes(state));
              const limited = !blocked && ["limited", "pending", "not signed up", "verification"].some((state) => accountState.includes(state));
              const suffix = blocked ? " (unavailable)" : limited ? " (warning)" : "";
              return <option disabled={blocked} key={bookmaker.account} value={bookmaker.account}>{bookmaker.account}{suffix}</option>;
            })}</select></label>
          </article>
        );
        })}
      </div>
    </section>
  );
}
