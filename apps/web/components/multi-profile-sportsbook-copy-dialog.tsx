"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/date-format";
import { useDialogFocusLifecycle } from "@/lib/ledger-ui";
import {
  sportsbookStatusOptions,
  sportsbookStrategyOptions,
} from "@/lib/workbook-options";

type SourceSportsbookBet = {
  sportsbook_bet_id: string;
  event_name: string;
  offer_text: string;
  bookmaker: string;
  offer_type: string;
  bet_type: string;
  offer_name: string;
  fixture_type: string;
  market: string;
  status: string;
  result: string;
  back_stake: string;
  back_odds: string;
  bonus_trigger: string;
  maximum_bonus: string;
  bonus_retention_rate: string;
  match_strategy: string;
  lay_odds_1: string;
  multi_lay_outcome_1_name: string;
  multi_lay_outcomes_json: string;
  lay_actual: string;
  lay_matched_stake_1: string;
  exchange_name: string;
  date_settled: string;
  user_notes: string;
  manual_override_value: string;
  manual_override_reason: string;
};

type ExchangeOption = {
  exchange_name: string;
  commission_rate: string;
};

type CopyTarget = {
  profile_id: string;
  display_name: string;
  profile_code: string;
  eligible: boolean;
  state: string;
  reasons: string[];
  bookmaker_account_status: string;
  exchange_options: ExchangeOption[];
};

type TargetDraft = {
  back_stake: string;
  back_odds: string;
  match_strategy: string;
  exchange_name: string;
  lay_odds_1: string;
  lay_actual: string;
  lay_matched_stake_1: string;
  date_settled: string;
  status: string;
};

type CopyResult = {
  profileId: string;
  displayName: string;
  state: "Created" | "Skipped";
  sportsbookBetId?: string;
};

function createTargetDraft(source: SourceSportsbookBet, target: CopyTarget): TargetDraft {
  const exchangeName = target.exchange_options.some(
    (option) => option.exchange_name === source.exchange_name
  )
    ? source.exchange_name
    : target.exchange_options[0]?.exchange_name ?? "";
  return {
    back_stake: source.back_stake,
    back_odds: source.back_odds,
    match_strategy: source.match_strategy,
    exchange_name: source.match_strategy === "No Lay" ? "" : exchangeName,
    lay_odds_1: source.lay_odds_1,
    lay_actual: "",
    lay_matched_stake_1: "",
    date_settled: toDateTimeLocalValue(source.date_settled),
    status: "Prospecting",
  };
}

function clearMultiLayPlacementState(serializedOutcomes: string): string {
  try {
    const parsed = JSON.parse(serializedOutcomes) as unknown;
    if (!Array.isArray(parsed)) {
      return "[]";
    }
    return JSON.stringify(
      parsed.map((entry) => {
        if (!entry || typeof entry !== "object") {
          return entry;
        }
        return {
          ...entry,
          placedExchange: "",
          placedLayOdds: "",
          placedMatchedStake: "",
          placementState: "pending",
        };
      })
    );
  } catch {
    return "[]";
  }
}

function buildTargetPayload(source: SourceSportsbookBet, draft: TargetDraft) {
  return {
    event_name: source.event_name,
    offer_text: source.offer_text,
    bookmaker: source.bookmaker,
    offer_type: source.offer_type,
    bet_type: source.bet_type,
    offer_name: source.offer_name,
    fixture_type: source.fixture_type,
    market: source.market,
    status: draft.status,
    result: "Pending",
    back_stake: draft.back_stake,
    back_odds: draft.back_odds,
    bonus_trigger: source.bonus_trigger,
    maximum_bonus: source.maximum_bonus,
    bonus_retention_rate: source.bonus_retention_rate,
    match_strategy: draft.match_strategy,
    lay_odds_1: draft.lay_odds_1,
    multi_lay_outcome_1_name: source.multi_lay_outcome_1_name,
    multi_lay_outcomes_json: clearMultiLayPlacementState(source.multi_lay_outcomes_json),
    lay_actual: draft.lay_actual,
    lay_matched_stake_1: draft.lay_matched_stake_1,
    lay_commission_1: "",
    exchange_name: draft.exchange_name,
    date_settled: fromDateTimeLocalValue(draft.date_settled),
    user_notes: "",
    manual_override_value: "",
    manual_override_reason: "",
  };
}

export function MultiProfileSportsbookCopyDialog({
  profileId,
  source,
  onClose,
  onComplete,
}: {
  profileId: string;
  source: SourceSportsbookBet;
  onClose: () => void;
  onComplete: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const [targets, setTargets] = useState<CopyTarget[]>([]);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<"select" | "review" | "complete">("select");
  const [batchId, setBatchId] = useState("");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [draft, setDraft] = useState<TargetDraft | null>(null);
  const [results, setResults] = useState<CopyResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  useDialogFocusLifecycle(true, dialogRef);

  const selectedTargets = useMemo(
    () => selectedTargetIds.map((id) => targets.find((target) => target.profile_id === id)).filter(Boolean) as CopyTarget[],
    [selectedTargetIds, targets]
  );
  const currentTarget = selectedTargets[reviewIndex] ?? null;

  const closeDialog = useCallback(async () => {
    if (batchId && phase === "review") {
      await fetch(
        `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${source.sportsbook_bet_id}/copy-batches/${batchId}/cancel`,
        { method: "POST" }
      );
    }
    onClose();
  }, [batchId, onClose, phase, profileId, source.sportsbook_bet_id]);

  useEffect(() => {
    let active = true;
    void fetch(
      `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${source.sportsbook_bet_id}/copy-targets`,
      { cache: "no-store" }
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await response.text());
        }
        return (await response.json()) as CopyTarget[];
      })
      .then((nextTargets) => {
        if (active) {
          setTargets(nextTargets);
          setIsLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load target profiles.");
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [profileId, source.sportsbook_bet_id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void closeDialog();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDialog]);

  async function createBatch() {
    if (selectedTargetIds.length === 0) {
      return;
    }
    setIsSubmitting(true);
    setErrorMessage("");
    const response = await fetch(
      `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${source.sportsbook_bet_id}/copy-batches`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_profile_ids: selectedTargetIds }),
      }
    );
    if (!response.ok) {
      setErrorMessage(await response.text());
      setIsSubmitting(false);
      return;
    }
    const created = (await response.json()) as { batch_id: string };
    setBatchId(created.batch_id);
    setReviewIndex(0);
    setDraft(createTargetDraft(source, selectedTargets[0]));
    setPhase("review");
    setIsSubmitting(false);
  }

  function advance(result: CopyResult) {
    const nextResults = [...results, result];
    setResults(nextResults);
    if (reviewIndex + 1 >= selectedTargets.length) {
      setPhase("complete");
      setDraft(null);
      return;
    }
    setDraft(createTargetDraft(source, selectedTargets[reviewIndex + 1]));
    setReviewIndex((current) => current + 1);
  }

  async function submitTarget() {
    if (!currentTarget || !draft) {
      return;
    }
    setIsSubmitting(true);
    setErrorMessage("");
    const response = await fetch(
      `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${source.sportsbook_bet_id}/copy-batches/${batchId}/targets/${currentTarget.profile_id}/submit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildTargetPayload(source, draft)),
      }
    );
    if (!response.ok) {
      setErrorMessage(await response.text());
      setIsSubmitting(false);
      return;
    }
    const created = (await response.json()) as {
      sportsbook_bet: { sportsbook_bet_id: string };
    };
    setIsSubmitting(false);
    advance({
      profileId: currentTarget.profile_id,
      displayName: currentTarget.display_name,
      state: "Created",
      sportsbookBetId: created.sportsbook_bet.sportsbook_bet_id,
    });
  }

  async function skipTarget() {
    if (!currentTarget) {
      return;
    }
    setIsSubmitting(true);
    setErrorMessage("");
    const response = await fetch(
      `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${source.sportsbook_bet_id}/copy-batches/${batchId}/targets/${currentTarget.profile_id}/skip`,
      { method: "POST" }
    );
    if (!response.ok) {
      setErrorMessage(await response.text());
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    advance({
      profileId: currentTarget.profile_id,
      displayName: currentTarget.display_name,
      state: "Skipped",
    });
  }

  const canSubmitTarget = Boolean(
    draft &&
      draft.back_stake.trim() &&
      draft.back_odds.trim() &&
      (draft.match_strategy === "No Lay" ||
        (draft.exchange_name && draft.lay_odds_1.trim()))
  );

  return (
    <div className="modal-backdrop modal-backdrop-elevated" onClick={() => void closeDialog()}>
      <section
        aria-label="Copy sportsbook bet to profiles"
        aria-modal="true"
        className="modal-panel multi-profile-copy-dialog"
        data-pd-id="multi-profile-entry.dialog"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="modal-sticky-header workflow-panel-header">
          <div className="stack">
            <span className="eyebrow">Multi-profile entry</span>
            <strong>Copy to profiles</strong>
            <span>{source.offer_text || source.event_name}</span>
          </div>
          <button
            aria-label="Close multi-profile copy dialog"
            className="modal-close-button"
            data-initial-focus
            onClick={() => void closeDialog()}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="multi-profile-copy-content stack">
          {isLoading ? (
            <div className="material-linear-progress" role="status" aria-label="Loading profile eligibility" />
          ) : null}
          {errorMessage ? <p className="field-validation-text" role="alert">{errorMessage}</p> : null}

          {phase === "select" && !isLoading ? (
            <>
              <div className="multi-profile-source-summary">
                <span><strong>Bookmaker</strong>{source.bookmaker}</span>
                <span><strong>Event</strong>{source.event_name}</span>
                <span><strong>Offer</strong>{source.offer_type}</span>
              </div>
              <div className="multi-profile-target-list" role="group" aria-label="Target profiles">
                {targets.map((target) => (
                  <label className={`multi-profile-target-row${target.eligible ? "" : " is-blocked"}`} key={target.profile_id}>
                    <input
                      checked={selectedTargetIds.includes(target.profile_id)}
                      disabled={!target.eligible}
                      onChange={(event) => {
                        setSelectedTargetIds((current) =>
                          event.target.checked
                            ? [...current, target.profile_id]
                            : current.filter((id) => id !== target.profile_id)
                        );
                      }}
                      type="checkbox"
                    />
                    <span>
                      <strong>{target.display_name}</strong>
                      <small>{target.profile_code} · {target.bookmaker_account_status}</small>
                    </span>
                    <span className={`review-chip ${target.eligible ? "review-chip-action-positive" : "review-chip-action-negative"}`}>
                      {target.state}
                    </span>
                    {!target.eligible ? <small>{target.reasons.join(" · ")}</small> : null}
                  </label>
                ))}
                {targets.length === 0 ? <p>No other profiles are available.</p> : null}
              </div>
            </>
          ) : null}

          {phase === "review" && currentTarget && draft ? (
            <>
              <div className="workflow-panel-header">
                <div className="stack">
                  <span className="eyebrow">Profile {reviewIndex + 1} of {selectedTargets.length}</span>
                  <strong>{currentTarget.display_name}</strong>
                  <span>{currentTarget.profile_code} · {currentTarget.bookmaker_account_status}</span>
                </div>
              </div>
              <div className="multi-profile-locked-identity">
                <span><strong>Bookmaker</strong>{source.bookmaker}</span>
                <span><strong>Event</strong>{source.event_name}</span>
                <span><strong>Offer</strong>{source.offer_text || source.offer_type}</span>
              </div>
              <div className="form-grid">
                <label className="field-control">
                  <span>Back stake</span>
                  <input inputMode="decimal" onChange={(event) => setDraft({ ...draft, back_stake: event.target.value })} value={draft.back_stake} />
                </label>
                <label className="field-control">
                  <span>Back odds</span>
                  <input inputMode="decimal" onChange={(event) => setDraft({ ...draft, back_odds: event.target.value })} value={draft.back_odds} />
                </label>
                <label className="field-control">
                  <span>Strategy</span>
                  <select onChange={(event) => setDraft({ ...draft, match_strategy: event.target.value })} value={draft.match_strategy}>
                    {sportsbookStrategyOptions.filter((option) => option !== "Multilay-Underlay").map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <label className="field-control">
                  <span>Exchange</span>
                  <select disabled={draft.match_strategy === "No Lay"} onChange={(event) => setDraft({ ...draft, exchange_name: event.target.value })} value={draft.exchange_name}>
                    <option value="">Select target exchange</option>
                    {currentTarget.exchange_options.map((option) => <option key={option.exchange_name} value={option.exchange_name}>{option.exchange_name} · {Number(option.commission_rate) * 100}%</option>)}
                  </select>
                </label>
                <label className="field-control">
                  <span>Lay odds</span>
                  <input disabled={draft.match_strategy === "No Lay"} inputMode="decimal" onChange={(event) => setDraft({ ...draft, lay_odds_1: event.target.value })} value={draft.lay_odds_1} />
                </label>
                <label className="field-control">
                  <span>Actual lay stake</span>
                  <input disabled={draft.match_strategy === "No Lay"} inputMode="decimal" onChange={(event) => setDraft({ ...draft, lay_actual: event.target.value, lay_matched_stake_1: event.target.value })} value={draft.lay_actual} />
                </label>
                <label className="field-control">
                  <span>Settles</span>
                  <input onChange={(event) => setDraft({ ...draft, date_settled: event.target.value })} type="datetime-local" value={draft.date_settled} />
                </label>
                <label className="field-control">
                  <span>Status</span>
                  <select onChange={(event) => setDraft({ ...draft, status: event.target.value })} value={draft.status}>
                    {sportsbookStatusOptions
                      .filter((option) => ["Prospecting", "Not Placed", "Placed"].includes(option))
                      .map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
              </div>
            </>
          ) : null}

          {phase === "complete" ? (
            <div className="stack" role="status">
              <strong>Copy review complete</strong>
              {results.map((result) => (
                <div className="multi-profile-result-row" key={result.profileId}>
                  <span>{result.displayName}</span>
                  <span className="review-chip review-chip-state-muted">{result.state}</span>
                  <span>{result.sportsbookBetId ?? "No row created"}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <footer className="modal-sticky-footer">
          <button className="button-link" onClick={() => void closeDialog()} type="button">Close</button>
          {phase === "select" ? (
            <button className="modal-primary-button" disabled={selectedTargetIds.length === 0 || isSubmitting} onClick={() => void createBatch()} type="button">
              Review {selectedTargetIds.length || ""} selected profile{selectedTargetIds.length === 1 ? "" : "s"}
            </button>
          ) : null}
          {phase === "review" ? (
            <div className="tracker-nav">
              <button className="button-link" disabled={isSubmitting} onClick={() => void skipTarget()} type="button">Skip this profile</button>
              <button className="modal-primary-button" disabled={!canSubmitTarget || isSubmitting} onClick={() => void submitTarget()} type="button">
                Submit for {currentTarget?.display_name}
              </button>
            </div>
          ) : null}
          {phase === "complete" ? (
            <button className="modal-primary-button" onClick={() => {
              const createdCount = results.filter((result) => result.state === "Created").length;
              onComplete(`Created ${createdCount} sportsbook ${createdCount === 1 ? "row" : "rows"} across selected profiles.`);
            }} type="button">Done</button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}
