"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FinancialValue } from "@/components/financial-value";
import {
  BookmakerIdentity,
  useBookmakerCatalogue,
} from "@/components/bookmaker-identity";
import { LedgerAddRowButton } from "@/components/ledger-add-row-button";
import { LedgerTableScroll } from "@/components/ledger-table-scroll";
import {
  LedgerEditorTabPanel,
  LedgerEditorTabRail,
} from "@/components/ledger-editor-tabs";
import { TrackerRangeCard } from "@/components/tracker-range-card";
import { apiBaseUrl } from "@/lib/api";
import {
  findBookmakerCatalogueEntry,
  type BookmakerCatalogueRecord,
} from "@/lib/bookmaker-catalogue";
import { getMatchRatingPillTone } from "@/lib/ledger-calculator";
import { getRaceDateSuggestions } from "@/lib/race-date-suggestion";
import { formatLedgerDateTime } from "@/lib/ledger-date-display";
import { parseExtraPlaceRacePaste } from "@/lib/extra-place-race-paste";
import { formatFinancialValue } from "@/lib/financial-display";
import {
  extraPlacePositionChoices,
  extraPlacePositionForResult,
  extraPlaceResultChoices,
  ordinalPosition,
  resultForExtraPlacePosition,
} from "@/lib/extra-place-place-terms";
import { type LedgerEditorTabDefinition } from "@/lib/ledger-editor-tabs";
import {
  isGuidedAccessEnabled,
  useBodyScrollLock,
  useDialogFocusLifecycle,
  useProfileGuidedAccessMode,
} from "@/lib/ledger-ui";
import {
  saveTrackerDatePreset,
  type TrackerSettingsClientRecord,
} from "@/lib/tracker-settings-client";
import {
  formatResolvedDateRange,
  formatResolvedDateRangeContext,
  resolveDateRange,
  type DatePreset,
} from "@/lib/tracker-summary";

type Row = Record<string, string | null> & {
  each_way_extra_place_id: string;
  mode: "Each Way" | "Extra Place";
  status: string;
  result: string;
  calculation_state: string;
};
type StepId = "calculate" | "settlement";
type Form = {
  placed_at: string;
  runner: string;
  race: string;
  bookmaker: string;
  bookmaker_account: string;
  mode: "Each Way" | "Extra Place";
  each_way_stake: string;
  back_odds: string;
  place_term_numerator: string;
  place_term_denominator: string;
  bookmaker_places: string;
  exchange_places: string;
  win_exchange: string;
  win_lay_odds: string;
  win_commission: string;
  actual_win_lay_stake: string;
  place_exchange: string;
  place_lay_odds: string;
  place_commission: string;
  actual_place_lay_stake: string;
  status: string;
  result: string;
  finishing_position: string;
  user_notes: string;
};
type QuickAddLoadout = {
  preset_id: string;
  label: string;
  defaults: Record<string, string>;
  bookmaker: string;
  availability: "eligible" | "limited" | "blocked";
  availability_reason: string;
  sort_order?: number;
  is_favourite?: boolean;
  favourite_order?: number;
};
type ExtraPlaceIssueFilter =
  | "any"
  | "all-issues"
  | "calculation"
  | "outcome-needed";
type ExtraPlaceTableFilters = {
  view: "all" | "open" | "settled" | "issues";
  mode: "" | Form["mode"];
  bookmaker: string;
  place_term_denominator: string;
  win_exchange: string;
  place_exchange: string;
  status: string;
  result: string;
  issue_type: ExtraPlaceIssueFilter;
};
type ExtraPlaceVisibleColumn =
  | "back_odds"
  | "terms"
  | "place_odds"
  | "win_lay_odds"
  | "win_lay_stake"
  | "win_lay_liability"
  | "place_lay_odds"
  | "place_lay_stake"
  | "place_lay_liability"
  | "rating"
  | "implied_odds";
type ExtraPlaceVisibleColumns = Record<ExtraPlaceVisibleColumn, boolean>;

const newForm = (): Form => ({
  placed_at: "",
  runner: "",
  race: "",
  bookmaker: "",
  bookmaker_account: "",
  mode: "Extra Place",
  each_way_stake: "",
  back_odds: "",
  place_term_numerator: "1",
  place_term_denominator: "5",
  bookmaker_places: "5",
  exchange_places: "4",
  win_exchange: "",
  win_lay_odds: "",
  win_commission: "0",
  actual_win_lay_stake: "",
  place_exchange: "",
  place_lay_odds: "",
  place_commission: "0",
  actual_place_lay_stake: "",
  status: "Prospecting",
  result: "Pending",
  finishing_position: "",
  user_notes: "",
});
const numeric = new Set<keyof Form>([
  "each_way_stake",
  "back_odds",
  "place_term_numerator",
  "place_term_denominator",
  "bookmaker_places",
  "exchange_places",
  "win_lay_odds",
  "win_commission",
  "actual_win_lay_stake",
  "place_lay_odds",
  "place_commission",
  "actual_place_lay_stake",
]);
const bookmakers = ["Betfred", "Unibet", "Sky Bet", "William Hill"];
const exchanges = ["Smarkets", "Matchbook", "Betfair Exchange"];
const fallbackLoadouts: QuickAddLoadout[] = [
  {
    preset_id: "extra-place-default-betfred",
    label: "Betfred 1/5 Extra Place £5 EW",
    bookmaker: "Betfred",
    availability: "eligible",
    availability_reason: "",
    defaults: {
      bookmaker: "Betfred",
      eachWayStake: "5",
      placeTermDenominator: "5",
      bookmakerPlaces: "5",
      exchangePlaces: "4",
      mode: "Extra Place",
    },
  },
  {
    preset_id: "extra-place-default-unibet",
    label: "Unibet 1/4 Extra Place £5 EW",
    bookmaker: "Unibet",
    availability: "eligible",
    availability_reason: "",
    defaults: {
      bookmaker: "Unibet",
      eachWayStake: "5",
      placeTermDenominator: "4",
      bookmakerPlaces: "5",
      exchangePlaces: "4",
      mode: "Extra Place",
    },
  },
];
const emptyTableFilters: ExtraPlaceTableFilters = {
  view: "all",
  mode: "",
  bookmaker: "",
  place_term_denominator: "",
  win_exchange: "",
  place_exchange: "",
  status: "",
  result: "",
  issue_type: "any",
};
const defaultVisibleColumns: ExtraPlaceVisibleColumns = {
  back_odds: true,
  terms: true,
  place_odds: true,
  win_lay_odds: true,
  win_lay_stake: true,
  win_lay_liability: true,
  place_lay_odds: true,
  place_lay_stake: true,
  place_lay_liability: true,
  rating: true,
  implied_odds: true,
};

function asNumber(value: string | null | undefined) {
  const number = Number(value);
  return value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(number)
    ? null
    : number;
}
function value(value: string | null | undefined) {
  const number = asNumber(value);
  return number === null ? (
    <span className="ledger-financial-value ledger-financial-value-unavailable">
      £ -
    </span>
  ) : (
    <FinancialValue
      animate={false}
      className="ledger-financial-value"
      label="Financial value"
      value={number}
    />
  );
}
function neutralValue(value: string | null | undefined) {
  const number = asNumber(value);
  return (
    <span className="extra-place-stake-value">
      {number === null ? "£ -" : formatFinancialValue(number)}
    </span>
  );
}
function decimalDisplay(value: string | null | undefined) {
  const number = asNumber(value);
  return number === null ? "-" : number.toFixed(2);
}
function hasRequiredRowGap(row: Row) {
  return [
    row.runner,
    row.race,
    row.placed_at,
    row.bookmaker,
    row.each_way_stake,
    row.back_odds,
    row.win_exchange,
    row.win_lay_odds,
    row.place_exchange,
    row.place_lay_odds,
  ].some((value) => !value?.trim());
}
function getRowIssues(row: Row) {
  const labels: Array<[keyof Row, string]> = [
    ["runner", "Runner"],
    ["race", "Race"],
    ["placed_at", "Date / time"],
    ["bookmaker", "Bookmaker"],
    ["each_way_stake", "E/W stake"],
    ["back_odds", "Back odds"],
    ["win_exchange", "Win exchange"],
    ["win_lay_odds", "Win lay odds"],
    ["place_exchange", "Place exchange"],
    ["place_lay_odds", "Place lay odds"],
  ];
  const missing = labels
    .filter(([key]) => !row[key]?.trim())
    .map(([, label]) => `${label} needed`);
  if (row.status === "Settled" && row.result === "Pending") missing.push("Outcome needed");
  if (row.status === "Prospecting") missing.push("Placement not confirmed");
  return Array.from(new Set(missing));
}
function isBlank(value: string) {
  return !value.trim();
}
function resultChoices(
  mode: Form["mode"],
  bookmakerPlaces = "5",
  exchangePlaces = "4",
) {
  return extraPlaceResultChoices(mode, bookmakerPlaces, exchangePlaces).map((result) => [
    result,
    result === "Void/NR" ? "Void / NR" : result,
  ]);
}
function matrixValue(value: string | null | undefined) {
  const number = asNumber(value);
  const tone =
    number === null || number === 0
      ? "neutral"
      : number > 0
        ? "positive"
        : "negative";
  return (
    <span
      className={`extra-place-matrix-value extra-place-matrix-value-${tone}`}
    >
      {number === null ? "£ -" : formatFinancialValue(number)}
    </span>
  );
}
function parseRowDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function isDateWithinRange(
  value: Date | null,
  range: ReturnType<typeof resolveDateRange>,
) {
  return Boolean(value && value >= range.start && value <= range.end);
}

export function EachWayExtraPlaceWorkflowShell({
  profileId,
}: {
  profileId: string;
}) {
  const baseUrl = `${apiBaseUrl}/profiles/${profileId}/each-way-extra-places`;
  const editorRef = useRef<HTMLElement | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(newForm);
  const [pristine, setPristine] = useState(newForm);
  const [preview, setPreview] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState<StepId>("calculate");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tableFilters, setTableFilters] =
    useState<ExtraPlaceTableFilters>(emptyTableFilters);
  const [visibleColumns, setVisibleColumns] =
    useState<ExtraPlaceVisibleColumns>(defaultVisibleColumns);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [loadouts, setLoadouts] = useState<QuickAddLoadout[]>(fallbackLoadouts);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [tableTheme, setTableTheme] = useState<"ep" | "back-lay">("ep");
  const [trackerSettings, setTrackerSettings] =
    useState<TrackerSettingsClientRecord | null>(null);
  const [savingRange, setSavingRange] = useState(false);
  const parserOwnedDateRef = useRef<string | null>(null);
  const { catalogue: bookmakerCatalogue } = useBookmakerCatalogue(profileId);
  const [guidedAccessMode] = useProfileGuidedAccessMode(profileId);
  const isAnyDialogOpen = open || isFilterModalOpen || Boolean(deleteTarget);
  useBodyScrollLock(isAnyDialogOpen);
  useDialogFocusLifecycle(open, editorRef);
  const load = useCallback(async () => {
    // Draft and issue rows must appear immediately after a write, even when the
    // active tracker range would normally hide their dates.
    const response = await fetch(baseUrl, { cache: "no-store" });
    if (response.ok) setRows(await response.json());
  }, [baseUrl]);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);
  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      const response = await fetch(
        `${apiBaseUrl}/fund-manager/common-bet-combos/profile-overrides/${profileId}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const records = (await response.json()) as Array<
        QuickAddLoadout & { ledger_type: string; enabled: boolean }
      >;
      const eligible = records.filter(
        (record) =>
          record.ledger_type === "Extra Place" &&
          record.enabled &&
          record.availability !== "blocked",
      );
      if (eligible.length) {
        const favourites = eligible.filter((record) => record.is_favourite);
        const visible = (favourites.length ? favourites : eligible)
          .sort((left, right) =>
            (favourites.length
              ? (left.favourite_order ?? 0) - (right.favourite_order ?? 0)
              : (left.sort_order ?? 0) - (right.sort_order ?? 0)) || left.label.localeCompare(right.label),
          )
          .slice(0, 4);
        setLoadouts(visible);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [profileId]);
  useEffect(() => {
    let cancelled = false;
    void fetch(`${apiBaseUrl}/profiles/${profileId}/tracker-settings`, {
      cache: "no-store",
    }).then(async (response) => {
      if (response.ok && !cancelled)
        setTrackerSettings(
          (await response.json()) as TrackerSettingsClientRecord,
        );
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);
  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(async () => {
      const response = await fetch(`${baseUrl}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (response.ok) setPreview(await response.json());
    }, 100);
    return () => window.clearTimeout(timeout);
  }, [baseUrl, form, open]);
  const update = (key: keyof Form, next: string) => {
    if (numeric.has(key) && next && !/^\d*(?:\.\d*)?$/.test(next)) return;
    if (key === "placed_at") parserOwnedDateRef.current = null;
    setForm((current) => {
      const nextForm = {
        ...current,
        [key]: next,
      };
      if (
        key === "finishing_position" ||
        key === "mode" ||
        key === "bookmaker_places" ||
        key === "exchange_places"
      ) {
        return {
          ...nextForm,
          result: nextForm.finishing_position
            ? resultForExtraPlacePosition(
                nextForm.mode,
                nextForm.bookmaker_places,
                nextForm.exchange_places,
                nextForm.finishing_position,
              )
            : current.result,
        };
      }
      return nextForm;
    });
  };
  const updateRace = (race: string) => {
    const suggestion = getRaceDateSuggestions(race);
    setForm((current) => {
      const mayReplaceDate =
        Boolean(suggestion) &&
        (!current.placed_at || current.placed_at === parserOwnedDateRef.current);
      const placedAt = mayReplaceDate ? suggestion!.today : current.placed_at;
      if (mayReplaceDate) parserOwnedDateRef.current = placedAt;
      return { ...current, race, placed_at: placedAt };
    });
  };
  const applyRaceDate = (placedAt: string) => {
    parserOwnedDateRef.current = placedAt;
    setForm((current) => ({ ...current, placed_at: placedAt }));
  };
  const applyRacePaste = (raw: string) => {
    const parsed = parseExtraPlaceRacePaste(raw);
    if (!parsed) return false;
    const suggestion = getRaceDateSuggestions(parsed.race);
    setForm((current) => {
      const mayReplaceDate =
        Boolean(suggestion) &&
        (!current.placed_at || current.placed_at === parserOwnedDateRef.current);
      const placedAt = mayReplaceDate ? suggestion!.today : current.placed_at;
      if (mayReplaceDate) parserOwnedDateRef.current = placedAt;
      return { ...current, ...parsed, placed_at: placedAt };
    });
    return true;
  };
  const resetEditor = (next: Form, row: Row | null) => {
    parserOwnedDateRef.current = null;
    setForm(next);
    setPristine(next);
    setPreview(row);
    setSelectedId(row?.each_way_extra_place_id ?? null);
    setStep("calculate");
    setError("");
    setGuideDismissed(false);
    setOpen(true);
  };
  const openNew = () => resetEditor(newForm(), null);
  const openRow = (row: Row) => {
    const next = newForm();
    (Object.keys(next) as Array<keyof Form>).forEach((key) => {
      const saved = String(row[key] ?? next[key]);
      next[key] = (
        key === "mode"
          ? saved === "Each Way"
            ? "Each Way"
            : "Extra Place"
          : saved
      ) as never;
    });
    resetEditor(next, row);
  };
  const close = () => {
    if (!saving) setOpen(false);
  };
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        selectedId ? `${baseUrl}/${selectedId}` : baseUrl,
        {
          method: selectedId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      if (!response.ok) {
        setError(
          (await response.json()).detail ||
            "Could not save the Extra Place row.",
        );
        return;
      }
      const saved = await response.json();
      setPreview(saved);
      setPristine(form);
      await load();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };
  const requestDelete = (row: Row) => {
    setDeleteTarget(row);
    setDeletionReason("");
  };
  const confirmDelete = async () => {
    if (!deleteTarget || saving) return;
    if (deleteTarget.status === "Settled" && !deletionReason.trim()) {
      setError("Enter a deletion reason for a settled row.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(
        `${baseUrl}/${deleteTarget.each_way_extra_place_id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deletion_reason: deletionReason.trim() }),
        },
      );
      if (!response.ok) {
        setError(
          (await response.json()).detail ||
            "Could not delete the Extra Place row.",
        );
        return;
      }
      await load();
      if (selectedId === deleteTarget.each_way_extra_place_id) setOpen(false);
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };
  const saveResult = async (row: Row, result: string) => {
    const next = newForm();
    (Object.keys(next) as Array<keyof Form>).forEach((key) => {
      const saved = String(row[key] ?? next[key]);
      next[key] = (
        key === "mode"
          ? saved === "Each Way"
            ? "Each Way"
            : "Extra Place"
          : saved
      ) as never;
    });
    next.result = result;
    next.status = result === "Void/NR" ? "Void" : "Settled";
    next.finishing_position = extraPlacePositionForResult(
      result,
      next.mode,
      String(row.bookmaker_places || "5"),
      String(row.exchange_places || "4"),
    );
    const response = await fetch(`${baseUrl}/${row.each_way_extra_place_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (response.ok) await load();
  };
  const copy = async (stake: string | null | undefined) => {
    if (stake) await navigator.clipboard?.writeText(stake);
  };
  const missing = useMemo(
    () => ({
      calculate: [
        "runner",
        "race",
        "placed_at",
        "bookmaker",
        "each_way_stake",
        "back_odds",
        "win_lay_odds",
        "place_lay_odds",
      ].filter((key) => isBlank(form[key as keyof Form] as string)),
      settlement:
        form.status === "Settled" && form.result === "Pending"
          ? ["result"]
          : [],
    }),
    [form],
  );
  const tabs: LedgerEditorTabDefinition[] = [
    {
      id: "calculate",
      label: "Calculate & Place",
      status: missing.calculate.length ? "invalid" : "complete",
      requiredIssueCount: missing.calculate.length,
    },
    {
      id: "settlement",
      label: "Settlement",
      status: missing.settlement.length
        ? "invalid"
        : form.status === "Settled"
          ? "complete"
          : "neutral",
      requiredIssueCount: missing.settlement.length,
    },
  ];
  const needed = (Object.entries(missing).find(
    ([, fields]) => fields.length,
  )?.[0] ?? null) as StepId | null;
  const stepIds: StepId[] = ["calculate", "settlement"];
  const stepIndex = stepIds.indexOf(step);
  const resultOptions = [
    "Pending",
    ...resultChoices(
      form.mode,
      form.bookmaker_places,
      form.exchange_places,
    ).map(
      ([result]) => result,
    ),
  ];
  const hasIssue = (row: Row) =>
    row.calculation_state !== "resolved" ||
    row.status === "Prospecting" ||
    hasRequiredRowGap(row) ||
    (row.status === "Settled" && row.result === "Pending");
  const hasActiveTableControls = Object.entries(tableFilters).some(
    ([key, filter]) =>
      key === "view" ? filter !== "all" : filter !== "" && filter !== "any",
  );
  const activeTableControlCount = Object.entries(tableFilters).filter(
    ([key, filter]) =>
      key === "view" ? filter !== "all" : filter !== "" && filter !== "any",
  ).length;
  const extraPlaceFilterOptions = useMemo(
    () => ({
      bookmakers: [
        ...new Set(
          rows
            .map((row) => row.bookmaker)
            .filter((bookmaker): bookmaker is string => Boolean(bookmaker)),
        ),
      ],
      terms: [
        ...new Set(
          rows
            .map((row) => row.place_term_denominator)
            .filter((term): term is string => Boolean(term)),
        ),
      ],
      winExchanges: [
        ...new Set(
          rows
            .map((row) => row.win_exchange)
            .filter((exchange): exchange is string => Boolean(exchange)),
        ),
      ],
      placeExchanges: [
        ...new Set(
          rows
            .map((row) => row.place_exchange)
            .filter((exchange): exchange is string => Boolean(exchange)),
        ),
      ],
      statuses: [...new Set(rows.map((row) => row.status).filter(Boolean))],
      results: [...new Set(rows.map((row) => row.result).filter(Boolean))],
    }),
    [rows],
  );
  const activeDatePreset =
    (trackerSettings?.active_date_preset as DatePreset | undefined) ??
    "Week (Mon-Sun)";
  const resolvedDateRange = useMemo(
    () =>
      resolveDateRange({
        preset: activeDatePreset,
        customStart: trackerSettings?.custom_start_date,
        customEnd: trackerSettings?.custom_end_date,
        rangeBackDays: trackerSettings?.range_back_days,
        rangeForwardDays: trackerSettings?.range_forward_days,
      }),
    [activeDatePreset, trackerSettings],
  );
  const updateTrackerRange = useCallback(
    async (preset: DatePreset) => {
      if (!trackerSettings || trackerSettings.active_date_preset === preset)
        return;
      setSavingRange(true);
      try {
        setTrackerSettings(
          await saveTrackerDatePreset(profileId, trackerSettings, preset),
        );
      } finally {
        setSavingRange(false);
      }
    },
    [profileId, trackerSettings],
  );
  const rangeRows = useMemo(
    () =>
      rows.filter((row) =>
        isDateWithinRange(parseRowDate(row.placed_at), resolvedDateRange),
      ),
    [resolvedDateRange, rows],
  );
  const outOfRangeIssueRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          !isDateWithinRange(parseRowDate(row.placed_at), resolvedDateRange) &&
          hasIssue(row),
      ),
    [resolvedDateRange, rows],
  );
  const tableRows = useMemo(
    () => [...outOfRangeIssueRows, ...rangeRows],
    [outOfRangeIssueRows, rangeRows],
  );
  const filtered = tableRows.filter((row) => {
    const text =
      `${row.runner} ${row.race} ${row.bookmaker} ${row.status} ${row.result}`.toLowerCase();
    if (query && !text.includes(query.toLowerCase())) return false;
    if (
      tableFilters.view === "open" &&
      !["Prospecting", "Placed"].includes(row.status)
    )
      return false;
    if (tableFilters.view === "settled" && row.status !== "Settled")
      return false;
    if (tableFilters.view === "issues" && !hasIssue(row)) return false;
    if (tableFilters.mode && row.mode !== tableFilters.mode) return false;
    if (tableFilters.bookmaker && row.bookmaker !== tableFilters.bookmaker)
      return false;
    if (
      tableFilters.place_term_denominator &&
      row.place_term_denominator !== tableFilters.place_term_denominator
    )
      return false;
    if (
      tableFilters.win_exchange &&
      row.win_exchange !== tableFilters.win_exchange
    )
      return false;
    if (
      tableFilters.place_exchange &&
      row.place_exchange !== tableFilters.place_exchange
    )
      return false;
    if (tableFilters.status && row.status !== tableFilters.status) return false;
    if (tableFilters.result && row.result !== tableFilters.result) return false;
    if (tableFilters.issue_type === "all-issues" && !hasIssue(row))
      return false;
    if (
      tableFilters.issue_type === "calculation" &&
      row.calculation_state === "resolved"
    )
      return false;
    if (
      tableFilters.issue_type === "outcome-needed" &&
      !(row.status === "Settled" && row.result === "Pending")
    )
      return false;
    return true;
  });
  const selectedRow = selectedId
    ? (rows.find((row) => row.each_way_extra_place_id === selectedId) ?? null)
    : null;
  const openCount = rangeRows.filter((row) => row.status === "Placed").length;
  const issueCount = rangeRows.filter(hasIssue).length;
  const settledCount = rangeRows.filter(
    (row) => row.status === "Settled",
  ).length;
  const resolvedValue = rangeRows.reduce(
    (total, row) =>
      total + (asNumber(row.final_value ?? row.current_value) ?? 0),
    0,
  );
  const qualifyingLoss = rangeRows.reduce(
    (total, row) => total + (asNumber(row.qualifying_loss) ?? 0),
    0,
  );
  const rangeContext = formatResolvedDateRange(resolvedDateRange);
  const rangeDetail = formatResolvedDateRangeContext(resolvedDateRange);

  return (
    <section
      className={`content-panel stack extra-place-ledger extra-place-theme-${tableTheme}`}
      data-pd-id="extra-place.ledger"
    >
      <div className="tracker-toolbar">
        <div className="stack">
          <span className="eyebrow">Horse racing</span>
          <h1>Extra Place</h1>
        </div>
      </div>
      <section aria-label="Extra Place quick view" className="stat-strip">
        <TrackerRangeCard
          activePreset={activeDatePreset}
          isSaving={savingRange}
          onPresetChange={(preset) => void updateTrackerRange(preset)}
          rangeContext={rangeContext}
          rangeDetail={rangeDetail}
        />
        <Stat
          label="Open rows"
          value={openCount}
          detail="Placed and awaiting settlement"
        />
        <Stat
          label="Needs action"
          value={issueCount}
          detail="Incomplete or unresolved rows"
        />
        <Stat
          label="Settled"
          value={settledCount}
          detail="Completed race rows"
        />
        <article className="stat-card">
          <span className="eyebrow">Resolved value</span>
          <strong>
            <FinancialValue value={resolvedValue} />
          </strong>
          <span className="extra-place-resolved-detail">
            Qual Loss <FinancialValue animate={false} value={qualifyingLoss} />
          </span>
        </article>
      </section>
      <div
        aria-label="Extra Place controls"
        className="sportsbook-review-bar"
        role="toolbar"
      >
        <label className="field-control table-search-field">
          <span className="visually-hidden">Search Extra Place rows</span>
          <input
            aria-label="Search Extra Place rows"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Extra Place rows"
            type="search"
            value={query}
          />
        </label>
        <div className="extra-place-toolbar-actions">
          <LedgerAddRowButton label="Add Extra Place row" onClick={openNew} />
          <button
            aria-label="Open Extra Place filters"
            aria-pressed={isFilterModalOpen}
            className={`icon-button table-filter-button${hasActiveTableControls ? " has-active-table-controls" : ""}`}
            data-pd-id="extra-place.filter"
            onClick={() => setIsFilterModalOpen(true)}
            title="Filter Extra Place rows"
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              filter_list
            </span>
            {hasActiveTableControls ? (
              <span
                aria-label={`${activeTableControlCount} active Extra Place filters`}
                className="table-filter-badge"
              >
                {activeTableControlCount > 9 ? "9+" : activeTableControlCount}
              </span>
            ) : null}
          </button>
        </div>
        {hasActiveTableControls ? (
          <button
            aria-label="Clear Extra Place filters"
            className="table-filter-clear"
            onClick={() => setTableFilters(emptyTableFilters)}
            type="button"
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="extra-place-table-heading-controls">
        <div
          aria-label="Extra Place quick select loadouts"
          className="tracker-nav extra-place-loadouts"
        >
          {loadouts.map((loadout) => (
            <button
              aria-label={
                loadout.availability === "limited"
                  ? `${loadout.label}: account warning`
                  : loadout.label
              }
              className={`review-chip${loadout.availability === "limited" ? " table-chip-warning" : ""}`}
              key={loadout.preset_id}
              onClick={() => {
                openNew();
                setForm((current) => ({
                  ...current,
                  bookmaker:
                    loadout.bookmaker || loadout.defaults.bookmaker || "",
                  each_way_stake:
                    loadout.defaults.eachWayStake ??
                    loadout.defaults.default_back_stake ??
                    "",
                  place_term_denominator:
                    loadout.defaults.placeTermDenominator ?? "5",
                  bookmaker_places:
                    loadout.defaults.bookmakerPlaces ?? "5",
                  exchange_places:
                    loadout.defaults.exchangePlaces ?? "4",
                  mode:
                    loadout.defaults.mode === "Each Way"
                      ? "Each Way"
                      : "Extra Place",
                }));
              }}
              title={loadout.availability_reason || undefined}
              type="button"
            >
              {loadout.label}
            </button>
          ))}
        </div>
        <div
          className="extra-place-table-preferences"
          aria-label="Extra Place table presentation"
        >
          <div
            aria-label="Extra Place colour theme"
            className="extra-place-theme-switch"
            role="group"
          >
          <button
            aria-label="Use Extra Place colour theme"
            aria-pressed={tableTheme === "ep"}
            className="extra-place-theme-switch-option"
            onClick={() => setTableTheme("ep")}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              chess_knight
            </span>
          </button>
          <button
            aria-label="Use Back and Lay colour theme"
            aria-pressed={tableTheme === "back-lay"}
            className="extra-place-theme-switch-option"
            onClick={() => setTableTheme("back-lay")}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              palette
            </span>
          </button>
          </div>
        </div>
      </div>
      <ExtraPlaceTable
        bookmakerCatalogue={bookmakerCatalogue}
        outOfRangeIssueIds={new Set(
          outOfRangeIssueRows.map((row) => row.each_way_extra_place_id),
        )}
        onDelete={requestDelete}
        onEdit={openRow}
        onResult={(row, result) => void saveResult(row, result)}
        rows={filtered}
        visibleColumns={visibleColumns}
      />
      {typeof document !== "undefined" && open
        ? createPortal(
            <div
              className="modal-backdrop modal-backdrop-extra-place"
              onClick={close}
            >
              <section
                aria-label={
                  selectedId ? "Edit Extra Place row" : "Create Extra Place row"
                }
                aria-modal="true"
                className="content-panel stack workflow-editor-panel modal-panel workflow-editor-modal sportsbook-tabbed-editor-modal extra-place-editor-modal"
                data-pd-id="extra-place.editor.dialog"
                onClick={(event) => event.stopPropagation()}
                ref={editorRef}
                role="dialog"
                tabIndex={-1}
              >
                <div
                  className="workflow-panel-header workflow-editor-header"
                  data-pd-id="extra-place.editor.header"
                >
                  <div className="stack workflow-editor-title-stack">
                    <span className="eyebrow">
                      {selectedId
                        ? "Edit Extra Place row"
                        : "Create Extra Place row"}
                    </span>
                    <strong className="workflow-header-title">
                      {form.runner || "New racing opportunity"}
                    </strong>
                  </div>
                  <section
                    aria-label="Extra Place editor context"
                    className="editor-compact-summary"
                  >
                    <span className="table-chip">{form.mode}</span>
                    <span className="table-chip">{form.status}</span>
                    <RatingPill rating={preview?.rating_percent} />
                    <span className="table-chip">
                      Implied odds {decimalDisplay(preview?.implied_odds)}
                    </span>
                    <span className="table-chip editor-summary-value-chip">
                      {value(preview?.final_value || preview?.current_value)}
                    </span>
                  </section>
                  <HeaderActions
                    index={stepIndex}
                    onClose={close}
                    onStep={setStep}
                    steps={stepIds}
                  />
                  <LedgerEditorTabRail
                    activeTabId={step}
                    ariaLabel="Extra Place editor steps"
                    guidedTargetTabId={needed}
                    onActiveTabChange={(next) => setStep(next as StepId)}
                    tabs={tabs}
                  />
                </div>
                <div className="workflow-editor-body">
                  {isGuidedAccessEnabled(guidedAccessMode) &&
                  !guideDismissed &&
                  needed ? (
                    <Guidance
                      onDismiss={() => setGuideDismissed(true)}
                      onGo={() => setStep(needed)}
                      step={needed}
                    />
                  ) : isGuidedAccessEnabled(guidedAccessMode) &&
                    guideDismissed &&
                    needed ? (
                    <button
                      className="button-link guided-entry-restore"
                      onClick={() => setGuideDismissed(false)}
                      type="button"
                    >
                      Show guide
                    </button>
                  ) : null}
                  {error ? (
                    <p className="editor-validation-banner" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <div className="form-grid">
                    <LedgerEditorTabPanel activeTabId={step} tabId="calculate">
                      <Calculate
                        bookmakerCatalogue={bookmakerCatalogue}
                        form={form}
                        onCopy={copy}
                        onRaceDatePick={applyRaceDate}
                        onRacePaste={applyRacePaste}
                        onRaceUpdate={updateRace}
                        onUpdate={update}
                        preview={preview}
                      />
                    </LedgerEditorTabPanel>
                    <LedgerEditorTabPanel activeTabId={step} tabId="settlement">
                      <Settlement
                        form={form}
                        onUpdate={update}
                        preview={preview}
                        results={resultOptions}
                      />
                    </LedgerEditorTabPanel>
                  </div>
                </div>
                <footer
                  className="field-span-2 workflow-editor-footer"
                  data-pd-id="extra-place.editor.actions"
                >
                  <div className="tracker-nav workflow-editor-footer-primary">
                    <button
                      className="modal-primary-button"
                      disabled={saving}
                      onClick={() => void save()}
                      type="button"
                    >
                      {saving ? (
                        <>
                          <span aria-hidden="true" className="button-spinner" />
                          Saving
                        </>
                      ) : (
                        "Save"
                      )}
                    </button>
                    {selectedRow ? (
                      <button
                        className="review-chip review-chip-danger"
                        disabled={saving}
                        onClick={() => requestDelete(selectedRow)}
                        type="button"
                      >
                        Delete
                      </button>
                    ) : null}
                    <button
                      className="review-chip"
                      disabled={saving}
                      onClick={() => setForm(pristine)}
                      type="button"
                    >
                      Revert
                    </button>
                    <button
                      className="review-chip"
                      disabled={saving}
                      onClick={close}
                      type="button"
                    >
                      Close
                    </button>
                  </div>
                  <div className="tracker-nav workflow-editor-footer-nav">
                    <button
                      className="review-chip review-chip-action-previous"
                      disabled={stepIndex === 0}
                      onClick={() => setStep(stepIds[stepIndex - 1])}
                      type="button"
                    >
                      Previous
                    </button>
                    <button
                      className="review-chip review-chip-action-next"
                      disabled={stepIndex === stepIds.length - 1}
                      onClick={() => setStep(stepIds[stepIndex + 1])}
                      type="button"
                    >
                      Next
                    </button>
                  </div>
                </footer>
              </section>
            </div>,
            document.body,
          )
        : null}
      {typeof document !== "undefined" && deleteTarget
        ? createPortal(
            <div
              className="modal-backdrop modal-backdrop-elevated"
              onClick={() => !saving && setDeleteTarget(null)}
            >
              <section
                aria-label="Confirm Extra Place deletion"
                aria-modal="true"
                className="content-panel stack modal-panel extra-place-delete-dialog"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
              >
                <div className="stack">
                  <span className="eyebrow">Delete Extra Place row</span>
                  <h2>{deleteTarget.runner || "This racing row"}</h2>
                  <p>
                    {deleteTarget.status === "Settled"
                      ? "This settled row requires a deletion reason for the audit log."
                      : "This removes the row from this profile ledger."}
                  </p>
                  {deleteTarget.status === "Settled" ? (
                    <label className="field-control">
                      <span>Deletion reason</span>
                      <textarea
                        autoFocus
                        onChange={(event) =>
                          setDeletionReason(event.target.value)
                        }
                        value={deletionReason}
                      />
                    </label>
                  ) : null}
                </div>
                <div className="dialog-actions">
                  <button
                    className="button-link"
                    disabled={saving}
                    onClick={() => setDeleteTarget(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="review-chip review-chip-destructive"
                    disabled={
                      saving ||
                      (deleteTarget.status === "Settled" &&
                        !deletionReason.trim())
                    }
                    onClick={() => void confirmDelete()}
                    type="button"
                  >
                    {saving ? "Deleting" : "Delete row"}
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
      {typeof document !== "undefined" && isFilterModalOpen
        ? createPortal(
            <ExtraPlaceFilterDialog
              filters={tableFilters}
              onChange={(key, next) =>
                setTableFilters((current) => ({ ...current, [key]: next }))
              }
              onClear={() => setTableFilters(emptyTableFilters)}
              onClose={() => setIsFilterModalOpen(false)}
              onToggleColumn={(key) =>
                setVisibleColumns((current) => ({
                  ...current,
                  [key]: !current[key],
                }))
              }
              options={extraPlaceFilterOptions}
              visibleColumns={visibleColumns}
            />,
            document.body,
          )
        : null}
    </section>
  );
}

function Stat({
  label,
  value: statValue,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="stat-card">
      <span className="eyebrow">{label}</span>
      <strong>{statValue}</strong>
      <span>{detail}</span>
    </article>
  );
}
function ExtraPlaceFilterDialog({
  filters,
  onChange,
  onClear,
  onClose,
  onToggleColumn,
  options,
  visibleColumns,
}: {
  filters: ExtraPlaceTableFilters;
  onChange: <TKey extends keyof ExtraPlaceTableFilters>(
    key: TKey,
    value: ExtraPlaceTableFilters[TKey],
  ) => void;
  onClear: () => void;
  onClose: () => void;
  onToggleColumn: (key: ExtraPlaceVisibleColumn) => void;
  options: {
    bookmakers: string[];
    terms: string[];
    winExchanges: string[];
    placeExchanges: string[];
    statuses: string[];
    results: string[];
  };
  visibleColumns: ExtraPlaceVisibleColumns;
}) {
  const columns: Array<[ExtraPlaceVisibleColumn, string]> = [
    ["back_odds", "Back Odds"],
    ["terms", "E/W Terms"],
    ["place_odds", "Place Odds"],
    ["win_lay_odds", "Win Lay Odds"],
    ["win_lay_stake", "Win Lay Stake"],
    ["win_lay_liability", "Win Lay Liability"],
    ["place_lay_odds", "Place Lay Odds"],
    ["place_lay_stake", "Place Lay Stake"],
    ["place_lay_liability", "Place Lay Liability"],
    ["rating", "Rating"],
    ["implied_odds", "Implied Odds"],
  ];
  return (
    <div className="modal-backdrop modal-backdrop-elevated" onClick={onClose}>
      <section
        aria-label="Extra Place filter controls"
        aria-modal="true"
        className="modal-panel stack extra-place-filter-dialog"
        data-pd-id="extra-place.filter.dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="workflow-panel-header">
          <div className="stack">
            <span className="eyebrow">Table controls</span>
            <strong>Filter Extra Place rows</strong>
          </div>
          <button
            aria-label="Close Extra Place filter controls"
            className="modal-close-button"
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              close
            </span>
          </button>
        </div>
        <div className="form-grid">
          <ChoiceField
            label="View"
            onChange={(next) =>
              onChange("view", next as ExtraPlaceTableFilters["view"])
            }
            options={["all", "open", "settled", "issues"]}
            value={filters.view}
          />
          <ChoiceField
            label="Bookmaker"
            onChange={(next) => onChange("bookmaker", next)}
            options={options.bookmakers}
            value={filters.bookmaker}
          />
          <ChoiceField
            label="Bet type"
            onChange={(next) =>
              onChange("mode", next as ExtraPlaceTableFilters["mode"])
            }
            options={["Each Way", "Extra Place"]}
            value={filters.mode}
          />
          <ChoiceField
            label="E/W terms"
            onChange={(next) => onChange("place_term_denominator", next)}
            options={options.terms}
            value={filters.place_term_denominator}
          />
          <ChoiceField
            label="Win exchange"
            onChange={(next) => onChange("win_exchange", next)}
            options={options.winExchanges}
            value={filters.win_exchange}
          />
          <ChoiceField
            label="Place exchange"
            onChange={(next) => onChange("place_exchange", next)}
            options={options.placeExchanges}
            value={filters.place_exchange}
          />
          <ChoiceField
            label="Status"
            onChange={(next) => onChange("status", next)}
            options={options.statuses}
            value={filters.status}
          />
          <ChoiceField
            label="Result"
            onChange={(next) => onChange("result", next)}
            options={options.results}
            value={filters.result}
          />
          <ChoiceField
            label="Issue type"
            onChange={(next) =>
              onChange("issue_type", next as ExtraPlaceIssueFilter)
            }
            options={["any", "all-issues", "calculation", "outcome-needed"]}
            value={filters.issue_type}
          />
        </div>
        <section
          aria-label="Visible columns"
          className="extra-place-filter-columns"
        >
          <strong>Visible columns</strong>
          <div className="extra-place-quick-choice-row">
            {columns.map(([key, label]) => (
              <button
                aria-pressed={visibleColumns[key]}
                className={`review-chip${visibleColumns[key] ? " review-chip-action-positive" : ""}`}
                key={key}
                onClick={() => onToggleColumn(key)}
                type="button"
              >
                {visibleColumns[key] ? `Hide ${label}` : `Show ${label}`}
              </button>
            ))}
          </div>
          <small>
            Date/time, runner/race, bookmaker, E/W stake, qualifying loss, Extra
            Place profit and actions always remain visible.
          </small>
        </section>
        <div className="dialog-actions">
          <button className="button-link" onClick={onClear} type="button">
            Clear filters
          </button>
          <button
            className="modal-primary-button"
            onClick={onClose}
            type="button"
          >
            Done
          </button>
        </div>
      </section>
    </div>
  );
}
function ExtraPlaceTable({
  bookmakerCatalogue,
  outOfRangeIssueIds,
  rows,
  visibleColumns,
  onDelete,
  onEdit,
  onResult,
}: {
  bookmakerCatalogue: BookmakerCatalogueRecord[];
  outOfRangeIssueIds: Set<string>;
  rows: Row[];
  visibleColumns: ExtraPlaceVisibleColumns;
  onDelete: (row: Row) => void;
  onEdit: (row: Row) => void;
  onResult: (row: Row, result: string) => void;
}) {
  const columns = [
    "date", "runner", "bookmaker", "stake", "backOdds", "terms", "placeOdds",
    "winLayOdds", "winLayStake", "winLiability", "placeLayOdds", "placeLayStake",
    "placeLiability", "rating", "impliedOdds", "qualLoss", "epProfit", "status", "actions",
  ] as const;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    date: 152, runner: 230, bookmaker: 150, stake: 155, backOdds: 118, terms: 108,
    placeOdds: 118, winLayOdds: 142, winLayStake: 142, winLiability: 142,
    placeLayOdds: 142, placeLayStake: 142, placeLiability: 142, rating: 108,
    impliedOdds: 120, qualLoss: 132, epProfit: 144, status: 180, actions: 116,
  });
  const visible = (key: (typeof columns)[number]) =>
    !["backOdds", "terms", "placeOdds", "winLayOdds", "winLayStake", "winLiability", "placeLayOdds", "placeLayStake", "placeLiability", "rating", "impliedOdds"].includes(key) ||
    visibleColumns[
      ({ backOdds: "back_odds", terms: "terms", placeOdds: "place_odds", winLayOdds: "win_lay_odds", winLayStake: "win_lay_stake", winLiability: "win_lay_liability", placeLayOdds: "place_lay_odds", placeLayStake: "place_lay_stake", placeLiability: "place_lay_liability", rating: "rating", impliedOdds: "implied_odds" } as Record<string, ExtraPlaceVisibleColumn>)[key]
    ];
  const activeColumns = columns.filter(visible);
  const startResize = (
    event: React.MouseEvent<HTMLSpanElement>,
    key: (typeof columns)[number],
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const initial = columnWidths[key];
    const start = event.clientX;
    const move = (next: MouseEvent) =>
      setColumnWidths((current) => ({
        ...current,
        [key]: Math.max(96, Math.round(initial + next.clientX - start)),
      }));
    const stop = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
  };
  return (
    <LedgerTableScroll dataPdId="extra-place.table-scroll">
      <table className="data-table extra-place-data-table">
        <colgroup>
          {activeColumns.map((key) => <col key={key} style={{ width: `${columnWidths[key]}px` }} />)}
        </colgroup>
        <thead>
          <tr>
            <ResizableHeader label="Date / time" onResize={(event) => startResize(event, "date")} />
            <ResizableHeader label="Runner / Race" onResize={(event) => startResize(event, "runner")} />
            <ResizableHeader className="extra-place-column-back" label="Bookmaker" onResize={(event) => startResize(event, "bookmaker")} />
            <ResizableHeader className="extra-place-column-back" label="E/W Stake" onResize={(event) => startResize(event, "stake")} />
            {visibleColumns.back_odds ? (
              <ResizableHeader className="extra-place-column-back" label="Back Odds" onResize={(event) => startResize(event, "backOdds")} />
            ) : null}
            {visibleColumns.terms ? (
              <ResizableHeader className="extra-place-column-back" label="E/W Terms" onResize={(event) => startResize(event, "terms")} />
            ) : null}
            {visibleColumns.place_odds ? (
              <ResizableHeader className="extra-place-column-back" label="Place Odds" onResize={(event) => startResize(event, "placeOdds")} />
            ) : null}
            {visibleColumns.win_lay_odds ? (
              <ResizableHeader className="extra-place-column-win-lay" label="Win Lay Odds" onResize={(event) => startResize(event, "winLayOdds")} />
            ) : null}
            {visibleColumns.win_lay_stake ? (
              <ResizableHeader className="extra-place-column-win-lay" label="Win Lay Stake" onResize={(event) => startResize(event, "winLayStake")} />
            ) : null}
            {visibleColumns.win_lay_liability ? (
              <ResizableHeader className="extra-place-column-win-lay" label="Win Lay Liab" onResize={(event) => startResize(event, "winLiability")} />
            ) : null}
            {visibleColumns.place_lay_odds ? (
              <ResizableHeader className="extra-place-column-place-lay" label="Place Lay Odds" onResize={(event) => startResize(event, "placeLayOdds")} />
            ) : null}
            {visibleColumns.place_lay_stake ? (
              <ResizableHeader className="extra-place-column-place-lay" label="Place Lay Stake" onResize={(event) => startResize(event, "placeLayStake")} />
            ) : null}
            {visibleColumns.place_lay_liability ? (
              <ResizableHeader className="extra-place-column-place-lay" label="Place Lay Liab" onResize={(event) => startResize(event, "placeLiability")} />
            ) : null}
            {visibleColumns.rating ? <ResizableHeader label="Rating %" onResize={(event) => startResize(event, "rating")} /> : null}
            {visibleColumns.implied_odds ? <ResizableHeader label="Implied Odds" onResize={(event) => startResize(event, "impliedOdds")} /> : null}
            <ResizableHeader label="Qual Loss" onResize={(event) => startResize(event, "qualLoss")} />
            <ResizableHeader label="EP Profit" onResize={(event) => startResize(event, "epProfit")} />
            <ResizableHeader label="Status" onResize={(event) => startResize(event, "status")} />
            <ResizableHeader label="Actions" onResize={(event) => startResize(event, "actions")} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <LedgerRow
              bookmakerCatalogue={bookmakerCatalogue}
              key={row.each_way_extra_place_id}
              onDelete={() => onDelete(row)}
              onEdit={() => onEdit(row)}
              onResult={(result) => onResult(row, result)}
              outsideTrackerRange={outOfRangeIssueIds.has(
                row.each_way_extra_place_id,
              )}
              row={row}
              visibleColumns={visibleColumns}
            />
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={activeColumns.length}>
                No Extra Place rows match this view.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </LedgerTableScroll>
  );
}
function ResizableHeader({ className = "", label, onResize }: { className?: string; label: string; onResize: (event: React.MouseEvent<HTMLSpanElement>) => void }) {
  return <th className={className} scope="col"><div className="table-header-cell"><span className="table-header-label">{label}</span><span aria-hidden="true" className="table-column-resize-handle" onMouseDown={onResize} /></div></th>;
}
function LedgerRow({
  bookmakerCatalogue,
  outsideTrackerRange,
  row,
  visibleColumns,
  onDelete,
  onEdit,
  onResult,
}: {
  bookmakerCatalogue: BookmakerCatalogueRecord[];
  outsideTrackerRange: boolean;
  row: Row;
  visibleColumns: ExtraPlaceVisibleColumns;
  onDelete: () => void;
  onEdit: () => void;
  onResult: (result: string) => void;
}) {
  const rowIssues = getRowIssues(row);
  const issueCount = rowIssues.length;
  const issue = row.calculation_state !== "resolved" || issueCount > 0;
  const visibleIssues = rowIssues.slice(0, 4);
  const outcomes = resultChoices(
    row.mode,
    row.bookmaker_places ?? undefined,
    row.exchange_places ?? undefined,
  );
  return (
    <tr
      className={`${issue ? issueCount > 4 ? "row-state-issue-danger" : "row-state-issue-warning" : ""}${outsideTrackerRange ? " extra-place-row-outside-range" : ""}`}
      onClick={onEdit}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit();
        }
      }}
      tabIndex={0}
    >
      <td>
        {rowIssues.length > 0 ? (
          <div aria-label={`Issues for ${row.runner || "Extra Place row"}`} className="row-issue-overlay">
            {visibleIssues.map((label) => (
              <span className="table-chip table-chip-warning" key={label}>{label}</span>
            ))}
            {issueCount > visibleIssues.length ? (
              <span className="table-chip table-chip-muted">
                {issueCount - visibleIssues.length}+ Issues
              </span>
            ) : null}
          </div>
        ) : null}
        {formatLedgerDateTime(row.placed_at)}
      </td>
      <td>
        <strong>{row.runner || "Runner needed"}</strong>
        <br />
        {row.race || "Race needed"}
      </td>
      <td>
        {row.bookmaker ? (
          <BookmakerIdentity
            bookmaker={row.bookmaker}
            catalogue={bookmakerCatalogue}
            mode="Brand badge"
          />
        ) : (
          "Bookmaker needed"
        )}
      </td>
      <td>
        <span className="extra-place-stake-stack">
          {neutralValue(row.each_way_stake)}
          <small>
            {neutralValue(row.each_way_stake)} each way,{" "}
            {neutralValue(String((asNumber(row.each_way_stake) ?? 0) * 2))}{" "}
            total
          </small>
        </span>
      </td>
      {visibleColumns.back_odds ? <td>{row.back_odds || "-"}</td> : null}
      {visibleColumns.terms ? (
        <td>1 / {row.place_term_denominator || "-"}</td>
      ) : null}
      {visibleColumns.place_odds ? <td>{row.place_back_odds || "-"}</td> : null}
      {visibleColumns.win_lay_odds ? <td><strong>{row.win_lay_odds || "-"}</strong><small>{row.win_exchange || "Unselected"}</small></td> : null}
      {visibleColumns.win_lay_stake ? (
        <td>{neutralValue(row.win_lay_stake)}</td>
      ) : null}
      {visibleColumns.win_lay_liability ? (
        <td>{neutralValue(row.win_liability)}</td>
      ) : null}
      {visibleColumns.place_lay_odds ? (
        <td><strong>{row.place_lay_odds || "-"}</strong><small>{row.place_exchange || "Unselected"}</small></td>
      ) : null}
      {visibleColumns.place_lay_stake ? (
        <td>{neutralValue(row.place_lay_stake)}</td>
      ) : null}
      {visibleColumns.place_lay_liability ? (
        <td>{neutralValue(row.place_liability)}</td>
      ) : null}
      {visibleColumns.rating ? <td><RatingPill rating={row.rating_percent} /></td> : null}
      {visibleColumns.implied_odds ? <td>{decimalDisplay(row.implied_odds)}</td> : null}
      <td>{value(row.qualifying_loss)}</td>
      <td><EpProfit row={row} /></td>
      <td><StatusDisplay outsideTrackerRange={outsideTrackerRange} row={row} /></td>
      <td>
        <div
          className="table-action-row extra-place-table-actions"
          onClick={(event) => event.stopPropagation()}
        >
          <ResultAction outcomes={outcomes} onResult={onResult} row={row} />
          <button
            aria-label={`Delete ${row.runner || "Extra Place row"}`}
            className="icon-button icon-button-destructive table-action-button"
            onClick={onDelete}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              delete
            </span>
          </button>
        </div>
      </td>
    </tr>
  );
}
function RatingPill({ rating }: { rating: string | null | undefined }) {
  const numericRating = asNumber(rating);
  const tone = numericRating === null ? "neutral" : getMatchRatingPillTone(numericRating);
  return (
    <span className={`table-chip calculator-match-rating-pill extra-place-rating-pill calculator-match-rating-pill-${tone}${numericRating === null ? " extra-place-rating-pill-neutral" : ""}`}>
      Rating {numericRating === null ? "—" : `${numericRating.toFixed(2)}%`}
    </span>
  );
}
function EpProfit({ row }: { row: Row }) {
  if (row.mode !== "Extra Place") return <span className="extra-place-profit-neutral">-</span>;
  const hit = row.status === "Settled" && row.result === "Extra Place";
  const missed = row.status === "Settled" && !hit && row.result !== "Pending";
  const profit = asNumber(row.extra_place_profit);
  return (
    <span className={`extra-place-profit-value${hit ? " is-hit" : ""}${missed ? " is-missed" : ""}`}>
      {profit === null ? "£ -" : formatFinancialValue(profit)}
    </span>
  );
}
function StatusDisplay({
  row,
  outsideTrackerRange = false,
}: {
  row: Row;
  outsideTrackerRange?: boolean;
}) {
  const position = row.finishing_position
    ? ordinalPosition(row.finishing_position)
    : row.status === "Settled"
      ? "Position needed"
      : "Pending";
  return (
    <span className="extra-place-status-display">
      <strong>{position}</strong>
      <small className={row.result === "Extra Place" ? "extra-place-status-extra" : ""}>{row.result || "Pending"}</small>
      {outsideTrackerRange ? <small>Needs action · outside range</small> : null}
    </span>
  );
}
function ResultAction({
  row,
  outcomes,
  onResult,
}: {
  row: Row;
  outcomes: string[][];
  onResult: (result: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openMenu = () => {
    const nextAnchor = triggerRef.current?.getBoundingClientRect() ?? null;
    setAnchor(nextAnchor);
    setExpanded((current) => !current);
  };
  return (
    <div className="extra-place-result-action">
      <button
        aria-expanded={expanded}
        aria-haspopup="listbox"
        aria-label={`Update result for ${row.runner || "Extra Place row"}`}
        className="icon-button table-action-button"
        onClick={openMenu}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true" className="material-symbols-outlined">
          flag
        </span>
      </button>
      {expanded && anchor && typeof document !== "undefined" ? createPortal(
        <div
          aria-label={`Results for ${row.runner || "Extra Place row"}`}
          className="extra-place-result-menu"
          role="listbox"
          style={{ top: anchor.bottom + 6, left: Math.max(8, anchor.right - 208) }}
        >
          {outcomes.map(([result, label]) => (
            <button
              aria-selected={false}
              key={result}
              onClick={() => {
                onResult(result);
                setExpanded(false);
              }}
              role="option"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      , document.body) : null}
    </div>
  );
}
function HeaderActions({
  index,
  onClose,
  onStep,
  steps,
}: {
  index: number;
  onClose: () => void;
  onStep: (step: StepId) => void;
  steps: StepId[];
}) {
  return (
    <div className="tracker-nav workflow-editor-header-actions">
      <div className="workflow-editor-header-nav">
        <button
          className="review-chip review-chip-action-previous"
          disabled={index === 0}
          onClick={() => onStep(steps[index - 1])}
          type="button"
        >
          Previous
        </button>
        <button
          className="review-chip review-chip-action-next"
          disabled={index === steps.length - 1}
          onClick={() => onStep(steps[index + 1])}
          type="button"
        >
          Next
        </button>
      </div>
      <button
        aria-label="Close Extra Place editor"
        className="workflow-editor-cancel-button"
        onClick={onClose}
        type="button"
      >
        <span aria-hidden="true" className="material-symbols-outlined">
          close
        </span>
      </button>
    </div>
  );
}
function Guidance({
  step,
  onGo,
  onDismiss,
}: {
  step: StepId;
  onGo: () => void;
  onDismiss: () => void;
}) {
  const copy =
    step === "calculate"
      ? "Add the runner, race, date, bookmaker, stake, and lay odds."
      : "Select the settlement result.";
  return (
    <section
      className="guided-entry-banner guided-entry-banner-next_required"
      data-pd-id="extra-place.guided-entry"
      role="status"
    >
      <button className="guided-entry-action" onClick={onGo} type="button">
        <span className="eyebrow">Next required</span>
        <strong>
          {step === "calculate"
            ? copy
            : `Go to Settlement and ${copy.charAt(0).toLowerCase()}${copy.slice(1)}`}
        </strong>
      </button>
      <button
        aria-label="Dismiss Extra Place guide"
        className="icon-button guided-entry-dismiss"
        onClick={onDismiss}
        type="button"
      >
        <span aria-hidden="true" className="material-symbols-outlined">
          close
        </span>
      </button>
    </section>
  );
}
function Field({
  label,
  value: fieldValue,
  onChange,
  onBlur,
  onPaste,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  onPaste?: (value: string) => boolean;
  type?: string;
}) {
  const numericField = type === "number";
  return (
    <label className="field-control">
      <span>{label}</span>
      <input
        inputMode={numericField ? "decimal" : undefined}
        onBlur={(event) => onBlur?.(event.target.value)}
        onChange={(event) => onChange(event.target.value)}
        onPaste={(event) => {
          if (onPaste?.(event.clipboardData.getData("text"))) {
            event.preventDefault();
          }
        }}
        type={numericField ? "text" : type}
        value={fieldValue}
      />
    </label>
  );
}
function ChoiceField({
  label,
  value: fieldValue,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="field-control">
      <span>{label}</span>
      <select
        onChange={(event) => onChange(event.target.value)}
        value={fieldValue}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
function Chips({
  labels,
  onPick,
  selected = [],
  className = "extra-place-quick-choice-row",
}: {
  labels: string[];
  onPick: (value: string) => void;
  selected?: string[];
  className?: string;
}) {
  return (
    <div className={className}>
      {labels.map((label) => (
        <button
          aria-pressed={selected.includes(label)}
          className={`review-chip${selected.includes(label) ? " review-chip-action-positive" : ""}`}
          key={label}
          onClick={() => onPick(label)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
function BookmakerChips({
  catalogue,
  labels,
  onPick,
  rows = [],
}: {
  catalogue: BookmakerCatalogueRecord[];
  labels: string[];
  onPick: (value: string) => void;
  rows?: Row[];
}) {
  const rankedLabels = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => {
      if (row.bookmaker)
        counts.set(row.bookmaker, (counts.get(row.bookmaker) ?? 0) + 1);
    });
    return [
      ...new Set([
        ...Array.from(counts.entries())
          .sort(([, left], [, right]) => right - left)
          .map(([bookmaker]) => bookmaker),
        ...labels,
      ]),
    ].slice(0, 4);
  }, [labels, rows]);
  return (
    <div className="extra-place-quick-choice-row">
      {rankedLabels.map((label) => {
        const entry = findBookmakerCatalogueEntry(catalogue, label);
        return (
          <button
            className="review-chip extra-place-bookmaker-chip"
            key={label}
            onClick={() => onPick(label)}
            style={
              entry
                ? {
                    backgroundColor: entry.background_colour,
                    color: entry.foreground_colour,
                  }
                : undefined
            }
            type="button"
          >
            {entry?.brand_name ?? label}
          </button>
        );
      })}
    </div>
  );
}
function Calculate({
  bookmakerCatalogue,
  form,
  onUpdate,
  onRaceUpdate,
  onRaceDatePick,
  onRacePaste,
  preview,
  onCopy,
}: {
  bookmakerCatalogue: BookmakerCatalogueRecord[];
  form: Form;
  onUpdate: (key: keyof Form, value: string) => void;
  onRaceUpdate: (value: string) => void;
  onRaceDatePick: (value: string) => void;
  onRacePaste: (value: string) => boolean;
  preview: Row | null;
  onCopy: (value: string | null | undefined) => void;
}) {
  const raceDates = getRaceDateSuggestions(form.race);
  return (
    <section className="stack">
      <section className="extra-place-race-details" aria-label="Racing details">
        <div className="form-grid">
          <Field
            label="Runner / Horse"
            onChange={(next) => onUpdate("runner", next)}
            onPaste={onRacePaste}
            value={form.runner}
          />
          <Field
            label="Race"
            onChange={onRaceUpdate}
            onPaste={onRacePaste}
            value={form.race}
          />
          <div className="extra-place-field-with-chips">
            <Field
              label="Date / Time"
              onChange={(next) => onUpdate("placed_at", next)}
              type="datetime-local"
              value={form.placed_at}
            />
            {raceDates ? (
              <Chips
                labels={[
                  `Today, ${raceDates.time}`,
                  `Tomorrow, ${raceDates.time}`,
                ]}
                onPick={(choice) =>
                  onRaceDatePick(
                    choice.startsWith("Today")
                      ? raceDates.today
                      : raceDates.tomorrow,
                  )
                }
              />
            ) : null}
          </div>
        </div>
      </section>
      <div className="extra-place-bet-type-toggle" role="group">
        <button
          aria-pressed={form.mode === "Each Way"}
          className="extra-place-bet-type-toggle-option"
          onClick={() => onUpdate("mode", "Each Way")}
          type="button"
        >
          Each Way
        </button>
        <button
          aria-pressed={form.mode === "Extra Place"}
          className="extra-place-bet-type-toggle-option"
          onClick={() => onUpdate("mode", "Extra Place")}
          type="button"
        >
          Extra Place
        </button>
      </div>
      <section className="calculator-segment calculator-segment-back">
        <h3>Back Bet</h3>
        <div className="form-grid">
          <div className="extra-place-field-with-chips">
            <ChoiceField
              label="Bookmaker"
              onChange={(next) => onUpdate("bookmaker", next)}
              options={bookmakers}
              value={form.bookmaker}
            />
            <BookmakerChips
              catalogue={bookmakerCatalogue}
              labels={bookmakers}
              onPick={(next) => onUpdate("bookmaker", next)}
            />
          </div>
          <div className="extra-place-field-with-chips">
            <Field
              label="E/W Stake (each way)"
              onChange={(next) => onUpdate("each_way_stake", next)}
              type="number"
              value={form.each_way_stake}
            />
            <p className="extra-place-stake-explainer">
              {neutralValue(form.each_way_stake)} each way. Total bookmaker stake: {" "}
              {neutralValue(String((asNumber(form.each_way_stake) ?? 0) * 2))}.
            </p>
            <Chips
              labels={["£ 2.50", "£ 5.00", "£ 10.00"]}
              onPick={(next) =>
                onUpdate("each_way_stake", next.replace(/[^\d.]/g, ""))
              }
            />
          </div>
          <Field
            label="Back Odds"
            onChange={(next) => onUpdate("back_odds", next)}
            type="number"
            value={form.back_odds}
          />
          <div className="extra-place-field-with-chips">
            <label className="field-control">
              <span>Each-Way Terms</span>
              <div className="extra-place-term-input">
                <span>1 /</span>
                <input
                  aria-label="Each-way term denominator"
                  inputMode="numeric"
                  onChange={(event) =>
                    onUpdate(
                      "place_term_denominator",
                      event.target.value.replace(/[^0-9]/g, ""),
                    )
                  }
                  value={form.place_term_denominator}
                />
              </div>
            </label>
            <Chips
              labels={["1/4", "1/5", "1/6"]}
              onPick={(next) =>
                onUpdate("place_term_denominator", next.split("/")[1])
              }
            />
          </div>
        </div>
        <div className="extra-place-place-terms">
          <strong className="extra-place-place-terms-title">Place Terms</strong>
          <div className="extra-place-place-terms-inputs">
            <Field
              label="Bookmaker Pays"
              onChange={(next) => onUpdate("bookmaker_places", next)}
              type="number"
              value={form.bookmaker_places}
            />
            <Field
              label="Exchange Pays"
              onChange={(next) => onUpdate("exchange_places", next)}
              type="number"
              value={form.exchange_places}
            />
          </div>
          <p className="extra-place-stake-explainer">
            {form.mode === "Extra Place"
              ? `Paying ${form.bookmaker_places || "—"} instead of ${form.exchange_places || "—"}.`
              : `Paying ${form.bookmaker_places || "—"} places.`}
          </p>
          <Chips
            labels={[
              "Paying 4 instead of 3",
              "Paying 5 instead of 4",
              "Paying 6 instead of 4",
              "Paying 6 instead of 5",
              "Paying 8 instead of 5",
              "Paying 10 instead of 8",
            ]}
            onPick={(next) => {
              const match = next.match(/Paying (\d+) instead of (\d+)/);
              if (!match) return;
              onUpdate("bookmaker_places", match[1]);
              onUpdate("exchange_places", match[2]);
            }}
            selected={[
              `Paying ${form.bookmaker_places || ""} instead of ${form.exchange_places || ""}`,
            ]}
          />
        </div>
      </section>
      <LaySegment
        exchange="win_exchange"
        kind="win"
        label="Lay The Win"
        odds="win_lay_odds"
        form={form}
        onCopy={onCopy}
        onUpdate={onUpdate}
        stake={preview?.win_lay_stake}
        liability={preview?.win_liability}
      />
      <LaySegment
        exchange="place_exchange"
        kind="place"
        label="Lay The Place"
        odds="place_lay_odds"
        form={form}
        onCopy={onCopy}
        onUpdate={onUpdate}
        stake={preview?.place_lay_stake}
        liability={preview?.place_liability}
      />
      <Outcome preview={preview} mode={form.mode} result={form.result} />
    </section>
  );
}
function LaySegment({
  label,
  kind,
  exchange,
  odds,
  form,
  onUpdate,
  stake,
  liability,
  onCopy,
}: {
  label: string;
  kind: "win" | "place";
  exchange: keyof Form;
  odds: keyof Form;
  form: Form;
  onUpdate: (key: keyof Form, value: string) => void;
  stake: string | null | undefined;
  liability: string | null | undefined;
  onCopy: (value: string | null | undefined) => void;
}) {
  return (
    <section
      className={`calculator-segment calculator-segment-lay extra-place-lay-segment extra-place-lay-${kind}`}
    >
      <h3>{label}</h3>
      <div className="form-grid">
        <ChoiceField
          label="Exchange"
          onChange={(next) => onUpdate(exchange, next)}
          options={exchanges}
          value={form[exchange] as string}
        />
        <Field
          label="Lay Odds"
          onChange={(next) => onUpdate(odds, next)}
          type="number"
          value={form[odds] as string}
        />
      </div>
      <Chips labels={exchanges} onPick={(next) => onUpdate(exchange, next)} />
      <div className="extra-place-calculated-stake">
        <span>Calculated Lay Stake</span>
        <strong>{neutralValue(stake)}</strong>
        <span>Liability {neutralValue(liability)}</span>
        <button
          className="review-chip extra-place-copy-button"
          disabled={!stake}
          onClick={() => void onCopy(stake)}
          type="button"
        >
          <span aria-hidden="true" className="material-symbols-outlined">
            content_copy
          </span>
          <span>Copy stake</span>
        </button>
      </div>
    </section>
  );
}
function Settlement({
  form,
  onUpdate,
  preview,
  results,
}: {
  form: Form;
  onUpdate: (key: keyof Form, value: string) => void;
  preview: Row | null;
  results: string[];
}) {
  const positions = extraPlacePositionChoices(
    form.mode,
    form.bookmaker_places,
    form.exchange_places,
  );
  const applyResult = (result: string) => {
    onUpdate("status", result === "Void/NR" ? "Void" : "Settled");
    onUpdate("result", result);
    onUpdate(
      "finishing_position",
      extraPlacePositionForResult(
        result,
        form.mode,
        form.bookmaker_places,
        form.exchange_places,
      ),
    );
  };
  const applyPosition = (position: string) => {
    const normalized = ordinalPosition(position);
    onUpdate("finishing_position", normalized);
    onUpdate("status", "Settled");
    onUpdate(
      "result",
      resultForExtraPlacePosition(
        form.mode,
        form.bookmaker_places,
        form.exchange_places,
        normalized,
      ),
    );
  };
  const normalizedPosition = ordinalPosition(form.finishing_position);
  return (
    <section className="stack">
      <div className="form-grid">
        <div className="extra-place-field-with-chips">
          <ChoiceField
            label="Status"
            onChange={(next) => onUpdate("status", next)}
            options={["Prospecting", "Placed", "Settled", "Void"]}
            value={form.status}
          />
          <Chips
            labels={["Placed", "Settled", "Void"]}
            onPick={(next) => onUpdate("status", next)}
            selected={[form.status]}
          />
        </div>
        <div className="extra-place-field-with-chips">
          <ChoiceField
            label="Result"
            onChange={applyResult}
            options={results}
            value={form.result}
          />
          <Chips
            labels={results.filter((result) => result !== "Pending")}
            onPick={applyResult}
            selected={[form.result]}
          />
        </div>
        <div className="extra-place-field-with-chips">
          <Field
            label="Finishing Position"
            onBlur={(next) =>
              onUpdate("finishing_position", ordinalPosition(next))
            }
            onChange={(next) =>
              onUpdate(
                "finishing_position",
                /^\d$/.test(next) ? ordinalPosition(next) : next,
              )
            }
            type="text"
            value={form.finishing_position}
          />
          <Chips
            labels={positions.map(ordinalPosition)}
            onPick={(next) => applyPosition(next)}
            selected={normalizedPosition ? [normalizedPosition] : []}
          />
        </div>
      </div>
      <details className="section-stack extra-place-advanced">
        <summary>Advanced</summary>
        <label className="field-control">
          <span>Notes</span>
          <textarea
            onChange={(event) => onUpdate("user_notes", event.target.value)}
            value={form.user_notes}
          />
        </label>
      </details>
      <Outcome preview={preview} mode={form.mode} result={form.result} />
    </section>
  );
}
function Outcome({
  preview,
  mode,
  result,
}: {
  preview: Row | null;
  mode: "Each Way" | "Extra Place";
  result: string;
}) {
  const outcomes: Array<{
    key: string;
    label: string;
    bookie: Array<string | null | undefined>;
    exchange: Array<string | null | undefined>;
    total: string | null | undefined;
    result: string;
  }> = [
    {
      key: "win",
      label: "First Place",
      bookie: [
        preview?.first_place_bookie_win_pnl,
        preview?.first_place_bookie_place_pnl,
      ],
      exchange: [
        preview?.first_place_exchange_win_pnl,
        preview?.first_place_exchange_place_pnl,
      ],
      total: preview?.first_place_pnl,
      result: "Win",
    },
    {
      key: "standard",
      label: "Standard Place",
      bookie: [
        preview?.standard_place_bookie_win_pnl,
        preview?.standard_place_bookie_place_pnl,
      ],
      exchange: [
        preview?.standard_place_exchange_win_pnl,
        preview?.standard_place_exchange_place_pnl,
      ],
      total: preview?.standard_place_pnl,
      result: "Standard Place",
    },
    ...(mode === "Extra Place"
      ? [
          {
            key: "extra",
            label: "Extra Place",
            bookie: [
              preview?.extra_place_bookie_win_pnl,
              preview?.extra_place_bookie_place_pnl,
            ],
            exchange: [
              preview?.extra_place_exchange_win_pnl,
              preview?.extra_place_exchange_place_pnl,
            ],
            total: preview?.extra_place_pnl,
            result: "Extra Place",
          },
        ]
      : []),
    {
      key: "unplaced",
      label: "Doesn't Place",
      bookie: [
        preview?.unplaced_bookie_win_pnl,
        preview?.unplaced_bookie_place_pnl,
      ],
      exchange: [
        preview?.unplaced_exchange_win_pnl,
        preview?.unplaced_exchange_place_pnl,
      ],
      total: preview?.unplaced_pnl,
      result: "Unplaced",
    },
  ];
  const selected = outcomes.find((outcome) => outcome.result === result);
  return (
    <section
      className="extra-place-outcome-matrix calculator-result-card"
      data-pd-id="extra-place.outcome-matrix"
    >
      <div className="calculator-result-card-heading">
        <h3>Outcomes</h3>
      </div>
      <div className="extra-place-outcome-table" role="table">
        {outcomes.map((outcome) => (
          <div
            aria-label={`${outcome.label}: bookmaker ${formatFinancialValue(asNumber(outcome.bookie[0]) ?? 0)} and ${formatFinancialValue(asNumber(outcome.bookie[1]) ?? 0)}; exchange ${formatFinancialValue(asNumber(outcome.exchange[0]) ?? 0)} and ${formatFinancialValue(asNumber(outcome.exchange[1]) ?? 0)}; total ${formatFinancialValue(asNumber(outcome.total) ?? 0)}`}
            className={`extra-place-outcome-row extra-place-outcome-${outcome.key}${result === outcome.result ? " is-selected" : ""}`}
            key={outcome.key}
            role="row"
          >
            <strong>{outcome.label}</strong>
            <span>
              {matrixValue(outcome.bookie[0])} <b>+</b>{" "}
              {matrixValue(outcome.bookie[1])}
            </span>
            <span>
              {matrixValue(outcome.exchange[0])} <b>+</b>{" "}
              {matrixValue(outcome.exchange[1])}
            </span>
            <strong>{matrixValue(outcome.total)}</strong>
          </div>
        ))}
      </div>
      <div className="extra-place-outcome-summary">
        <span>
          Outcome{" "}
          {selected
            ? matrixValue(selected.total)
            : "Select a finishing position"}
        </span>
        <span>Qualifying Loss {matrixValue(preview?.qualifying_loss)}</span>
      </div>
    </section>
  );
}
