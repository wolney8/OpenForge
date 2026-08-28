"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { LedgerTableScroll } from "@/components/ledger-table-scroll";
import { apiBaseUrl } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/api-error";

type CatalogueRecord = {
  catalogue_id: string;
  account_type: "Bookmaker" | "Exchange" | "Bank";
  brand_name: string;
  short_display_name: string;
  operator_group: string;
  platform: string;
  operating_channels: string[];
  foreground_colour: string;
  background_colour: string;
  status: "Active" | "Archived";
};

type SelectedAccount = {
  catalogue_id: string;
  status: string;
  opening_balance: string;
  pending_withdrawal_amount: string;
  counts_in_cash_total: boolean;
  restrictions: string[];
  notes: string;
};

type QuickActionPreset = {
  preset_id: string;
  name: string;
  quick_add: {
    enabled: boolean;
    display_label: string;
    supported_ledgers: Array<"Sportsbook" | "Free Bets" | "Casino" | "Cash Adjustments" | "Extra Place">;
    enforcement: "optional" | "required";
  };
};

type SelectedQuickAction = {
  preset_id: string;
  ledger_type: QuickActionPreset["quick_add"]["supported_ledgers"][number];
  favourite_order: number;
};

type Stage = "profile" | "modules" | "accounts" | "quick-actions" | "review";

const stages: Array<{ id: Stage; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "modules", label: "Modules" },
  { id: "accounts", label: "Accounts" },
  { id: "quick-actions", label: "Quick Actions" },
  { id: "review", label: "Review" },
];

const alwaysOnModules = [
  { id: "sportsbook-bets", label: "Sportsbook Bets" },
  { id: "free-bets", label: "Free Bets" },
  { id: "cash-adjustments", label: "Cash Adjustments" },
] as const;

const optionalModules = [
  { id: "casino-offers", label: "Casino Offers" },
  { id: "each-way-extra-places", label: "Extra Places" },
] as const;

const quickActionModule: Record<SelectedQuickAction["ledger_type"], string> = {
  Sportsbook: "sportsbook-bets",
  "Free Bets": "free-bets",
  Casino: "casino-offers",
  "Cash Adjustments": "cash-adjustments",
  "Extra Place": "each-way-extra-places",
};

const accountStatuses = [
  "Not Signed Up",
  "Pending Sign Up",
  "Active",
  "Limited",
  "Bonus Restricted",
  "Gubbed",
  "Blocked",
  "Not Using",
  "Closed",
];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseAmount(value: string) {
  const parsed = Number(value || "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ProfileOnboarding() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("profile");
  const [catalogue, setCatalogue] = useState<CatalogueRecord[]>([]);
  const [catalogueState, setCatalogueState] = useState<"loading" | "ready" | "error">("loading");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | CatalogueRecord["account_type"]>("All");
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, SelectedAccount>>({});
  const [quickActionPresets, setQuickActionPresets] = useState<QuickActionPreset[]>([]);
  const [selectedQuickActions, setSelectedQuickActions] = useState<Record<string, SelectedQuickAction>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState({
    display_name: "",
    profile_code: "",
    tracking_start_date: todayIsoDate(),
    active_date_preset: "This Month",
    iteration_number: "1",
    starting_bankroll: "0.00",
    management_fee_percent: "0.00",
    investment_fee_percent: "0.00",
    main_bank_catalogue_id: "",
  });
  const [modules, setModules] = useState<Record<string, boolean>>({
    "sportsbook-bets": true,
    "free-bets": true,
    "cash-adjustments": true,
    "casino-offers": true,
    "each-way-extra-places": true,
  });
  const [weeklyExtraPlaceBudget, setWeeklyExtraPlaceBudget] = useState("15.00");

  useEffect(() => {
    let active = true;
    void fetch(`${apiBaseUrl}/account-catalogue/source`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            formatApiErrorBody(
              await response.text(),
              "Unable to load Account Catalogue.",
            ),
          );
        }
        return response.json() as Promise<{ records: CatalogueRecord[] }>;
      })
      .then((payload) => {
        if (!active) return;
        setCatalogue(payload.records.filter((record) => record.status === "Active"));
        setCatalogueState("ready");
      })
      .catch(() => {
        if (active) setCatalogueState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void fetch(`${apiBaseUrl}/fund-manager/common-bet-combos?active_only=true`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load Quick Actions.");
        }
        return response.json() as Promise<QuickActionPreset[]>;
      })
      .then((payload) => {
        if (active) {
          setQuickActionPresets(payload.filter((preset) => preset.quick_add.enabled));
        }
      })
      .catch(() => {
        if (active) setQuickActionPresets([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleCatalogue = useMemo(() => {
    const query = search.trim().toLowerCase();
    return catalogue.filter((record) => {
      if (typeFilter !== "All" && record.account_type !== typeFilter) return false;
      if (!query) return true;
      return [record.brand_name, record.short_display_name, record.operator_group, record.platform]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [catalogue, search, typeFilter]);

  const selectedRecords = useMemo(
    () => catalogue.filter((record) => selectedAccounts[record.catalogue_id]),
    [catalogue, selectedAccounts],
  );
  const selectedBanks = selectedRecords.filter((record) => record.account_type === "Bank");
  const enabledModules = Object.entries(modules).filter(([, enabled]) => enabled).map(([id]) => id);
  const availableQuickActions = useMemo(
    () => quickActionPresets.flatMap((preset) => preset.quick_add.supported_ledgers
      .filter((ledger) => modules[quickActionModule[ledger]])
      .map((ledger) => ({ preset, ledger }))),
    [modules, quickActionPresets],
  );
  const selectedCash = Object.values(selectedAccounts).reduce(
    (total, account) => total + (account.counts_in_cash_total ? parseAmount(account.opening_balance) : 0),
    0,
  );

  function setProfileValue(field: keyof typeof profile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function toggleAccount(record: CatalogueRecord) {
    setSelectedAccounts((current) => {
      if (current[record.catalogue_id]) {
        const next = { ...current };
        delete next[record.catalogue_id];
        if (profile.main_bank_catalogue_id === record.catalogue_id) {
          setProfileValue("main_bank_catalogue_id", "");
        }
        return next;
      }
      return {
        ...current,
        [record.catalogue_id]: {
          catalogue_id: record.catalogue_id,
          status: "Not Signed Up",
          opening_balance: "0.00",
          pending_withdrawal_amount: "0.00",
          counts_in_cash_total: true,
          restrictions: [],
          notes: "",
        },
      };
    });
  }

  function updateSelectedAccount(catalogueId: string, values: Partial<SelectedAccount>) {
    setSelectedAccounts((current) => ({
      ...current,
      [catalogueId]: { ...current[catalogueId], ...values },
    }));
  }

  function toggleQuickAction(presetId: string, ledgerType: SelectedQuickAction["ledger_type"]) {
    const key = `${presetId}:${ledgerType}`;
    setSelectedQuickActions((current) => {
      if (current[key]) {
        const next = { ...current };
        delete next[key];
        const ledgerSelections = Object.values(next)
          .filter((selection) => selection.ledger_type === ledgerType)
          .sort((left, right) => left.favourite_order - right.favourite_order);
        for (const [index, selection] of ledgerSelections.entries()) {
          next[`${selection.preset_id}:${selection.ledger_type}`] = {
            ...selection,
            favourite_order: index + 1,
          };
        }
        return next;
      }
      const selectedForLedger = Object.values(current)
        .filter((selection) => selection.ledger_type === ledgerType);
      if (selectedForLedger.length >= 4) return current;
      return {
        ...current,
        [key]: {
          preset_id: presetId,
          ledger_type: ledgerType,
          favourite_order: selectedForLedger.length + 1,
        },
      };
    });
  }

  function setModuleEnabled(moduleId: string, enabled: boolean) {
    setModules((current) => ({ ...current, [moduleId]: enabled }));
    if (enabled) return;
    setSelectedQuickActions((current) => Object.fromEntries(
      Object.entries(current).filter(([, selection]) => quickActionModule[selection.ledger_type] !== moduleId),
    ));
  }

  function stageIsValid(target: Stage) {
    if (target === "profile") {
      return Boolean(profile.display_name.trim() && /^[A-Z0-9-]{3,32}$/.test(profile.profile_code));
    }
    if (target === "modules") {
      return alwaysOnModules.every((module) => modules[module.id]);
    }
    if (target === "accounts") {
      return !profile.main_bank_catalogue_id || Boolean(selectedAccounts[profile.main_bank_catalogue_id]);
    }
    return true;
  }

  function goNext() {
    setError("");
    if (!stageIsValid(stage)) {
      setError(stage === "profile" ? "Enter a display name and an uppercase Profile code." : "Review the required selections before continuing.");
      return;
    }
    const index = stages.findIndex((item) => item.id === stage);
    setStage(stages[Math.min(stages.length - 1, index + 1)].id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goPrevious() {
    setError("");
    const index = stages.findIndex((item) => item.id === stage);
    setStage(stages[Math.max(0, index - 1)].id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectStage(target: Stage) {
    const targetIndex = stages.findIndex((item) => item.id === target);
    const invalidStage = stages
      .slice(0, targetIndex)
      .find((item) => !stageIsValid(item.id));
    if (invalidStage) {
      setStage(invalidStage.id);
      setError(invalidStage.id === "profile" ? "Enter a display name and an uppercase Profile code." : "Review the required selections before continuing.");
      return;
    }
    setError("");
    setStage(target);
  }

  async function createProfile() {
    if (isSaving) return;
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(`${apiBaseUrl}/profiles/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          iteration_number: Number(profile.iteration_number),
          enabled_modules: enabledModules,
          weekly_extra_place_loss_budget: weeklyExtraPlaceBudget,
          accounts: Object.values(selectedAccounts),
          quick_actions: Object.values(selectedQuickActions),
          preferences: {},
        }),
      });
      if (!response.ok) {
        throw new Error(
          formatApiErrorBody(
            await response.text(),
            "Unable to create Profile.",
          ),
        );
      }
      const created = await response.json() as { profile: { profile_id: string } };
      router.push(`/profiles/${created.profile.profile_id}/tracker/dashboard`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create Profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="content-panel stack founder-onboarding" data-pd-id="founder-onboarding.page">
      <header className="stack-tight">
        <span className="eyebrow">Fund Manager</span>
        <h1>Create Profile</h1>
      </header>

      <div aria-label="Profile setup stages" className="analytics-tab-list profile-settings-tab-list" role="tablist">
        {stages.map((item) => (
          <button
            aria-selected={stage === item.id}
            className={`analytics-tab${stage === item.id ? " is-active" : ""}`}
            data-pd-id={`founder-onboarding.stage.${item.id}`}
            key={item.id}
            onClick={() => selectStage(item.id)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {stage === "profile" ? (
        <section className="analytics-tab-panel stack" role="tabpanel">
          <div className="form-grid">
            <label className="field-control"><span>Display Name</span><input autoComplete="name" autoFocus maxLength={120} onChange={(event) => setProfileValue("display_name", event.target.value)} value={profile.display_name} /></label>
            <label className="field-control"><span>Profile Code</span><input maxLength={32} onChange={(event) => setProfileValue("profile_code", event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} placeholder="FOUNDER-001" value={profile.profile_code} /></label>
            <label className="field-control"><span>Tracking Start Date</span><input max={todayIsoDate()} onChange={(event) => setProfileValue("tracking_start_date", event.target.value)} type="date" value={profile.tracking_start_date} /></label>
            <label className="field-control"><span>Active Date Preset</span><select onChange={(event) => setProfileValue("active_date_preset", event.target.value)} value={profile.active_date_preset}><option>This Week</option><option>Week (Mon-Sun)</option><option>Past 7 Days</option><option>This Month</option><option>This Year</option><option>All Dates</option></select></label>
            <label className="field-control"><span>Iteration Number</span><input inputMode="numeric" min="1" onChange={(event) => setProfileValue("iteration_number", event.target.value.replace(/\D/g, ""))} type="number" value={profile.iteration_number} /></label>
            <label className="field-control"><span>Starting Bankroll (£)</span><input inputMode="decimal" min="0" onChange={(event) => setProfileValue("starting_bankroll", event.target.value)} step="0.01" type="number" value={profile.starting_bankroll} /></label>
            <label className="field-control"><span>Management Fee (%)</span><input inputMode="decimal" min="0" onChange={(event) => setProfileValue("management_fee_percent", event.target.value)} step="0.01" type="number" value={profile.management_fee_percent} /></label>
            <label className="field-control"><span>Investment Fee (%)</span><input inputMode="decimal" min="0" onChange={(event) => setProfileValue("investment_fee_percent", event.target.value)} step="0.01" type="number" value={profile.investment_fee_percent} /></label>
          </div>
        </section>
      ) : null}

      {stage === "modules" ? (
        <section className="analytics-tab-panel stack" role="tabpanel">
          <h2>Enabled Modules</h2>
          <div className="settings-card-grid">
            {alwaysOnModules.map((module) => <label className="profile-filter-chip is-selected" key={module.id}><input checked disabled type="checkbox" /><span>{module.label}</span><small>Required</small></label>)}
            {optionalModules.map((module) => <label className={`profile-filter-chip${modules[module.id] ? " is-selected" : ""}`} key={module.id}><input checked={modules[module.id]} onChange={(event) => setModuleEnabled(module.id, event.target.checked)} type="checkbox" /><span>{module.label}</span></label>)}
          </div>
          {modules["each-way-extra-places"] ? <label className="field-control"><span>Weekly Extra Place Loss Budget (£)</span><input inputMode="decimal" min="0" onChange={(event) => setWeeklyExtraPlaceBudget(event.target.value)} step="0.01" type="number" value={weeklyExtraPlaceBudget} /></label> : null}
        </section>
      ) : null}

      {stage === "accounts" ? (
        <section className="analytics-tab-panel stack" role="tabpanel">
          <h2>Profile Accounts</h2>
          {catalogueState === "ready" ? <p className="field-hint">{catalogue.length} active providers from the Fund Manager Account Catalogue.</p> : null}
          <div className="table-toolbar settings-table-toolbar">
            <label className="field-control table-search-field"><span>Search Accounts</span><input aria-label="Search global Account Catalogue for onboarding" onChange={(event) => setSearch(event.target.value)} type="search" value={search} /></label>
            <div className="settings-table-filter-group"><label className="field-control table-filter-field"><span>Account Type</span><select onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} value={typeFilter}><option>All</option><option>Bookmaker</option><option>Exchange</option><option>Bank</option></select></label></div>
          </div>
          {catalogueState === "loading" ? <p aria-live="polite">Loading Account Catalogue…</p> : null}
          {catalogueState === "error" ? <p className="error-text" role="alert">Account Catalogue could not be loaded. Profile creation is blocked.</p> : null}
          {catalogueState === "ready" ? <LedgerTableScroll dataPdId="founder-onboarding.accounts.table"><table className="data-table"><thead><tr><th>Use</th><th>Provider</th><th>Type</th><th>Status</th><th>Opening Balance</th><th>Cash Total</th></tr></thead><tbody>{visibleCatalogue.map((record) => { const selected = selectedAccounts[record.catalogue_id]; return <tr key={record.catalogue_id}><td><label className="profile-filter-chip"><input aria-label={`Use ${record.brand_name}`} checked={Boolean(selected)} onChange={() => toggleAccount(record)} type="checkbox" /><span>{selected ? "Selected" : "Select"}</span></label></td><td><span className="account-brand-pill" style={{ backgroundColor: record.background_colour, color: record.foreground_colour }}>{record.brand_name}</span><span className="table-status">{record.operator_group || record.platform || "Global catalogue"}</span></td><td><span className="table-chip table-chip-muted">{record.account_type}</span></td><td>{selected ? <select aria-label={`${record.brand_name} Profile status`} onChange={(event) => updateSelectedAccount(record.catalogue_id, { status: event.target.value })} value={selected.status}>{accountStatuses.map((status) => <option key={status}>{status}</option>)}</select> : "—"}</td><td>{selected ? <input aria-label={`${record.brand_name} opening balance`} inputMode="decimal" min="0" onChange={(event) => updateSelectedAccount(record.catalogue_id, { opening_balance: event.target.value })} step="0.01" type="number" value={selected.opening_balance} /> : "—"}</td><td>{selected ? <label className="profile-filter-chip"><input checked={selected.counts_in_cash_total} onChange={(event) => updateSelectedAccount(record.catalogue_id, { counts_in_cash_total: event.target.checked })} type="checkbox" /><span>Included</span></label> : "—"}</td></tr>; })}</tbody></table></LedgerTableScroll> : null}
          {selectedBanks.length ? <label className="field-control"><span>Main Bank Account</span><select onChange={(event) => setProfileValue("main_bank_catalogue_id", event.target.value)} value={profile.main_bank_catalogue_id}><option value="">No main bank selected</option>{selectedBanks.map((bank) => <option key={bank.catalogue_id} value={bank.catalogue_id}>{bank.brand_name}</option>)}</select></label> : null}
        </section>
      ) : null}

      {stage === "quick-actions" ? (
        <section className="analytics-tab-panel stack" role="tabpanel">
          <h2>Quick Actions</h2>
          <p className="field-hint">Required Fund Manager actions are inherited automatically. Select up to four optional favourites per enabled ledger; defaults can be refined later in Profile Settings.</p>
          {availableQuickActions.length ? (
            <div className="settings-card-grid" data-pd-id="founder-onboarding.quick-actions.list">
              {availableQuickActions.map(({ preset, ledger }) => {
                const key = `${preset.preset_id}:${ledger}`;
                const required = preset.quick_add.enforcement === "required";
                const selected = Boolean(selectedQuickActions[key]);
                return (
                  <label className={`profile-filter-chip${required || selected ? " is-selected" : ""}`} key={key}>
                    <input
                      checked={required || selected}
                      disabled={required}
                      onChange={() => toggleQuickAction(preset.preset_id, ledger)}
                      type="checkbox"
                    />
                    <span>{preset.quick_add.display_label || preset.name}</span>
                    <small>{ledger}{required ? " · Required" : ""}</small>
                  </label>
                );
              })}
            </div>
          ) : <p className="field-hint">No optional Quick Actions are configured for the enabled ledgers. You can create them later in Profile Settings.</p>}
        </section>
      ) : null}

      {stage === "review" ? (
        <section className="analytics-tab-panel stack" role="tabpanel">
          <h2>Review Profile</h2>
          <div className="stat-grid founder-onboarding-review-grid">
            <article className="stat-card"><span className="eyebrow">Profile</span><strong>{profile.display_name || "Not set"}</strong><span>{profile.profile_code || "No code"}</span></article>
            <article className="stat-card"><span className="eyebrow">Modules</span><strong>{enabledModules.length}</strong><span>{enabledModules.join(" · ")}</span></article>
            <article className="stat-card"><span className="eyebrow">Accounts</span><strong>{selectedRecords.length}</strong><span>{selectedBanks.length ? `${selectedBanks.length} bank selected` : "No bank selected"}</span></article>
            <article className="stat-card"><span className="eyebrow">Quick Actions</span><strong>{Object.keys(selectedQuickActions).length}</strong><span>Optional favourites selected</span></article>
            <article className="stat-card"><span className="eyebrow">Opening Account Cash</span><strong>£ {selectedCash.toFixed(2)}</strong><span>Starting bankroll: £ {parseAmount(profile.starting_bankroll).toFixed(2)}</span></article>
          </div>
          <p className="field-hint">Provider identity comes from the Fund Manager Account Catalogue. Statuses, balances, restrictions, and preferences belong only to this Profile.</p>
        </section>
      ) : null}

      {error ? <p className="error-text" role="alert">{error}</p> : null}
      <footer className="tracker-nav founder-onboarding-actions">
        <button className="button-link" disabled={stage === "profile" || isSaving} onClick={goPrevious} type="button">Previous</button>
        {stage !== "review" ? <button className="modal-primary-button" disabled={catalogueState === "error" || isSaving} onClick={goNext} type="button">Next</button> : <button className="modal-primary-button icon-text-action" disabled={isSaving || catalogueState !== "ready" || !stageIsValid("profile")} onClick={() => void createProfile()} type="button">{isSaving ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">person_add</span>}<span>{isSaving ? "Creating Profile" : "Create Profile"}</span></button>}
      </footer>
    </section>
  );
}
