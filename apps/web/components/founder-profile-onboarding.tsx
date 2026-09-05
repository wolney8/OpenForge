"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FinancialTextInput } from "@/components/financial-text-input";
import { LedgerEditorTabPanel, LedgerEditorTabRail } from "@/components/ledger-editor-tabs";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { LedgerPagination } from "@/components/ledger-pagination";
import { LedgerTableScroll } from "@/components/ledger-table-scroll";
import { PercentageTextInput } from "@/components/percentage-text-input";
import { apiBaseUrl } from "@/lib/api";
import { beginRouteTransition } from "@/lib/shell-loading";
import { formatApiErrorBody } from "@/lib/api-error";
import { formatDecimalInput } from "@/lib/decimal-input";
import type { LedgerEditorTabDefinition } from "@/lib/ledger-editor-tabs";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";

type CatalogueRecord = {
  catalogue_id: string;
  account_type: "Bookmaker" | "Exchange" | "Bank";
  brand_name: string;
  short_display_name: string;
  operator_group: string;
  platform: string;
  operating_jurisdictions: string[];
  operating_channels: string[];
  foreground_colour: string;
  background_colour: string;
  status: "Active" | "Archived";
  introduced_at?: string;
};

type SelectedAccount = {
  catalogue_id: string;
  status: string;
  opening_balance: string;
  pending_withdrawal_amount: string;
  counts_in_cash_total: boolean;
  restrictions: string[];
  notes: string;
  commission_rate: string;
};

type SelectedAccountPayload = Omit<SelectedAccount, "commission_rate"> & {
  commission_rate?: string;
};

function serializeSelectedAccounts(
  accounts: Record<string, SelectedAccount>,
): SelectedAccountPayload[] {
  return Object.values(accounts).map(({ commission_rate: commissionRate, ...account }) => {
    const normalizedCommission = commissionRate.trim();
    return normalizedCommission
      ? { ...account, commission_rate: normalizedCommission }
      : account;
  });
}

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
type SetupPath = "fresh" | "import";

type AccountColumnKey = "use" | "provider" | "type" | "status" | "opening_balance" | "commission" | "cash_total";
type AccountSortKey = "provider" | "type" | "status" | "opening_balance";

const freshStages: Array<{ id: Stage; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "modules", label: "Modules" },
  { id: "accounts", label: "Accounts" },
  { id: "quick-actions", label: "Quick Actions" },
  { id: "review", label: "Review" },
];

const importStages: Array<{ id: Stage; label: string }> = [
  { id: "profile", label: "Profile" },
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

const accountColumns: Array<{ key: AccountColumnKey; label: string }> = [
  { key: "use", label: "Use" },
  { key: "provider", label: "Provider" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "opening_balance", label: "Opening Balance" },
  { key: "commission", label: "Commission (%)" },
  { key: "cash_total", label: "Cash Total" },
];

const initialAccountColumnWidths: Record<AccountColumnKey, number> = {
  use: 132,
  provider: 280,
  type: 160,
  status: 230,
  opening_balance: 210,
  commission: 180,
  cash_total: 160,
};

const profileOnboardingJurisdiction = "GB";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseAmount(value: string) {
  const parsed = Number(value || "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeTwoDecimals(value: string): string {
  return formatDecimalInput(value, { emptyValue: "0.00" });
}

function isValidPercentagePoints(value: string): boolean {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
}

function isRecentlyIntroduced(value?: string): boolean {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) && Date.now() - timestamp <= 30 * 24 * 60 * 60 * 1000;
}

export function ProfileOnboarding() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("profile");
  const [setupPath, setSetupPath] = useState<SetupPath>("fresh");
  const [isDirty, setIsDirty] = useState(false);
  const [guidedEntryDismissed, setGuidedEntryDismissed] = useState(false);
  const [catalogue, setCatalogue] = useState<CatalogueRecord[]>([]);
  const [catalogueState, setCatalogueState] = useState<"loading" | "ready" | "error">("loading");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | CatalogueRecord["account_type"]>("All");
  const [accountPage, setAccountPage] = useState(1);
  const [accountPageSize, setAccountPageSize] = useState(8);
  const [accountSort, setAccountSort] = useState<{ key: AccountSortKey; direction: "asc" | "desc" }>({ key: "provider", direction: "asc" });
  const [accountColumnWidths, setAccountColumnWidths] = useState<Record<AccountColumnKey, number>>(initialAccountColumnWidths);
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, SelectedAccount>>({});
  const [quickActionPresets, setQuickActionPresets] = useState<QuickActionPreset[]>([]);
  const [quickActionsState, setQuickActionsState] = useState<"loading" | "ready" | "error">("loading");
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
    management_fee_percent: "25.00",
    investment_fee_percent: "25.00",
    main_bank_catalogue_id: "",
    operating_jurisdiction: profileOnboardingJurisdiction,
  });
  const [modules, setModules] = useState<Record<string, boolean>>({
    "sportsbook-bets": true,
    "free-bets": true,
    "cash-adjustments": true,
    "casino-offers": true,
    "each-way-extra-places": true,
  });
  const [weeklyExtraPlaceBudget, setWeeklyExtraPlaceBudget] = useState("15.00");
  const confirmDiscardChanges = useUnsavedChangesGuard(
    isDirty && !isSaving,
    "Unsaved Profile setup changes will be discarded.",
  );

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
        setCatalogue(payload.records.filter(
          (record) =>
            record.status === "Active" &&
            record.operating_jurisdictions.includes(profileOnboardingJurisdiction),
        ));
        setCatalogueState("ready");
      })
      .catch(() => {
        if (active) setCatalogueState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const onboardingStages = setupPath === "import" ? importStages : freshStages;

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
          setQuickActionsState("ready");
        }
      })
      .catch(() => {
        if (active) setQuickActionsState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredCatalogue = useMemo(() => {
    const query = search.trim().toLowerCase();
    return catalogue.filter((record) => {
      if (typeFilter !== "All" && record.account_type !== typeFilter) return false;
      if (!query) return true;
      return [record.brand_name, record.short_display_name, record.operator_group, record.platform]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [catalogue, search, typeFilter]);

  const sortedCatalogue = useMemo(() => [...filteredCatalogue].sort((left, right) => {
    const leftSelected = selectedAccounts[left.catalogue_id];
    const rightSelected = selectedAccounts[right.catalogue_id];
    const leftValue = accountSort.key === "provider"
      ? left.brand_name
      : accountSort.key === "type"
        ? left.account_type
        : accountSort.key === "status"
          ? leftSelected?.status ?? "Not Signed Up"
          : leftSelected?.opening_balance ?? "0";
    const rightValue = accountSort.key === "provider"
      ? right.brand_name
      : accountSort.key === "type"
        ? right.account_type
        : accountSort.key === "status"
          ? rightSelected?.status ?? "Not Signed Up"
          : rightSelected?.opening_balance ?? "0";
    const comparison = accountSort.key === "opening_balance"
      ? parseAmount(leftValue) - parseAmount(rightValue)
      : leftValue.localeCompare(rightValue, "en-GB", { numeric: true });
    return accountSort.direction === "asc" ? comparison : -comparison;
  }), [accountSort, filteredCatalogue, selectedAccounts]);
  const accountPageCount = Math.max(1, Math.ceil(sortedCatalogue.length / accountPageSize));
  const effectiveAccountPage = Math.min(accountPage, accountPageCount);
  const visibleCatalogue = sortedCatalogue.slice(
    (effectiveAccountPage - 1) * accountPageSize,
    effectiveAccountPage * accountPageSize,
  );

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
    setIsDirty(true);
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function toggleAccount(record: CatalogueRecord) {
    setIsDirty(true);
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
          commission_rate: "",
        },
      };
    });
  }

  function updateSelectedAccount(catalogueId: string, values: Partial<SelectedAccount>) {
    setIsDirty(true);
    setSelectedAccounts((current) => ({
      ...current,
      [catalogueId]: { ...current[catalogueId], ...values },
    }));
  }

  function toggleQuickAction(presetId: string, ledgerType: SelectedQuickAction["ledger_type"]) {
    setIsDirty(true);
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
    setIsDirty(true);
    setModules((current) => ({ ...current, [moduleId]: enabled }));
    if (enabled) return;
    setSelectedQuickActions((current) => Object.fromEntries(
      Object.entries(current).filter(([, selection]) => quickActionModule[selection.ledger_type] !== moduleId),
    ));
  }

  function toggleAccountSort(key: AccountSortKey) {
    setAccountSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" });
    setAccountPage(1);
  }

  const startColumnResize = useCallback((
    event: ReactMouseEvent<HTMLSpanElement>,
    key: AccountColumnKey,
    headerCell: HTMLTableCellElement | null,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const initialWidth = headerCell?.getBoundingClientRect().width ?? accountColumnWidths[key];
    const onMove = (moveEvent: MouseEvent) => {
      setAccountColumnWidths((current) => ({
        ...current,
        [key]: Math.max(112, Math.round(initialWidth + moveEvent.clientX - startX)),
      }));
    };
    const onEnd = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
  }, [accountColumnWidths]);

  function stageIsValid(target: Stage) {
    if (target === "profile") {
      return Boolean(
        profile.display_name.trim() &&
        /^[A-Z0-9-]{3,32}$/.test(profile.profile_code) &&
        isValidPercentagePoints(profile.management_fee_percent) &&
        isValidPercentagePoints(profile.investment_fee_percent)
      );
    }
    if (target === "modules") {
      return alwaysOnModules.every((module) => modules[module.id]);
    }
    if (target === "accounts") {
      const selectedExchanges = selectedRecords.filter(
        (record) => record.account_type === "Exchange",
      );
      return Boolean(
        selectedExchanges.length &&
        selectedExchanges.every((exchange) => {
          const commission = selectedAccounts[exchange.catalogue_id]?.commission_rate.trim();
          return Boolean(
            commission &&
            Number.isFinite(Number(commission)) &&
            Number(commission) >= 0 &&
            Number(commission) <= 1
          );
        }) &&
        (!profile.main_bank_catalogue_id || selectedAccounts[profile.main_bank_catalogue_id])
      );
    }
    return true;
  }

  const activeStageIndex = onboardingStages.findIndex((item) => item.id === stage);
  const guidedTarget = useMemo(() => {
    if (!profile.display_name.trim()) {
      return { stage: "profile" as Stage, field: "display-name", message: "Enter The Display Name." };
    }
    if (!/^[A-Z0-9-]{3,32}$/.test(profile.profile_code)) {
      return { stage: "profile" as Stage, field: "profile-code", message: "Enter An Uppercase Profile Code." };
    }
    if (!isValidPercentagePoints(profile.management_fee_percent)) {
      return { stage: "profile" as Stage, field: "management-fee", message: "Enter The Management Fee Percentage." };
    }
    if (!isValidPercentagePoints(profile.investment_fee_percent)) {
      return { stage: "profile" as Stage, field: "investment-fee", message: "Enter The Investment Fee Percentage." };
    }
    if (stage === "modules") {
      return { stage, field: "modules", message: "Review The Enabled Modules, Then Continue." };
    }
    if (stage === "accounts") {
      const selectedExchanges = selectedRecords.filter(
        (record) => record.account_type === "Exchange",
      );
      if (!selectedExchanges.length) {
        return { stage, field: "accounts", message: "Select At Least One Exchange." };
      }
      const invalidExchange = selectedExchanges.find((exchange) => {
        const commission = selectedAccounts[exchange.catalogue_id]?.commission_rate.trim();
        return !commission || !Number.isFinite(Number(commission)) || Number(commission) < 0 || Number(commission) > 1;
      });
      if (invalidExchange) {
        return { stage, field: `commission-${invalidExchange.catalogue_id}`, message: "Enter The Exchange Commission." };
      }
      return { stage, field: "accounts", message: "Review The Profile Accounts, Then Continue." };
    }
    if (stage === "quick-actions") {
      return { stage, field: "quick-actions", message: "Review Optional Quick Actions, Then Continue." };
    }
    return { stage: "review" as Stage, field: "create-profile", message: "Review The Profile And Create It." };
  }, [
    profile.display_name,
    profile.investment_fee_percent,
    profile.management_fee_percent,
    profile.profile_code,
    selectedAccounts,
    selectedRecords,
    stage,
  ]);
  const onboardingTabs: LedgerEditorTabDefinition[] = onboardingStages.map((item, index) => {
    const priorInvalid = onboardingStages.slice(0, index).some((prior) => !stageIsValid(prior.id));
    const status = priorInvalid
      ? "locked"
      : index < activeStageIndex
        ? "complete"
        : item.id === stage && !stageIsValid(item.id)
          ? "invalid"
          : "neutral";
    return {
      id: item.id,
      label: item.label,
      status,
      requiredIssueCount: status === "invalid" ? 1 : 0,
    };
  });

  const focusGuidedTarget = useCallback(() => {
    if (guidedTarget.stage !== stage) setStage(guidedTarget.stage);
    window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(`[data-guided-field="${guidedTarget.field}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusTarget = target?.matches("input, select, button")
        ? target
        : target?.querySelector<HTMLElement>("input, select, button");
      focusTarget?.focus({ preventScroll: true });
    }, 80);
  }, [guidedTarget, stage]);

  function goNext() {
    setError("");
    if (!stageIsValid(stage)) {
      setError(stage === "profile" ? "Complete the Profile identity and fee percentages." : stage === "accounts" ? "Select at least one Exchange and enter its commission rate." : "Review the required selections before continuing.");
      return;
    }
    const index = onboardingStages.findIndex((item) => item.id === stage);
    setStage(onboardingStages[Math.min(onboardingStages.length - 1, index + 1)].id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goPrevious() {
    setError("");
    const index = onboardingStages.findIndex((item) => item.id === stage);
    setStage(onboardingStages[Math.max(0, index - 1)].id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectStage(target: Stage) {
    const targetIndex = onboardingStages.findIndex((item) => item.id === target);
    const invalidStage = onboardingStages
      .slice(0, targetIndex)
      .find((item) => !stageIsValid(item.id));
    if (invalidStage) {
      setStage(invalidStage.id);
      setError(invalidStage.id === "profile" ? "Complete the Profile identity and fee percentages." : invalidStage.id === "accounts" ? "Select at least one Exchange and enter its commission rate." : "Review the required selections before continuing.");
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
          setup_path: setupPath,
          starting_bankroll: normalizeTwoDecimals(profile.starting_bankroll),
          management_fee_percent: normalizeTwoDecimals(profile.management_fee_percent),
          investment_fee_percent: normalizeTwoDecimals(profile.investment_fee_percent),
          iteration_number: Number(profile.iteration_number),
          enabled_modules: enabledModules,
          weekly_extra_place_loss_budget: weeklyExtraPlaceBudget,
          accounts: setupPath === "fresh" ? serializeSelectedAccounts(selectedAccounts) : [],
          quick_actions: setupPath === "fresh" ? Object.values(selectedQuickActions) : [],
          main_bank_catalogue_id: setupPath === "fresh" ? profile.main_bank_catalogue_id : "",
          preferences: { operating_jurisdiction: profile.operating_jurisdiction },
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
      setIsDirty(false);
      beginRouteTransition();
      router.push(setupPath === "import"
        ? `/profiles/${created.profile.profile_id}/tracker/settings?setup=import#import-export`
        : `/profiles/${created.profile.profile_id}/tracker/dashboard`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create Profile.");
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelOnboarding() {
    if (!(await confirmDiscardChanges())) return;
    setIsDirty(false);
    beginRouteTransition();
    router.push("/profiles");
  }

  return (
    <section className="content-panel stack founder-onboarding" data-pd-id="founder-onboarding.page">
      <header className="stack-tight">
        <span className="eyebrow">Fund Manager</span>
        <h1>Create Profile</h1>
      </header>

      <LedgerEditorTabRail
        activeTabId={stage}
        ariaLabel="Profile setup steps"
        guidedTargetTabId={guidedEntryDismissed ? null : guidedTarget.stage}
        onActiveTabChange={(tabId) => selectStage(tabId as Stage)}
        tabs={onboardingTabs}
      />

      {!guidedEntryDismissed ? (
        <section
          aria-label="Profile setup guided access"
          className="guided-entry-banner guided-entry-banner-next_required"
          data-pd-id="profile-onboarding.guided-entry"
          role="status"
        >
          <button className="guided-entry-action" onClick={focusGuidedTarget} type="button">
            <span className="eyebrow">Next required</span>
            <strong>{guidedTarget.stage !== stage ? `Go To ${onboardingStages.find((item) => item.id === guidedTarget.stage)?.label} And ${guidedTarget.message}` : guidedTarget.message}</strong>
          </button>
          <button aria-label="Dismiss Profile setup guide" className="icon-button guided-entry-dismiss" onClick={() => setGuidedEntryDismissed(true)} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button>
        </section>
      ) : (
        <button className="button-link guided-entry-restore" onClick={() => setGuidedEntryDismissed(false)} type="button">Show guide</button>
      )}

      {stage === "profile" ? (
        <LedgerEditorTabPanel activeTabId={stage} tabId="profile">
        <section className="analytics-tab-panel stack">
          <section className="content-subpanel stack-tight" data-pd-id="profile-onboarding.setup-path">
            <div><span className="eyebrow">Setup path</span><h2>How should this Profile start?</h2></div>
            <div aria-label="Profile setup path" className="settings-card-grid" role="radiogroup">
              <label className={`profile-filter-chip${setupPath === "fresh" ? " is-selected" : ""}`}>
                <input checked={setupPath === "fresh"} name="profile-setup-path" onChange={() => { setIsDirty(true); setSetupPath("fresh"); setStage("profile"); }} type="radio" />
                <span>Start fresh</span>
                <small>Configure modules, Accounts and Quick Actions now.</small>
              </label>
              <label className={`profile-filter-chip${setupPath === "import" ? " is-selected" : ""}`}>
                <input checked={setupPath === "import"} name="profile-setup-path" onChange={() => { setIsDirty(true); setSetupPath("import"); setStage("profile"); }} type="radio" />
                <span>Import existing workbook/data</span>
                <small>Create the Profile, then use the existing dry-run and review workflow.</small>
              </label>
            </div>
            <p className="field-hint">
              Have a structured portable Profile backup?{" "}
              <Link className="button-link compact-action" href="/profiles/restore">
                Restore portable backup
              </Link>
            </p>
          </section>
          <div className="form-grid">
            <label className={`field-control${guidedTarget.field === "display-name" && !guidedEntryDismissed ? " is-guided-next" : ""}`} data-guided-field="display-name"><span>Display Name</span><input autoComplete="name" autoFocus maxLength={120} onChange={(event) => setProfileValue("display_name", event.target.value)} value={profile.display_name} /></label>
            <label className={`field-control${guidedTarget.field === "profile-code" && !guidedEntryDismissed ? " is-guided-next" : ""}`} data-guided-field="profile-code"><span>Profile Code</span><input maxLength={32} onChange={(event) => setProfileValue("profile_code", event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} placeholder="PROFILE-001" value={profile.profile_code} /></label>
            {setupPath === "fresh" ? <>
              <label className="field-control"><span>Tracking Start Date</span><input max={todayIsoDate()} onChange={(event) => setProfileValue("tracking_start_date", event.target.value)} type="date" value={profile.tracking_start_date} /></label>
              <label className="field-control"><span>Active Date Preset</span><select onChange={(event) => setProfileValue("active_date_preset", event.target.value)} value={profile.active_date_preset}><option>This Week</option><option>Week (Mon-Sun)</option><option>Past 7 Days</option><option>This Month</option><option>This Year</option><option>All Dates</option></select></label>
              <label className="field-control"><span>Iteration Number</span><input inputMode="numeric" min="1" onChange={(event) => setProfileValue("iteration_number", event.target.value.replace(/\D/g, ""))} type="number" value={profile.iteration_number} /></label>
              <label className="field-control"><span>Starting Bankroll</span><FinancialTextInput allowNegative={false} ariaLabel="Starting Bankroll" clearInitialZeroOnFocus dataPdId="profile-onboarding.starting-bankroll" id="profile-onboarding-starting-bankroll" onBlur={() => setProfileValue("starting_bankroll", normalizeTwoDecimals(profile.starting_bankroll))} onChange={(value) => setProfileValue("starting_bankroll", value)} value={profile.starting_bankroll} valueTone={parseAmount(profile.starting_bankroll) > 0 ? "positive" : "neutral"} /></label>
            </> : null}
            <label className={`field-control${guidedTarget.field === "management-fee" && !guidedEntryDismissed ? " is-guided-next" : ""}`} data-guided-field="management-fee"><span>Management Fee</span><PercentageTextInput ariaLabel="Management Fee" clearInitialValueOnFocus dataPdId="profile-onboarding.management-fee" id="profile-onboarding-management-fee" onChange={(value) => setProfileValue("management_fee_percent", value)} value={profile.management_fee_percent} valueMode="percentage-points" /></label>
            <label className={`field-control${guidedTarget.field === "investment-fee" && !guidedEntryDismissed ? " is-guided-next" : ""}`} data-guided-field="investment-fee"><span>Investment Fee</span><PercentageTextInput ariaLabel="Investment Fee" clearInitialValueOnFocus dataPdId="profile-onboarding.investment-fee" id="profile-onboarding-investment-fee" onChange={(value) => setProfileValue("investment_fee_percent", value)} value={profile.investment_fee_percent} valueMode="percentage-points" /></label>
            <label className="field-control"><span>Operating Jurisdiction</span><select disabled value={profile.operating_jurisdiction}><option value="GB">United Kingdom (GB)</option></select></label>
          </div>
        </section>
        </LedgerEditorTabPanel>
      ) : null}

      {stage === "modules" ? (
        <LedgerEditorTabPanel activeTabId={stage} tabId="modules"><section className="analytics-tab-panel stack" data-guided-field="modules">
          <h2>Enabled Modules</h2>
          <div className="settings-card-grid">
            {alwaysOnModules.map((module) => <label className="profile-filter-chip is-selected" key={module.id}><input checked disabled type="checkbox" /><span>{module.label}</span><small>Required</small></label>)}
            {optionalModules.map((module) => <label className={`profile-filter-chip${modules[module.id] ? " is-selected" : ""}`} key={module.id}><input checked={modules[module.id]} onChange={(event) => setModuleEnabled(module.id, event.target.checked)} type="checkbox" /><span>{module.label}</span></label>)}
          </div>
          {modules["each-way-extra-places"] ? <label className="field-control"><span>Weekly Extra Place Loss Budget</span><FinancialTextInput allowNegative={false} ariaLabel="Weekly Extra Place Loss Budget" dataPdId="profile-onboarding.extra-place-budget" id="profile-onboarding-extra-place-budget" onBlur={() => { setIsDirty(true); setWeeklyExtraPlaceBudget(normalizeTwoDecimals(weeklyExtraPlaceBudget)); }} onChange={(value) => { setIsDirty(true); setWeeklyExtraPlaceBudget(value); }} value={weeklyExtraPlaceBudget} /></label> : null}
        </section></LedgerEditorTabPanel>
      ) : null}

      {stage === "accounts" ? (
        <LedgerEditorTabPanel activeTabId={stage} tabId="accounts"><section className="analytics-tab-panel stack" data-guided-field="accounts">
          <h2>Profile Accounts</h2>
          {catalogueState === "ready" ? <p className="field-hint">{catalogue.length} active GB providers from the Fund Manager Account Catalogue.</p> : null}
          <div className="table-toolbar settings-table-toolbar">
            <label className="field-control table-search-field"><span>Search Accounts</span><input aria-label="Search global Account Catalogue for onboarding" onChange={(event) => { setSearch(event.target.value); setAccountPage(1); }} type="search" value={search} /></label>
            <div className="settings-table-filter-group"><label className="field-control table-filter-field"><span>Account Type</span><select onChange={(event) => { setTypeFilter(event.target.value as typeof typeFilter); setAccountPage(1); }} value={typeFilter}><option>All</option><option>Bookmaker</option><option>Exchange</option><option>Bank</option></select></label></div>
          </div>
          {catalogueState === "loading" ? (
            <section
              aria-busy="true"
              className="tracker-summary-shell sportsbook-page-shell"
            >
              <LedgerLoadingIndicator
                dataPdId="profile-onboarding.account-catalogue.loading"
                label="Loading Account Catalogue"
              />
            </section>
          ) : null}
          {catalogueState === "error" ? <p className="error-text" role="alert">Account Catalogue could not be loaded. Profile creation is blocked.</p> : null}
          {catalogueState === "ready" ? <>
            <LedgerPagination ariaLabel="Profile onboarding accounts" currentPage={effectiveAccountPage} onPageChange={setAccountPage} onPageSizeChange={(nextSize) => { setAccountPageSize(nextSize); setAccountPage(1); }} pageCount={accountPageCount} pageSize={accountPageSize} position="top" totalRows={sortedCatalogue.length} />
            <LedgerTableScroll dataPdId="profile-onboarding.accounts.table">
              <table className="data-table profile-onboarding-accounts-table">
                <colgroup>{accountColumns.map((column) => <col key={column.key} style={{ width: `${accountColumnWidths[column.key]}px` }} />)}</colgroup>
                <thead><tr>{accountColumns.map((column) => {
                  const sortable = (["provider", "type", "status", "opening_balance"] as AccountColumnKey[]).includes(column.key);
                  const activeSort = sortable && accountSort.key === column.key;
                  return <th aria-sort={sortable ? activeSort ? accountSort.direction === "asc" ? "ascending" : "descending" : "none" : undefined} key={column.key} scope="col"><div className="table-header-cell">{sortable ? <button className={`table-sort-button${activeSort ? " is-active" : ""}`} onClick={() => toggleAccountSort(column.key as AccountSortKey)} type="button"><span>{column.label}</span><span aria-hidden="true">{activeSort ? accountSort.direction === "asc" ? "▲" : "▼" : "↕"}</span></button> : <span className="table-header-label">{column.label}</span>}<span aria-hidden="true" className="table-column-resize-handle" onMouseDown={(event) => startColumnResize(event, column.key, event.currentTarget.closest("th"))} /></div></th>;
                })}</tr></thead>
                <tbody>{visibleCatalogue.length ? visibleCatalogue.map((record) => {
                  const selected = selectedAccounts[record.catalogue_id];
                  return <tr key={record.catalogue_id}>
                    <td><label className={`profile-filter-chip${selected ? " is-selected" : ""}`}><input aria-label={`Use ${record.brand_name}`} checked={Boolean(selected)} onChange={() => toggleAccount(record)} type="checkbox" /><span>{selected ? "Selected" : "Select"}</span></label></td>
                    <td><span className="profile-onboarding-provider-cell"><span className="account-brand-pill" style={{ backgroundColor: record.background_colour, color: record.foreground_colour }}>{record.brand_name}</span>{isRecentlyIntroduced(record.introduced_at) ? <span className="table-chip table-chip-warning">New</span> : null}<span className="table-status">{record.operator_group || record.platform || "Global catalogue"}</span></span></td>
                    <td><span className="table-chip table-chip-muted">{record.account_type}</span></td>
                    <td>{selected ? <label className="field-control table-inline-control"><span className="sr-only">{record.brand_name} Profile status</span><select aria-label={`${record.brand_name} Profile status`} onChange={(event) => updateSelectedAccount(record.catalogue_id, { status: event.target.value })} value={selected.status}>{accountStatuses.map((status) => <option key={status}>{status}</option>)}</select></label> : <span className="table-status">Not selected</span>}</td>
                    <td>{selected ? <label className="field-control table-inline-control"><span className="sr-only">{record.brand_name} opening balance</span><FinancialTextInput allowNegative={false} ariaLabel={`${record.brand_name} opening balance`} dataPdId={`profile-onboarding.account.${record.catalogue_id}.balance`} id={`profile-onboarding-${record.catalogue_id}-balance`} onBlur={() => updateSelectedAccount(record.catalogue_id, { opening_balance: normalizeTwoDecimals(selected.opening_balance) })} onChange={(value) => updateSelectedAccount(record.catalogue_id, { opening_balance: value })} value={selected.opening_balance} /></label> : "—"}</td>
                    <td>{selected && record.account_type === "Exchange" ? <label className={`field-control table-inline-control${guidedTarget.field === `commission-${record.catalogue_id}` && !guidedEntryDismissed ? " is-guided-next" : ""}`} data-guided-field={`commission-${record.catalogue_id}`}><span className="sr-only">{record.brand_name} commission (%)</span><PercentageTextInput ariaLabel={`${record.brand_name} commission (%)`} dataPdId={`profile-onboarding.account.${record.catalogue_id}.commission`} id={`profile-onboarding-${record.catalogue_id}-commission`} onChange={(value) => updateSelectedAccount(record.catalogue_id, { commission_rate: value })} value={selected.commission_rate} /></label> : "—"}</td>
                    <td>{selected ? <label className="profile-filter-chip is-selected"><input checked={selected.counts_in_cash_total} onChange={(event) => updateSelectedAccount(record.catalogue_id, { counts_in_cash_total: event.target.checked })} type="checkbox" /><span>Included</span></label> : "—"}</td>
                  </tr>;
                }) : <tr><td className="empty-cell" colSpan={accountColumns.length}>No GB providers match the current filters.</td></tr>}</tbody>
              </table>
            </LedgerTableScroll>
            <LedgerPagination ariaLabel="Profile onboarding accounts" currentPage={effectiveAccountPage} onPageChange={setAccountPage} onPageSizeChange={(nextSize) => { setAccountPageSize(nextSize); setAccountPage(1); }} pageCount={accountPageCount} pageSize={accountPageSize} position="bottom" totalRows={sortedCatalogue.length} />
          </> : null}
          {selectedBanks.length ? <label className="field-control"><span>Main Bank Account</span><select onChange={(event) => setProfileValue("main_bank_catalogue_id", event.target.value)} value={profile.main_bank_catalogue_id}><option value="">No main bank selected</option>{selectedBanks.map((bank) => <option key={bank.catalogue_id} value={bank.catalogue_id}>{bank.brand_name}</option>)}</select></label> : null}
        </section></LedgerEditorTabPanel>
      ) : null}

      {stage === "quick-actions" ? (
        <LedgerEditorTabPanel activeTabId={stage} tabId="quick-actions"><section className="analytics-tab-panel stack" data-guided-field="quick-actions">
          <h2>Quick Actions</h2>
          <p className="field-hint">Required Fund Manager actions are inherited automatically. Select up to four optional favourites per enabled ledger; defaults can be refined later in Profile Settings.</p>
          {quickActionsState === "loading" ? (
            <section aria-busy="true" className="tracker-summary-shell sportsbook-page-shell">
              <LedgerLoadingIndicator
                dataPdId="profile-onboarding.quick-actions.loading"
                label="Loading Quick Actions"
              />
            </section>
          ) : null}
          {quickActionsState === "error" ? <p className="error-text" role="alert">Quick Actions could not be loaded. You can continue and configure them later.</p> : null}
          {quickActionsState === "ready" && availableQuickActions.length ? (
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
          ) : null}
          {quickActionsState === "ready" && !availableQuickActions.length ? <p className="field-hint">No optional Quick Actions are configured for the enabled ledgers. You can create them later in Profile Settings.</p> : null}
        </section></LedgerEditorTabPanel>
      ) : null}

      {stage === "review" ? (
        <LedgerEditorTabPanel activeTabId={stage} tabId="review"><section className="analytics-tab-panel stack" data-guided-field="create-profile">
          <h2>Review Profile</h2>
          <div className="stat-grid founder-onboarding-review-grid">
            <article className="stat-card"><span className="eyebrow">Profile</span><strong>{profile.display_name || "Not set"}</strong><span>{profile.profile_code || "No code"}</span></article>
            <article className="stat-card"><span className="eyebrow">Setup</span><strong>{setupPath === "import" ? "Workbook import" : "Start fresh"}</strong><span>{setupPath === "import" ? "Dry run and review required" : "Configure now"}</span></article>
            {setupPath === "fresh" ? <>
              <article className="stat-card"><span className="eyebrow">Modules</span><strong>{enabledModules.length}</strong><span>{enabledModules.join(" · ")}</span></article>
              <article className="stat-card"><span className="eyebrow">Accounts</span><strong>{selectedRecords.length}</strong><span>{selectedBanks.length ? `${selectedBanks.length} bank selected` : "No bank selected"}</span></article>
              <article className="stat-card"><span className="eyebrow">Quick Actions</span><strong>{Object.keys(selectedQuickActions).length}</strong><span>Optional favourites selected</span></article>
              <article className="stat-card"><span className="eyebrow">Opening Account Cash</span><strong>£ {selectedCash.toFixed(2)}</strong><span>Starting bankroll: £ {parseAmount(profile.starting_bankroll).toFixed(2)}</span></article>
            </> : null}
          </div>
          <p className="field-hint">{setupPath === "import" ? "The workbook dry run can populate tracking settings, iteration, bankroll, main bank, Profile Accounts, balances and supported ledgers. Profile name and fee terms remain the Fund Manager's explicit choices; effective timestamp, review decisions and final import still require confirmation." : "Provider identity comes from the Fund Manager Account Catalogue. Statuses, balances, restrictions, and preferences belong only to this Profile."}</p>
        </section></LedgerEditorTabPanel>
      ) : null}

      {error ? <p className="error-text" role="alert">{error}</p> : null}
      <footer className="tracker-nav founder-onboarding-actions">
        <button className="button-link" disabled={isSaving} onClick={() => void cancelOnboarding()} type="button">Cancel</button>
        <div className="tracker-nav">
          <button className="review-chip review-chip-action-previous" disabled={stage === "profile" || isSaving} onClick={goPrevious} type="button">Previous</button>
          {stage !== "review" ? <button className="review-chip review-chip-action-next" disabled={(setupPath === "fresh" && catalogueState === "error") || isSaving} onClick={goNext} type="button">Next</button> : <button className="modal-primary-button icon-text-action" disabled={isSaving || (setupPath === "fresh" && catalogueState !== "ready") || !stageIsValid("profile")} onClick={() => void createProfile()} type="button">{isSaving ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">person_add</span>}<span>{isSaving ? "Creating Profile" : setupPath === "import" ? "Create and import" : "Create Profile"}</span></button>}
        </div>
      </footer>
    </section>
  );
}
