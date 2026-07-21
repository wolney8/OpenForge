"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { MaterialDateTimeField } from "@/components/material-date-time-field";
import { StatusToast } from "@/components/status-toast";
import { apiBaseUrl } from "@/lib/api";
import { fromDateTimeLocalValue } from "@/lib/date-format";
import { useDialogFocusLifecycle } from "@/lib/ledger-ui";
import {
  getActiveMasterAccountNames,
  type MasterAccountCatalogue,
} from "@/lib/bookmaker-catalogue";
import {
  betTypeOptions,
  fixtureTypeOptions,
  sportsbookOfferTypeOptions,
} from "@/lib/workbook-options";

type ProfileDescriptor = {
  profileId: string;
  displayName: string;
};

type ProfileAccount = {
  account: string;
  type: string;
  status: string;
};

type SportsbookRow = {
  sportsbook_bet_id: string;
  status: string;
  back_stake: string;
  back_odds: string;
  exchange_name: string;
  lay_odds_1: string;
  lay_actual: string;
  match_strategy: string;
  match_rating: string | null;
  scenario_pnl_if_back_wins: string | null;
  scenario_pnl_if_lay_wins: string | null;
  reference_lay_stake_standard: string | null;
  reference_lay_stake_underlay: string | null;
  reference_lay_stake_overlay: string | null;
};

type OpportunityTarget = {
  target_id: string;
  profile_id: string;
  bookmaker: string;
  display_name: string;
  profile_code: string;
  eligible: boolean;
  eligibility_state: string;
  eligibility_reasons: string[];
  eligibility_warnings: string[];
  workflow_state: string;
  workflow_reasons: string[];
  bookmaker_account_status: string;
  exchange_options: { exchange_name: string; commission_rate: string }[];
  default_exchange_name: string;
  sportsbook_bet: SportsbookRow | null;
};

type Opportunity = {
  opportunity_id: string;
  offer_text: string;
  bookmaker: string;
  offer_type: string;
  bet_type: string;
  offer_name: string;
  fixture_type: string;
  minimum_back_odds: string;
  default_back_stake: string;
  expected_settlement: string;
  reward_timing: string;
  preset_id: string;
  preset_version: number;
  preferred_strategy: string;
  state: string;
  targets: OpportunityTarget[];
};

type SetupDraft = {
  preset: "Offer" | "Mug Bet";
  offer_text: string;
  minimum_back_odds: string;
  default_back_stake: string;
  expected_settlement: string;
  reward_timing: string;
  bookmaker: string;
  bet_type: string;
  offer_type: string;
  fixture_type: string;
  offer_name: string;
  preset_id: string;
  preset_version: number;
  preferred_strategy: string;
};

type CommonBetCombo = {
  preset_id: string;
  name: string;
  bookmaker: string;
  bookmakers: string[];
  offer_type: string;
  bet_type: string;
  offer_name: string;
  fixture_type: string;
  default_back_stake: string;
  minimum_back_odds: string;
  default_strategy: string;
  allowed_strategies: string[];
  version: number;
};

const emptySetup: SetupDraft = {
  preset: "Offer",
  offer_text: "",
  minimum_back_odds: "",
  default_back_stake: "",
  expected_settlement: "",
  reward_timing: "",
  bookmaker: "",
  bet_type: "",
  offer_type: "",
  fixture_type: "",
  offer_name: "",
  preset_id: "",
  preset_version: 0,
  preferred_strategy: "",
};

const inlineStrategies = new Set(["Standard", "Underlay", "Overlay", "Custom", "No Lay"]);
const standardStrategies = ["Standard", "Underlay", "Overlay", "Custom", "Partial Lay", "Multilay"] as const;
const mugStrategies = ["No Lay", ...standardStrategies] as const;

type MugTargetDraft = {
  id: string;
  profile_id: string;
  bookmaker: string;
};

type ProfileBookmakerOption = {
  name: string;
  status: string;
};

const bookmakerWarningStatuses = new Set([
  "limited",
  "soft limited",
  "bonus restricted",
  "pending sign up",
]);
const bookmakerBlockedStatuses = new Set([
  "archived",
  "blocked",
  "closed",
  "gubbed",
  "inactive",
  "not using",
  "kyc blocked",
  "risk blocked",
  "suspended",
  "casino only",
]);

function bookmakerOptionIsUsable(status: string, offerType: string): boolean {
  const normalized = status.trim().toLowerCase();
  if (!normalized || normalized === "missing") return false;
  if (bookmakerBlockedStatuses.has(normalized)) return false;
  if (normalized === "bonus restricted" && offerType !== "Mug Bet") return false;
  return normalized === "active" || bookmakerWarningStatuses.has(normalized) || normalized === "bonus restricted";
}

function bookmakerOptionLabel(option: ProfileBookmakerOption): string {
  return `${option.name} — ${option.status || "Not configured"}`;
}

function comboOfferType(combos: CommonBetCombo[], presetId: string): string {
  return combos.find((combo) => combo.preset_id === presetId)?.offer_type ?? "";
}

function formatOdds(value: string): string {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) ? parsed.toFixed(2) : value;
}

function suggestedLay(row: SportsbookRow): string | null {
  if (row.match_strategy === "Standard") return row.reference_lay_stake_standard;
  if (row.match_strategy === "Underlay") return row.reference_lay_stake_underlay;
  if (row.match_strategy === "Overlay") return row.reference_lay_stake_overlay;
  return null;
}

function formatMoney(value: string | null): string | null {
  if (value === null || !Number.isFinite(Number(value))) return null;
  const amount = Number(value);
  return `${amount < 0 ? "-" : "+"}£${Math.abs(amount).toFixed(2)}`;
}

function formatMatchRating(value: string | null): string | null {
  if (value === null || !Number.isFinite(Number(value))) return null;
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function PendingMetric({ label }: { label: string }) {
  return (
    <span aria-label={`${label} awaiting calculation inputs`} className="opportunity-pending-metric">
      <span aria-hidden="true">—</span>
    </span>
  );
}

function hasPositiveNumber(value: string): boolean {
  return value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) > 0;
}

function canCopyPlacementDown(row: SportsbookRow): boolean {
  if (!hasPositiveNumber(row.back_stake) || !hasPositiveNumber(row.back_odds)) return false;
  if (row.match_strategy === "No Lay") return true;
  return Boolean(
    row.exchange_name.trim() &&
      hasPositiveNumber(row.lay_odds_1) &&
      inlineStrategies.has(row.match_strategy)
  );
}

function invalidatePlacementCalculation(
  patch: Partial<SportsbookRow>
): Partial<SportsbookRow> {
  return {
    ...patch,
    lay_actual: "",
    match_rating: null,
    scenario_pnl_if_back_wins: null,
    scenario_pnl_if_lay_wins: null,
    reference_lay_stake_standard: null,
    reference_lay_stake_underlay: null,
    reference_lay_stake_overlay: null,
  };
}

function suggestionIsApplied(row: SportsbookRow, suggestion: string | null): boolean {
  return Boolean(
    suggestion &&
      row.lay_actual.trim() &&
      Number.isFinite(Number(row.lay_actual)) &&
      Number(row.lay_actual).toFixed(2) === Number(suggestion).toFixed(2)
  );
}

function targetUpdatePayload(row: SportsbookRow, bookmaker: string) {
  return {
    bookmaker,
    back_stake: row.back_stake,
    back_odds: row.back_odds,
    exchange_name: row.exchange_name,
    lay_odds_1: row.lay_odds_1,
    lay_actual: row.lay_actual,
    match_strategy: row.match_strategy,
  };
}

export function MultiProfileOpportunityDialog({
  initialOpportunityId,
  onClose,
  profiles,
}: {
  initialOpportunityId?: string;
  onClose: () => void;
  profiles: ProfileDescriptor[];
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const saveQueuesRef = useRef<Record<string, Promise<void>>>({});
  const saveVersionsRef = useRef<Record<string, number>>({});
  const [phase, setPhase] = useState<"setup" | "placement">(
    initialOpportunityId ? "placement" : "setup"
  );
  const [setup, setSetup] = useState<SetupDraft>(emptySetup);
  const [eligibility, setEligibility] = useState<OpportunityTarget[]>([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [selectedPlacementIds, setSelectedPlacementIds] = useState<string[]>([]);
  const [mugTargets, setMugTargets] = useState<MugTargetDraft[]>([
    { id: "mug-target-1", profile_id: "", bookmaker: "" },
  ]);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [activeOpportunities, setActiveOpportunities] = useState<Opportunity[]>([]);
  const [bookmakers, setBookmakers] = useState<string[]>([]);
  const [bookmakersByProfile, setBookmakersByProfile] = useState<
    Record<string, ProfileBookmakerOption[]>
  >({});
  const [commonBetCombos, setCommonBetCombos] = useState<CommonBetCombo[]>([]);
  const [comboBookmakerCandidates, setComboBookmakerCandidates] = useState<string[]>([]);
  const [saveStates, setSaveStates] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteOpportunityId, setDeleteOpportunityId] = useState<string | null>(null);
  const [showAllOpportunities, setShowAllOpportunities] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [targetDecisionId, setTargetDecisionId] = useState<string | null>(null);
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [addTargetProfileId, setAddTargetProfileId] = useState("");
  const [addTargetBookmaker, setAddTargetBookmaker] = useState("");
  const [layCopyFeedbackTargetId, setLayCopyFeedbackTargetId] = useState<string | null>(null);
  useDialogFocusLifecycle(true, dialogRef);

  useEffect(() => {
    if (!layCopyFeedbackTargetId) return;
    const timeout = window.setTimeout(() => setLayCopyFeedbackTargetId(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [layCopyFeedbackTargetId]);

  const loadOpportunity = useCallback(async (opportunityId: string) => {
    setIsLoading(true);
    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/multi-profile-opportunities/${opportunityId}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Unable to load the selected opportunity.");
    const loaded = (await response.json()) as Opportunity;
    setOpportunity(loaded);
    setSelectedPlacementIds(
      loaded.targets
        .filter((target) => target.sportsbook_bet && target.workflow_state === "Prospecting")
        .map((target) => target.target_id)
    );
    setPhase("placement");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const profileAccountsRequest = Promise.all(
      profiles.map((profile) =>
        fetch(`${apiBaseUrl}/profiles/${profile.profileId}/accounts`, {
          cache: "no-store",
        }).then(async (response) =>
          ({
            profileId: profile.profileId,
            accounts: response.ok ? ((await response.json()) as ProfileAccount[]) : [],
          })
        )
      )
    );
    const masterCatalogueRequest = fetch(`${apiBaseUrl}/account-catalogue/source`, {
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) throw new Error("Unable to load the master account catalogue.");
      return (await response.json()) as MasterAccountCatalogue;
    });
    void Promise.all([
      fetch(`${apiBaseUrl}/multi-profile-opportunities`, { cache: "no-store" }).then(
        async (response) => (response.ok ? (await response.json()) as Opportunity[] : [])
      ),
      profileAccountsRequest,
      masterCatalogueRequest,
      fetch(`${apiBaseUrl}/fund-manager/common-bet-combos?active_only=true`, {
        cache: "no-store",
      }).then(async (response) =>
        response.ok ? ((await response.json()) as CommonBetCombo[]) : []
      ),
    ])
      .then(async ([opportunities, profileAccounts, masterCatalogue, combos]) => {
        if (!active) return;
        setActiveOpportunities(opportunities);
        const configuredBookmakers = profileAccounts.flatMap(({ accounts }) =>
          accounts
            .filter((account) => account.type === "Bookie" && account.account.trim())
            .map((account) => account.account.trim())
        );
        const catalogueBookmakers = getActiveMasterAccountNames(
          masterCatalogue.records,
          "Bookmaker"
        );
        setBookmakers(
          [...new Set([...catalogueBookmakers, ...configuredBookmakers])].sort((left, right) =>
            left.localeCompare(right)
          )
        );
        setBookmakersByProfile(
          Object.fromEntries(
            profileAccounts.map(({ profileId, accounts }) => [
              profileId,
              [...new Set([
                ...catalogueBookmakers,
                ...accounts
                  .filter((account) => account.type === "Bookie" && account.account.trim())
                  .map((account) => account.account.trim()),
              ])]
                .map((name) => ({
                  name,
                  status:
                    accounts.find(
                      (account) =>
                        account.type === "Bookie" &&
                        account.account.trim().toLowerCase() === name.toLowerCase()
                    )?.status ?? "Not configured",
                }))
                .sort((left, right) => left.name.localeCompare(right.name)),
            ])
          )
        );
        setCommonBetCombos(combos);
        if (initialOpportunityId) {
          await loadOpportunity(initialOpportunityId);
        } else {
          setIsLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load opportunity data.");
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialOpportunityId, loadOpportunity, profiles]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const eligibleProfileIds = useMemo(
    () => eligibility.filter((target) => target.eligible).map((target) => target.profile_id),
    [eligibility]
  );

  function applyCommonBetCombo(presetId: string) {
    if (!presetId) {
      setComboBookmakerCandidates([]);
      setSetup((current) => ({ ...current, preset_id: "", preset_version: 0, preferred_strategy: "" }));
      return;
    }
    const combo = commonBetCombos.find((row) => row.preset_id === presetId);
    if (!combo) return;
    const knownBookmakers = combo.bookmakers?.length
      ? combo.bookmakers
      : combo.bookmaker
        ? [combo.bookmaker]
        : [];
    const validKnownBookmakers = knownBookmakers.filter((bookmaker) => bookmakers.includes(bookmaker));
    const staleMappings = [
      knownBookmakers.length !== validKnownBookmakers.length ? "bookmaker" : "",
      combo.offer_type && !sportsbookOfferTypeOptions.some((value) => value === combo.offer_type) ? "offer type" : "",
      combo.bet_type && !betTypeOptions.some((value) => value === combo.bet_type) ? "bet type" : "",
      combo.fixture_type && !fixtureTypeOptions.some((value) => value === combo.fixture_type) ? "fixture type" : "",
    ].filter(Boolean);
    if (staleMappings.length) {
      setErrorMessage(
        `${combo.name} needs remapping in Fund Manager Settings: ${staleMappings.join(", ")}.`
      );
      return;
    }
    setComboBookmakerCandidates(validKnownBookmakers);
    setErrorMessage("");
    setSetup((current) => ({
      ...current,
      preset: "Offer",
      preset_id: combo.preset_id,
      preset_version: combo.version,
      preferred_strategy: combo.default_strategy || "",
      bookmaker: validKnownBookmakers.length === 1 ? validKnownBookmakers[0] : "",
      offer_type: combo.offer_type,
      bet_type: combo.bet_type,
      offer_name: combo.offer_name,
      fixture_type: combo.fixture_type,
      default_back_stake: combo.default_back_stake,
      minimum_back_odds: combo.minimum_back_odds,
    }));
    setEligibility([]);
    setSelectedProfileIds([]);
    setStatusMessage(`${combo.name} applied.${validKnownBookmakers.length > 1 ? ` Choose one of ${validKnownBookmakers.length} known bookmakers.` : ""} Review the draft before creating rows.`);
  }

  async function checkEligibility() {
    if (!setup.bookmaker || !setup.offer_type) return;
    setIsSubmitting(true);
    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/multi-profile-opportunities/eligibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmaker: setup.bookmaker, offer_type: setup.offer_type }),
    });
    if (!response.ok) {
      setErrorMessage("Unable to check profile eligibility.");
      setIsSubmitting(false);
      return;
    }
    const targets = (await response.json()) as OpportunityTarget[];
    setEligibility(targets);
    setSelectedProfileIds((current) => current.filter((id) => targets.some((row) => row.profile_id === id && row.eligible)));
    setIsSubmitting(false);
  }

  async function createOpportunity() {
    const validMugTargets = mugTargets.filter((target) => target.profile_id && target.bookmaker);
    if (setup.preset === "Offer" && selectedProfileIds.length === 0) return;
    if (setup.preset === "Mug Bet" && validMugTargets.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/multi-profile-opportunities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...setup,
        expected_settlement: fromDateTimeLocalValue(setup.expected_settlement),
        bookmaker:
          setup.preset === "Mug Bet"
            ? validMugTargets[0]?.bookmaker ?? ""
            : setup.bookmaker,
        offer_type: setup.preset === "Mug Bet" ? "Mug Bet" : setup.offer_type,
        bet_type: setup.preset === "Mug Bet" ? "Single" : setup.bet_type,
        selected_profile_ids:
          setup.preset === "Mug Bet"
            ? [...new Set(validMugTargets.map((target) => target.profile_id))]
            : selectedProfileIds,
        target_selections:
          setup.preset === "Mug Bet"
            ? validMugTargets.map(({ profile_id, bookmaker }) => ({ profile_id, bookmaker }))
            : [],
      }),
    });
    if (!response.ok) {
      setErrorMessage(await response.text());
      setIsSubmitting(false);
      return;
    }
    const created = (await response.json()) as Opportunity;
    setOpportunity(created);
    setSelectedPlacementIds(
      created.targets
        .filter((target) => target.sportsbook_bet && target.workflow_state === "Prospecting")
        .map((target) => target.target_id)
    );
    setPhase("placement");
    setIsSubmitting(false);
  }

  function updateTargetRow(targetId: string, patch: Partial<SportsbookRow>) {
    setOpportunity((current) =>
      current
        ? {
            ...current,
            targets: current.targets.map((target) =>
              target.target_id === targetId && target.sportsbook_bet
                ? { ...target, sportsbook_bet: { ...target.sportsbook_bet, ...patch } }
                : target
            ),
          }
        : current
    );
  }

  function saveTarget(
    targetId: string,
    patch: Partial<SportsbookRow> = {},
    bookmakerOverride?: string
  ) {
    if (!opportunity) return;
    const target = opportunity.targets.find((row) => row.target_id === targetId);
    if (!target?.sportsbook_bet || target.workflow_state !== "Prospecting") return;
    const row = { ...target.sportsbook_bet, ...patch };
    const bookmaker = bookmakerOverride ?? target.bookmaker;
    updateTargetRow(targetId, patch);
    if (bookmakerOverride) {
      setOpportunity((current) =>
        current
          ? {
              ...current,
              targets: current.targets.map((item) =>
                item.target_id === targetId ? { ...item, bookmaker } : item
              ),
            }
          : current
      );
    }
    setSaveStates((current) => ({ ...current, [targetId]: "Saving" }));
    const saveVersion = (saveVersionsRef.current[targetId] ?? 0) + 1;
    saveVersionsRef.current[targetId] = saveVersion;
    const saveOperation = async () => {
      const response = await fetch(
        `${apiBaseUrl}/multi-profile-opportunities/${opportunity.opportunity_id}/targets/${targetId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(targetUpdatePayload(row, bookmaker)),
        }
      );
      if (!response.ok) {
        setSaveStates((current) => ({ ...current, [targetId]: "Save failed" }));
        return;
      }
      const savedTarget = (await response.json()) as OpportunityTarget;
      if (saveVersionsRef.current[targetId] === saveVersion) {
        setOpportunity((current) =>
          current
            ? {
                ...current,
                targets: current.targets.map((item) =>
                  item.target_id === targetId ? savedTarget : item
                ),
              }
            : current
        );
      }
      setSaveStates((current) => ({ ...current, [targetId]: "Saved" }));
    };
    const previousSave = saveQueuesRef.current[targetId] ?? Promise.resolve();
    saveQueuesRef.current[targetId] = previousSave.catch(() => undefined).then(saveOperation);
  }

  async function recordSelectedAsPlaced() {
    if (!opportunity || selectedPlacementIds.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage("");
    await Promise.all(
      selectedPlacementIds.map(
        (targetId) => saveQueuesRef.current[targetId] ?? Promise.resolve()
      )
    );
    const response = await fetch(
      `${apiBaseUrl}/multi-profile-opportunities/${opportunity.opportunity_id}/place`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_ids: selectedPlacementIds }),
      }
    );
    if (!response.ok) {
      setErrorMessage("Unable to record the selected rows as placed.");
      setIsSubmitting(false);
      return;
    }
    await loadOpportunity(opportunity.opportunity_id);
    setIsSubmitting(false);
  }

  async function resetTarget(targetId: string) {
    if (!opportunity) return;
    setIsSubmitting(true);
    setErrorMessage("");
    await (saveQueuesRef.current[targetId] ?? Promise.resolve());
    const response = await fetch(
      `${apiBaseUrl}/multi-profile-opportunities/${opportunity.opportunity_id}/targets/${targetId}/reset`,
      { method: "POST" }
    );
    if (!response.ok) {
      setErrorMessage("Unable to reset this opportunity row.");
      setIsSubmitting(false);
      return;
    }
    const savedTarget = (await response.json()) as OpportunityTarget;
    setOpportunity((current) =>
      current
        ? {
            ...current,
            targets: current.targets.map((target) =>
              target.target_id === targetId ? savedTarget : target
            ),
          }
        : current
    );
    setTargetDecisionId(null);
    setStatusMessage("Opportunity row reset to its original defaults.");
    setIsSubmitting(false);
  }

  async function removeTarget(targetId: string) {
    if (!opportunity) return;
    setIsSubmitting(true);
    setErrorMessage("");
    await (saveQueuesRef.current[targetId] ?? Promise.resolve());
    const response = await fetch(
      `${apiBaseUrl}/multi-profile-opportunities/${opportunity.opportunity_id}/targets/${targetId}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      setErrorMessage("Unable to remove this unplaced opportunity row.");
      setIsSubmitting(false);
      return;
    }
    const updated = (await response.json()) as Opportunity;
    setOpportunity(updated);
    setSelectedPlacementIds((current) => current.filter((id) => id !== targetId));
    setTargetDecisionId(null);
    setStatusMessage("Unplaced sportsbook row removed from this opportunity.");
    setIsSubmitting(false);
  }

  async function addTarget() {
    if (!opportunity || !addTargetProfileId || !addTargetBookmaker) return;
    setIsSubmitting(true);
    setErrorMessage("");
    const response = await fetch(
      `${apiBaseUrl}/multi-profile-opportunities/${opportunity.opportunity_id}/targets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: addTargetProfileId,
          bookmaker: addTargetBookmaker,
        }),
      }
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { detail?: string } | null;
      setErrorMessage(body?.detail ?? "Unable to add this target to the opportunity.");
      setIsSubmitting(false);
      return;
    }
    const updated = (await response.json()) as Opportunity;
    setOpportunity(updated);
    const added = updated.targets.find(
      (target) =>
        target.profile_id === addTargetProfileId &&
        target.bookmaker.toLowerCase() === addTargetBookmaker.toLowerCase() &&
        target.workflow_state === "Prospecting"
    );
    if (added) {
      setSelectedPlacementIds((current) => [...new Set([...current, added.target_id])]);
    }
    setAddTargetProfileId("");
    setAddTargetBookmaker("");
    setShowAddTarget(false);
    setStatusMessage("Profile target added to this opportunity.");
    setIsSubmitting(false);
  }

  async function deleteOpportunity(opportunityId: string) {
    setIsSubmitting(true);
    setErrorMessage("");
    const response = await fetch(
      `${apiBaseUrl}/multi-profile-opportunities/${opportunityId}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      setErrorMessage("Unable to delete this opportunity.");
      setIsSubmitting(false);
      return;
    }
    const result = (await response.json()) as {
      disposition: "deleted" | "archived";
      removed_draft_rows: number;
      retained_placed_rows: number;
    };
    setActiveOpportunities((current) =>
      current.filter((row) => row.opportunity_id !== opportunityId)
    );
    setStatusMessage(
      result.disposition === "deleted"
        ? `${result.removed_draft_rows} unplaced draft${result.removed_draft_rows === 1 ? " was" : "s were"} removed.`
        : `${result.removed_draft_rows} unplaced draft${result.removed_draft_rows === 1 ? " was" : "s were"} removed. ${result.retained_placed_rows} placed row${result.retained_placed_rows === 1 ? " was" : "s were"} retained.`
    );
    setDeleteOpportunityId(null);
    setIsSubmitting(false);
  }

  function normalizeTargetOdds(targetId: string, field: "back_odds" | "lay_odds_1", value: string) {
    const normalized = formatOdds(value);
    saveTarget(targetId, invalidatePlacementCalculation({ [field]: normalized }));
  }

  async function copyLayStake(target: OpportunityTarget, suggestion: string) {
    try {
      await navigator.clipboard.writeText(Number(suggestion).toFixed(2));
      setLayCopyFeedbackTargetId(target.target_id);
    } catch {
      setErrorMessage("Unable to copy the lay stake. Select the value and copy it manually.");
    }
  }

  async function applySuggestedLay(target: OpportunityTarget) {
    if (!target.sportsbook_bet) return;
    const suggestion = suggestedLay(target.sportsbook_bet);
    if (!suggestion) return;
    saveTarget(target.target_id, { lay_actual: suggestion });
    await copyLayStake(target, suggestion);
  }

  async function copyAppliedLay(target: OpportunityTarget) {
    if (!target.sportsbook_bet) return;
    const suggestion = suggestedLay(target.sportsbook_bet);
    if (!suggestion) return;
    await copyLayStake(target, suggestion);
  }

  async function copyFirstTargetDown(source: OpportunityTarget) {
    if (!opportunity || !source.sportsbook_bet) return;
    const sourceRow = source.sportsbook_bet;
    const targets = opportunity.targets.filter(
      (target) => target.target_id !== source.target_id && target.workflow_state === "Prospecting"
    );
    for (const target of targets) {
      const exchangeIsAvailable = target.exchange_options.some(
        (option) => option.exchange_name === sourceRow.exchange_name
      );
      saveTarget(target.target_id, {
        back_stake: sourceRow.back_stake,
        back_odds: formatOdds(sourceRow.back_odds),
        exchange_name: exchangeIsAvailable
          ? sourceRow.exchange_name
          : target.sportsbook_bet?.exchange_name || target.default_exchange_name,
        lay_odds_1: formatOdds(sourceRow.lay_odds_1),
        lay_actual: "",
        match_strategy: sourceRow.match_strategy,
      });
    }
  }

  const validMugTargetCount = mugTargets.filter(
    (target) => target.profile_id && target.bookmaker
  ).length;
  const setupReady = Boolean(
    setup.offer_text.trim() &&
      (setup.preset === "Mug Bet"
        ? validMugTargetCount
        : setup.bookmaker && setup.offer_type && selectedProfileIds.length)
  );
  const visibleActiveOpportunities = showAllOpportunities
    ? activeOpportunities
    : activeOpportunities.slice(0, 2);
  const activePlacementTargets = opportunity?.targets.filter(
    (target) => target.sportsbook_bet && !["Removed", "Skipped"].includes(target.workflow_state)
  ) ?? [];
  const targetDecision = opportunity?.targets.find(
    (target) => target.target_id === targetDecisionId
  );
  const addTargetBookmakerOptions = bookmakersByProfile[addTargetProfileId] ?? [];
  const selectedAddTargetBookmaker = addTargetBookmakerOptions.find(
    (option) => option.name === addTargetBookmaker
  );
  const addTargetReady = Boolean(
    addTargetProfileId &&
      selectedAddTargetBookmaker &&
      opportunity &&
      bookmakerOptionIsUsable(selectedAddTargetBookmaker.status, opportunity.offer_type)
  );

  const dialogMarkup = (
    <div className="modal-backdrop modal-backdrop-elevated" data-pd-id="multi-profile-opportunity.backdrop" onClick={onClose}>
      <section
        aria-label="Add sportsbook opportunity across profiles"
        aria-modal="true"
        className={`modal-panel multi-profile-opportunity-dialog${phase === "placement" ? " is-placement" : ""}`}
        data-pd-id="multi-profile-opportunity.dialog"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="modal-sticky-header workflow-panel-header" data-pd-id="multi-profile-opportunity.header">
          <div className="stack-tight">
            <span className="eyebrow">Fund Manager quick add</span>
            <strong>Opportunity Setup</strong>
          </div>
          {!isLoading ? <button aria-label="Close opportunity workflow" className="modal-close-button" data-initial-focus data-pd-id="multi-profile-opportunity.close" onClick={onClose} type="button">×</button> : null}
        </header>

        <div className="multi-profile-opportunity-content stack" data-pd-id="multi-profile-opportunity.content">
          {isLoading ? <LedgerLoadingIndicator dataPdId="multi-profile-opportunity.loading" label="Loading opportunity setup" /> : null}
          {errorMessage ? <p className="field-validation-text" role="alert">{errorMessage}</p> : null}

          {phase === "setup" && !isLoading ? (
            <>
              {activeOpportunities.length ? (
                <section className="opportunity-resume-list stack-tight" aria-label="Opportunities in progress">
                  <h3>Continue an Opportunity</h3>
                  {visibleActiveOpportunities.map((row) => (
                    <div className="opportunity-resume-row" key={row.opportunity_id}>
                      {deleteOpportunityId === row.opportunity_id ? (
                        <div className="opportunity-delete-confirmation">
                          <span>Delete unplaced drafts?</span>
                          <button className="button-link compact-action" disabled={isSubmitting} onClick={() => void deleteOpportunity(row.opportunity_id)} type="button">Delete</button>
                          <button aria-label={`Cancel deleting ${row.offer_text}`} className="icon-action opportunity-cancel-delete" onClick={() => setDeleteOpportunityId(null)} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button>
                        </div>
                      ) : (
                        <>
                          <button aria-label={`Continue ${row.offer_text}`} className="opportunity-resume-main" onClick={() => void loadOpportunity(row.opportunity_id)} type="button">
                            <span><strong>{row.offer_text}</strong><small>{row.bookmaker} · {row.targets.filter((target) => target.workflow_state === "Placed").length} of {row.targets.filter((target) => target.sportsbook_bet).length} placed</small></span>
                            <span aria-hidden="true" className="material-symbols-outlined">arrow_forward</span>
                          </button>
                          <button aria-label={`Delete ${row.offer_text} opportunity`} className="icon-action danger-icon-action" onClick={() => setDeleteOpportunityId(row.opportunity_id)} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span></button>
                        </>
                      )}
                    </div>
                  ))}
                  {activeOpportunities.length > 2 ? <button aria-expanded={showAllOpportunities} className="button-link compact-action opportunity-resume-toggle" onClick={() => setShowAllOpportunities((current) => !current)} type="button"><span aria-hidden="true" className="material-symbols-outlined">{showAllOpportunities ? "expand_less" : "expand_more"}</span>{showAllOpportunities ? "Show Recent Two" : `Show ${activeOpportunities.length - 2} More`}</button> : null}
                </section>
              ) : null}

              <section className="stack-tight" aria-labelledby="opportunity-setup-title">
                <h3 id="opportunity-setup-title">Opportunity Setup</h3>
                <div className="form-grid opportunity-setup-grid">
                  <div className="stack-tight"><label className="field-control"><span>Common Combo</span><select aria-label="Apply common bet combo" data-pd-id="multi-profile-opportunity.setup.common-combo" onChange={(event) => applyCommonBetCombo(event.target.value)} value={setup.preset_id}><option value="">No combo</option>{commonBetCombos.map((combo) => <option key={combo.preset_id} value={combo.preset_id}>{combo.name}</option>)}</select></label>{comboBookmakerCandidates.length ? <div aria-label="Known bookmaker coverage across active profiles" className="common-combo-candidate-row" data-pd-id="multi-profile-opportunity.setup.combo-bookmakers">{comboBookmakerCandidates.map((bookmaker) => { const options = profiles.map((profile) => (bookmakersByProfile[profile.profileId] ?? []).find((option) => option.name.toLowerCase() === bookmaker.toLowerCase())); const eligibleCount = options.filter((option) => option && bookmakerOptionIsUsable(option.status, comboOfferType(commonBetCombos, setup.preset_id))).length; const warningCount = options.filter((option) => option && bookmakerWarningStatuses.has(option.status.toLowerCase())).length; const tone = eligibleCount === profiles.length ? " is-available" : eligibleCount > 0 ? " is-warning" : options.some((option) => option && option.status !== "Not configured") ? " is-blocked" : " is-missing"; return <button aria-label={`${bookmaker}: ${eligibleCount} of ${profiles.length} profiles eligible${warningCount ? `, ${warningCount} with warnings` : ""}`} className={`common-combo-candidate${tone}${setup.bookmaker === bookmaker ? " is-selected" : ""}`} disabled={eligibleCount === 0} key={bookmaker} onClick={() => { setSetup((current) => ({ ...current, bookmaker })); setEligibility([]); setSelectedProfileIds([]); }} title={`${eligibleCount}/${profiles.length} profiles eligible${warningCount ? `; ${warningCount} need attention` : ""}`} type="button"><span>{bookmaker}</span><small>{eligibleCount}/{profiles.length} eligible</small></button>; })}</div> : null}</div>
                  <label className="field-control"><span>Preset</span><select data-pd-id="multi-profile-opportunity.setup.preset" onChange={(event) => { const preset = event.target.value as SetupDraft["preset"]; setSetup({ ...setup, preset, offer_type: preset === "Mug Bet" ? "Mug Bet" : "", bet_type: preset === "Mug Bet" ? "Single" : "", bookmaker: "" }); setEligibility([]); setSelectedProfileIds([]); }} value={setup.preset}><option>Offer</option><option>Mug Bet</option></select></label>
                  <label className="field-control field-span-2"><span>Offer</span><input data-pd-id="multi-profile-opportunity.setup.offer" maxLength={200} onChange={(event) => setSetup({ ...setup, offer_text: event.target.value })} placeholder="World Cup Bet 10 Get 10 on Spain v Argentina" value={setup.offer_text} /></label>
                  {setup.preset === "Offer" ? <label className="field-control"><span>Bookmaker</span><select data-pd-id="multi-profile-opportunity.setup.bookmaker" onChange={(event) => { setSetup({ ...setup, bookmaker: event.target.value }); setEligibility([]); setSelectedProfileIds([]); }} value={setup.bookmaker}><option value="">Select configured bookmaker</option>{bookmakers.map((bookmaker) => <option key={bookmaker}>{bookmaker}</option>)}</select></label> : null}
                  <label className="field-control"><span>Offer Type</span><select data-pd-id="multi-profile-opportunity.setup.offer-type" disabled={setup.preset === "Mug Bet"} onChange={(event) => { setSetup({ ...setup, offer_type: event.target.value }); setEligibility([]); setSelectedProfileIds([]); }} value={setup.offer_type}><option value="">Select offer type</option>{setup.preset === "Mug Bet" ? <option>Mug Bet</option> : sportsbookOfferTypeOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
                  <label className="field-control"><span>Bet Type</span><select disabled={setup.preset === "Mug Bet"} onChange={(event) => setSetup({ ...setup, bet_type: event.target.value })} value={setup.bet_type}><option value="">Optional</option>{betTypeOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
                  <label className="field-control"><span>Fixture Type</span><select onChange={(event) => setSetup({ ...setup, fixture_type: event.target.value })} value={setup.fixture_type}><option value="">Optional</option>{fixtureTypeOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
                  <label className="field-control"><span>Offer Name</span><input maxLength={200} onChange={(event) => setSetup({ ...setup, offer_name: event.target.value })} placeholder="Optional free-text offer name" value={setup.offer_name} /></label>
                  <label className="field-control"><span>Minimum Odds</span><input inputMode="decimal" onBlur={() => setSetup((current) => ({ ...current, minimum_back_odds: formatOdds(current.minimum_back_odds) }))} onChange={(event) => setSetup({ ...setup, minimum_back_odds: event.target.value })} value={setup.minimum_back_odds} /></label>
                  <label className="field-control"><span>Default Back Stake</span><input inputMode="decimal" onChange={(event) => setSetup({ ...setup, default_back_stake: event.target.value })} value={setup.default_back_stake} /></label>
                  <MaterialDateTimeField
                    dataPdId="multi-profile-opportunity.setup.expected-settlement"
                    label="Expected Settlement"
                    onChange={(value) => setSetup({ ...setup, expected_settlement: value })}
                    value={setup.expected_settlement}
                  />
                  <label className="field-control"><span>Reward Timing</span><select onChange={(event) => setSetup({ ...setup, reward_timing: event.target.value })} value={setup.reward_timing}><option value="">Optional</option><option>On placement</option><option>On settlement</option></select></label>
                  <label className="field-control"><span>Status</span><input disabled value="Prospecting" /></label>
                </div>
              </section>

              {setup.preset === "Offer" ? <section className="stack-tight" aria-labelledby="opportunity-profiles-title">
                <div className="section-heading-row"><h3 id="opportunity-profiles-title">Profiles</h3><button className="button-link" data-pd-id="multi-profile-opportunity.setup.check-availability" disabled={!setup.bookmaker || !setup.offer_type || isSubmitting} onClick={() => void checkEligibility()} type="button">Check Availability</button></div>
                {eligibility.length ? (
                  <>
                    <button className="button-link compact-action" disabled={!eligibleProfileIds.length} onClick={() => setSelectedProfileIds(eligibleProfileIds)} type="button">Select All Eligible</button>
                    <div className="multi-profile-target-list">
                      {eligibility.map((target) => (
                        <label className={`multi-profile-target-row${target.eligible ? "" : " is-blocked"}`} key={target.profile_id}>
                          <input checked={selectedProfileIds.includes(target.profile_id)} disabled={!target.eligible} onChange={(event) => setSelectedProfileIds((current) => event.target.checked ? [...current, target.profile_id] : current.filter((id) => id !== target.profile_id))} type="checkbox" />
                          <span><strong>{target.display_name}</strong><small>{target.profile_code} · {target.bookmaker_account_status}</small></span>
                          <span className={`review-chip ${target.eligible ? "review-chip-action-positive" : "review-chip-action-negative"}`}>{target.eligibility_state}</span>
                          {target.eligibility_warnings.length ? <small className="field-warning-text">{target.eligibility_warnings.join(" · ")}</small> : null}
                          {!target.eligible ? <small>{target.eligibility_reasons.join(" · ")}</small> : null}
                        </label>
                      ))}
                    </div>
                  </>
                ) : <span>Choose a bookmaker and offer type, then check profile availability.</span>}
              </section> : (
                <section className="stack-tight" aria-labelledby="opportunity-mug-targets-title">
                  <div className="section-heading-row"><h3 id="opportunity-mug-targets-title">Mug Bet Targets</h3><button className="button-link compact-action icon-text-action" onClick={() => setMugTargets((current) => [...current, { id: `mug-target-${Date.now()}`, profile_id: "", bookmaker: "" }])} type="button"><span aria-hidden="true" className="material-symbols-outlined">group_add</span><span>Add Target</span></button></div>
                  <div className="mug-target-list">
                    {mugTargets.map((target, index) => {
                      const profile = profiles.find((item) => item.profileId === target.profile_id);
                      return <div className="mug-target-row" key={target.id}>
                        <label className="field-control"><span>Profile {index + 1}</span><select aria-label={`Mug bet target ${index + 1} profile`} onChange={(event) => setMugTargets((current) => current.map((item) => item.id === target.id ? { ...item, profile_id: event.target.value, bookmaker: "" } : item))} value={target.profile_id}><option value="">Select profile</option>{profiles.map((item) => <option key={item.profileId} value={item.profileId}>{item.displayName}</option>)}</select></label>
                        <label className="field-control"><span>Bookmaker</span><select aria-label={`Mug bet target ${index + 1} bookmaker`} disabled={!profile} onChange={(event) => setMugTargets((current) => current.map((item) => item.id === target.id ? { ...item, bookmaker: event.target.value } : item))} value={target.bookmaker}><option value="">Select bookmaker</option>{(bookmakersByProfile[target.profile_id] ?? []).map((option) => <option disabled={!bookmakerOptionIsUsable(option.status, "Mug Bet")} key={option.name} value={option.name}>{bookmakerOptionLabel(option)}</option>)}</select></label>
                        <button aria-label={`Remove mug bet target ${index + 1}`} className="icon-action danger-icon-action" disabled={mugTargets.length === 1} onClick={() => setMugTargets((current) => current.filter((item) => item.id !== target.id))} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span></button>
                      </div>;
                    })}
                  </div>
                </section>
              )}
            </>
          ) : null}

          {phase === "placement" && opportunity && !isLoading ? (
            <section className="stack" aria-labelledby="opportunity-placement-title">
              <div className="multi-profile-source-summary">
                <span><strong>Bookmaker</strong>{opportunity.bookmaker}</span>
                <span><strong>Offer Type</strong>{opportunity.offer_type}</span>
                <span><strong>Minimum Odds</strong>{opportunity.minimum_back_odds || "None"}</span>
              </div>
              <div className="section-heading-row"><div><h3 id="opportunity-placement-title">Profile Placement</h3><span>Changes save when you leave a field.</span></div><div className="inline-actions opportunity-heading-actions"><button className="button-link compact-action icon-text-action opportunity-heading-action" data-pd-id="opportunity-placement.add-target" onClick={() => setShowAddTarget((current) => !current)} type="button"><span aria-hidden="true" className="material-symbols-outlined">group_add</span><span>Add Target</span></button><button className="button-link compact-action opportunity-heading-action" data-pd-id="opportunity-placement.new-opportunity" onClick={() => { setOpportunity(null); setPhase("setup"); }} type="button">New Opportunity</button></div></div>
              {showAddTarget ? (
                <section aria-label="Add profile target" className="opportunity-add-target-panel">
                  <label className="field-control"><span>Profile</span><select onChange={(event) => { setAddTargetProfileId(event.target.value); setAddTargetBookmaker(""); }} value={addTargetProfileId}><option value="">Select profile</option>{profiles.map((profile) => { const alreadyActive = activePlacementTargets.some((target) => target.profile_id === profile.profileId && opportunity.offer_type !== "Mug Bet"); return <option disabled={alreadyActive} key={profile.profileId} value={profile.profileId}>{profile.displayName}{alreadyActive ? " — already added" : ""}</option>; })}</select></label>
                  <label className="field-control"><span>Bookmaker</span><select disabled={!addTargetProfileId} onChange={(event) => setAddTargetBookmaker(event.target.value)} value={addTargetBookmaker}><option value="">Select bookmaker</option>{addTargetBookmakerOptions.map((option) => { const alreadyActive = activePlacementTargets.some((target) => target.profile_id === addTargetProfileId && target.bookmaker.toLowerCase() === option.name.toLowerCase()); const usable = bookmakerOptionIsUsable(option.status, opportunity.offer_type) && !alreadyActive; return <option disabled={!usable} key={option.name} value={option.name}>{bookmakerOptionLabel(option)}{alreadyActive ? " — already added" : ""}</option>; })}</select></label>
                  <button className="modal-primary-button compact-action" disabled={!addTargetReady || isSubmitting} onClick={() => void addTarget()} type="button">Add to Opportunity</button>
                  <button className="button-link compact-action" onClick={() => { setShowAddTarget(false); setAddTargetProfileId(""); setAddTargetBookmaker(""); }} type="button">Cancel</button>
                  {selectedAddTargetBookmaker && bookmakerWarningStatuses.has(selectedAddTargetBookmaker.status.toLowerCase()) ? <small className="field-warning-text">{selectedAddTargetBookmaker.status}: confirm this account can be used before placement.</small> : null}
                </section>
              ) : null}
              <div className="table-scroll opportunity-placement-table-wrap" data-pd-id="multi-profile-opportunity.placement.table-scroll">
                <table className="data-table opportunity-placement-table">
                  <colgroup>
                    <col className="opportunity-column-select" />
                    <col className="opportunity-column-profile" />
                    <col className="opportunity-column-bookmaker" />
                    <col className="opportunity-column-number" />
                    <col className="opportunity-column-number" />
                    <col className="opportunity-column-exchange" />
                    <col className="opportunity-column-number" />
                    <col className="opportunity-column-lay-stake" />
                    <col className="opportunity-column-strategy" />
                    <col className="opportunity-column-match" />
                    <col className="opportunity-column-value" />
                    <col className="opportunity-column-value" />
                    <col className="opportunity-column-actions" />
                  </colgroup>
                  <thead><tr><th scope="col"><span className="visually-hidden">Select</span></th><th scope="col">Profile</th><th scope="col">Bookmaker</th><th scope="col">Back Stake</th><th scope="col">Back Odds</th><th scope="col">Exchange</th><th scope="col">Lay Odds</th><th scope="col">Lay Stake</th><th scope="col">Strategy</th><th scope="col">Match</th><th scope="col">Back Win</th><th scope="col">Lay Win</th><th scope="col">Actions</th></tr></thead>
                  <tbody>
                    {activePlacementTargets.map((target, index) => {
                      const row = target.sportsbook_bet!;
                      const isEditable = target.workflow_state === "Prospecting";
                      const canInline = inlineStrategies.has(row.match_strategy);
                      const suggestion = suggestedLay(row);
                      const suggestionApplied = suggestionIsApplied(row, suggestion);
                      const showSuggestion = Boolean(suggestion && isEditable);
                      const strategyOptions = opportunity.offer_type === "Mug Bet"
                        ? mugStrategies
                        : standardStrategies;
                      const copyDownAvailable = canCopyPlacementDown(row);
                      const profileBookmakerOptions = bookmakersByProfile[target.profile_id] ?? [];
                      const matchRating = formatMatchRating(row.match_rating);
                      const backWin = formatMoney(row.scenario_pnl_if_back_wins);
                      const layWin = formatMoney(row.scenario_pnl_if_lay_wins);
                      return (
                        <tr key={target.target_id}>
                          <td><input aria-label={`Select ${target.display_name} ${target.bookmaker} for placement`} checked={selectedPlacementIds.includes(target.target_id)} className="opportunity-placement-checkbox" disabled={!isEditable || !canInline} onChange={(event) => setSelectedPlacementIds((current) => event.target.checked ? [...current, target.target_id] : current.filter((id) => id !== target.target_id))} type="checkbox" /></td>
                          <th scope="row"><strong>{target.display_name}</strong><small><span>{target.workflow_state}</span><span>{saveStates[target.target_id] ?? "Draft saved"}</span></small>{target.workflow_reasons.length ? <span className="field-validation-text">{target.workflow_reasons.join(" · ")}</span> : null}</th>
                          <td><select aria-describedby={target.eligibility_warnings.length ? `bookmaker-warning-${target.target_id}` : undefined} aria-label={`${target.display_name} ${target.bookmaker} bookmaker`} className="opportunity-table-control" disabled={!isEditable} onChange={(event) => void saveTarget(target.target_id, {}, event.target.value)} value={target.bookmaker}>{!profileBookmakerOptions.some((option) => option.name === target.bookmaker) ? <option>{target.bookmaker}</option> : null}{profileBookmakerOptions.map((option) => <option disabled={!bookmakerOptionIsUsable(option.status, opportunity.offer_type)} key={option.name} value={option.name}>{bookmakerOptionLabel(option)}</option>)}</select>{target.eligibility_warnings.length ? <small className="field-warning-text visually-hidden" id={`bookmaker-warning-${target.target_id}`}>{target.eligibility_warnings.join(" · ")}</small> : null}</td>
                          <td><input aria-label={`${target.display_name} ${target.bookmaker} back stake`} className="opportunity-table-control opportunity-table-number" disabled={!isEditable} inputMode="decimal" onBlur={() => void saveTarget(target.target_id)} onChange={(event) => updateTargetRow(target.target_id, invalidatePlacementCalculation({ back_stake: event.target.value }))} value={row.back_stake} /></td>
                          <td><input aria-label={`${target.display_name} ${target.bookmaker} back odds`} className={`opportunity-table-control opportunity-table-number${opportunity.minimum_back_odds && Number(row.back_odds) < Number(opportunity.minimum_back_odds) ? " field-input-invalid" : ""}`} disabled={!isEditable} inputMode="decimal" onBlur={() => normalizeTargetOdds(target.target_id, "back_odds", row.back_odds)} onChange={(event) => updateTargetRow(target.target_id, { back_odds: event.target.value })} value={row.back_odds} /></td>
                          <td><select aria-label={`${target.display_name} ${target.bookmaker} exchange`} className="opportunity-table-control" disabled={!isEditable || row.match_strategy === "No Lay"} onChange={(event) => void saveTarget(target.target_id, invalidatePlacementCalculation({ exchange_name: event.target.value }))} value={row.exchange_name || target.default_exchange_name}><option value="">Select</option>{target.exchange_options.map((option) => <option key={option.exchange_name} value={option.exchange_name}>{option.exchange_name}</option>)}</select></td>
                          <td><input aria-label={`${target.display_name} ${target.bookmaker} lay odds`} className="opportunity-table-control opportunity-table-number" disabled={!isEditable || row.match_strategy === "No Lay"} inputMode="decimal" onBlur={() => normalizeTargetOdds(target.target_id, "lay_odds_1", row.lay_odds_1)} onChange={(event) => updateTargetRow(target.target_id, invalidatePlacementCalculation({ lay_odds_1: event.target.value }))} value={row.lay_odds_1} /></td>
                          <td><div className="opportunity-lay-assist"><div className="opportunity-lay-input-shell"><input aria-label={`${target.display_name} ${target.bookmaker} lay stake`} className="opportunity-table-control opportunity-table-number" disabled={!isEditable || row.match_strategy === "No Lay"} inputMode="decimal" onBlur={() => void saveTarget(target.target_id)} onChange={(event) => updateTargetRow(target.target_id, { lay_actual: event.target.value })} value={row.lay_actual} />{showSuggestion ? <button aria-label={suggestionApplied ? `Copy applied lay ${suggestion} for ${target.display_name} ${target.bookmaker}` : `Use suggested lay ${suggestion} and copy it for ${target.display_name} ${target.bookmaker}`} className={`opportunity-suggested-lay-icon${suggestionApplied ? " is-applied" : ""}`} data-pd-id={`opportunity-placement.suggested-lay.${target.target_id}`} data-suggestion={Number(suggestion).toFixed(2)} onClick={() => suggestionApplied ? void copyAppliedLay(target) : void applySuggestedLay(target)} type="button"><span aria-hidden="true" className="material-symbols-outlined">{suggestionApplied ? "copy_all" : "calculate"}</span></button> : null}{layCopyFeedbackTargetId === target.target_id ? <small aria-live="polite" className="opportunity-lay-copy-feedback"><span aria-hidden="true">✓</span> copied to clipboard!</small> : null}</div></div></td>
                          <td><select aria-label={`${target.display_name} ${target.bookmaker} strategy`} className="opportunity-table-control" disabled={!isEditable} onChange={(event) => void saveTarget(target.target_id, invalidatePlacementCalculation({ match_strategy: event.target.value }))} value={row.match_strategy}>{strategyOptions.map((value) => <option key={value} value={value}>{value === "Custom" ? "Custom Lay" : value}</option>)}</select></td>
                          <td>{matchRating ?? <PendingMetric label={`${target.display_name} match rating`} />}</td>
                          <td className={backWin === null ? "" : Number(row.scenario_pnl_if_back_wins) < 0 ? "money-negative" : "money-positive"}>{backWin ?? <PendingMetric label={`${target.display_name} back-win value`} />}</td>
                          <td className={layWin === null ? "" : Number(row.scenario_pnl_if_lay_wins) < 0 ? "money-negative" : "money-positive"}>{layWin ?? <PendingMetric label={`${target.display_name} lay-win value`} />}</td>
                          <td><div className="opportunity-row-actions">{index === 0 && isEditable && activePlacementTargets.length > 1 ? <button aria-describedby={!copyDownAvailable ? `copy-down-help-${target.target_id}` : undefined} aria-label={`Copy ${target.display_name} placement values down`} className="icon-action" disabled={!copyDownAvailable || isSubmitting} onClick={() => void copyFirstTargetDown(target)} title={!copyDownAvailable ? "Enter valid stake and odds, plus exchange and lay odds when laying." : undefined} type="button"><span aria-hidden="true" className="material-symbols-outlined">copy_all</span></button> : <span aria-hidden="true" className="opportunity-action-placeholder" />}<span className="visually-hidden" id={`copy-down-help-${target.target_id}`}>Enter valid stake and odds, plus exchange and lay odds when laying, before copying this row down.</span><Link aria-label={`Open ${target.display_name} sportsbook row in full editor`} className="directory-nav-action" href={`/profiles/${target.profile_id}/tracker/sportsbook-bets?record=${row.sportsbook_bet_id}`}><span aria-hidden="true" className="material-symbols-outlined">open_in_new</span></Link>{isEditable ? <button aria-label={`Manage ${target.display_name} ${target.bookmaker} opportunity row`} className="icon-action danger-icon-action" disabled={isSubmitting} onClick={() => setTargetDecisionId(target.target_id)} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span></button> : <span aria-hidden="true" className="opportunity-action-placeholder" />}</div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {targetDecision?.sportsbook_bet && targetDecision.workflow_state === "Prospecting" ? (
                <section aria-labelledby="opportunity-target-decision-title" className="opportunity-target-decision" role="alertdialog">
                  <div><strong id="opportunity-target-decision-title">Reset row data or remove from this opportunity?</strong><small>{targetDecision.display_name} · {targetDecision.bookmaker}</small></div>
                  <button className="button-link compact-action" disabled={isSubmitting} onClick={() => void resetTarget(targetDecision.target_id)} type="button">Reset Row Data</button>
                  <button className="button-link compact-action destructive-action" disabled={isSubmitting} onClick={() => void removeTarget(targetDecision.target_id)} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span><span>Remove from Opportunity</span></button>
                  <button className="button-link compact-action" disabled={isSubmitting} onClick={() => setTargetDecisionId(null)} type="button">Cancel</button>
                </section>
              ) : null}
            </section>
          ) : null}
        </div>

        <footer className="modal-sticky-footer" data-pd-id="multi-profile-opportunity.footer">
          <button className="button-link" onClick={onClose} type="button">Close</button>
          {phase === "setup" ? <button className="modal-primary-button" data-pd-id="multi-profile-opportunity.setup.create-rows" disabled={!setupReady || isSubmitting} onClick={() => void createOpportunity()} type="button">Create {setup.preset === "Mug Bet" ? validMugTargetCount : selectedProfileIds.length || ""} Prospecting Row{(setup.preset === "Mug Bet" ? validMugTargetCount : selectedProfileIds.length) === 1 ? "" : "s"}</button> : null}
          {phase === "placement" ? <button className="modal-primary-button" data-pd-id="multi-profile-opportunity.placement.record-selected" disabled={!selectedPlacementIds.length || isSubmitting} onClick={() => void recordSelectedAsPlaced()} type="button">Record Selected as Placed</button> : null}
        </footer>
        <StatusToast message={statusMessage} onDismiss={() => setStatusMessage("")} tone="success" />
      </section>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(dialogMarkup, document.body) : null;
}
