"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useLayoutEffect, useRef, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { ModalBoundary } from "@/components/modal-boundary";
import { DesignBetWorkbenchContext, DesignBetWorkbenchGrid, DesignBetWorkbenchLeg, DesignBetWorkbenchPlacementDetails, DesignBetWorkbenchProtectedActions, DesignBetWorkbenchProtectedNotice, DesignBetWorkbenchRecordedLegs, DesignBetWorkbenchStageRail, DesignBetWorkbenchSummary, DesignCumulativeLayCellFields } from "@/components/design-bet-workbench-presentation";
import { LedgerFloatingCellEditor, useLedgerCellEditor } from "@/components/ledger-floating-cell-editor";
import { LedgerCellReviewPopover } from "@/components/ledger-cell-review-popover";
import { DesignPageHead } from "@/components/design-ledger-screen";
import { DesignLabSelect } from "@/components/design-lab-select";
import { DesignOfferDetailsCellFields } from "@/components/design-offer-details-cell-fields";
import { formatFinancialValue } from "@/lib/financial-display";
import { normalizeMoneyInput } from "@/lib/decimal-input";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { formatCompactLedgerDate } from "@/lib/ledger-compact-date";
import { getPartialLayExecutionSummary } from "@/lib/sportsbook-table-workflow";
import { sportsbookComparisonScenarios } from "@/lib/sportsbook-outcome-comparison";
import { labDestinations } from "@/lib/design-lab-navigation";
import lab from "@/components/design-lab-connected.module.css";
import local from "@/components/design-lab-sportsbook-proposals.module.css";

export type SportsbookProposalId = "protected" | "offer" | "requirements" | "matching" | "finish" | "operations";

const choices: { id: SportsbookProposalId; label: string; stage: number }[] = [
  { id: "protected", label: "1 · Protected records", stage: 4 },
  { id: "offer", label: "2 · Additional Offer details", stage: 0 },
  { id: "requirements", label: "3 · Requirements and outcomes", stage: 1 },
  { id: "matching", label: "4 · Matching and Placement", stage: 2 },
  { id: "finish", label: "5 · Finish / Review", stage: 4 },
  { id: "operations", label: "Ledger warnings and partial lay · proposal", stage: 3 },
];
const stages = ["Offer", "Requirements", "Matching", "Placement", "Finish / Review"];
function Icon({ children }: { children: string }) { return <span aria-hidden="true" className="material-symbols-outlined">{children}</span>; }
function money(value: string) { return formatFinancialValue(Number(value)); }
type PreviewLayLeg = { exchange: string; odds: string; matchedStake: string };
const warningPreviewRows = [
  { key: "profile-a::DEMO-001", profile: "Profile A", record: "DEMO-001", event: "Arsenal v Chelsea", bookmaker: "Matchbook", settles: "2026-11-20T18:54", warnings: 3 },
  { key: "profile-b::DEMO-002", profile: "Profile B", record: "DEMO-002", event: "Ipswich Town v Norwich City", bookmaker: "Bookmaker B", settles: "2026-11-21T15:00", warnings: 1 },
  { key: "profile-a::DEMO-003", profile: "Profile A", record: "DEMO-003", event: "Brighton v Fulham", bookmaker: "Bookmaker A", settles: "2026-11-22T17:30", warnings: 2 },
  { key: "profile-b::DEMO-004", profile: "Profile B", record: "DEMO-004", event: "Leeds United v Sunderland", bookmaker: "Bookmaker B", settles: "2026-11-23T20:00", warnings: 0 },
] as const;
type WarningPreviewRow = (typeof warningPreviewRows)[number];
type WarningPreviewKey = WarningPreviewRow["key"];

/** Separate, synthetic proposal state. The approved /design-lab route is untouched. */
export function DesignLabSportsbookProposals({ initialAmendment, initialPartialLegOpen = false }: { initialAmendment: SportsbookProposalId; initialPartialLegOpen?: boolean }) {
  const router = useRouter();
  const [amendment, setAmendment] = useState(initialAmendment);
  const [stage, setStage] = useState(initialPartialLegOpen ? 3 : choices.find(choice => choice.id === initialAmendment)?.stage ?? 4);
  const [scope, setScope] = useState("all");
  const [bookmaker, setBookmaker] = useState("Bookmaker A");
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [trackerExpanded, setTrackerExpanded] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [correction, setCorrection] = useState(false);
  const [reviewClosed, setReviewClosed] = useState(false);
  const [offerError, setOfferError] = useState(false);
  const [offerDetailsOpen, setOfferDetailsOpen] = useState(false);
  const [outcomeState, setOutcomeState] = useState<"ordinary" | "exceptional" | "unavailable">("ordinary");
  const [fillState, setFillState] = useState<"standard" | "partial">(initialPartialLegOpen || initialAmendment === "operations" ? "partial" : "standard");
  const [requestedLayRecorded, setRequestedLayRecorded] = useState(true);
  const [requestedLayStake, setRequestedLayStake] = useState("8.00");
  const [matchedLayDraft, setMatchedLayDraft] = useState(initialPartialLegOpen ? "" : "5.00");
  const [backConfirmed, setBackConfirmed] = useState(initialPartialLegOpen);
  const [actualBackStakeDraft, setActualBackStakeDraft] = useState("10.00");
  const [acceptedBackOddsDraft, setAcceptedBackOddsDraft] = useState("2.00");
  const [recordedLegs, setRecordedLegs] = useState<PreviewLayLeg[]>(initialPartialLegOpen
    ? [{ exchange: "Matchbook", odds: "2.00", matchedStake: "5.00" }]
    : initialAmendment === "operations" ? [{ exchange: "Matchbook", odds: "2.00", matchedStake: "5.00" }] : []);
  const [cumulativeDraft, setCumulativeDraft] = useState("5.00");
  const [cumulativeError, setCumulativeError] = useState("");
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const previewCellEditor = useLedgerCellEditor();
  const previewSelectorEditor = useLedgerCellEditor();
  const [strategyValue, setStrategyValue] = useState("Standard");
  const [strategyDraft, setStrategyDraft] = useState("Standard");
  const [offerCellValue, setOfferCellValue] = useState({ offerType: "Bet & Get", betType: "Single", fixtureType: "Football" });
  const [offerCellDraft, setOfferCellDraft] = useState(offerCellValue);
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null);
  const [blockedPreviewAnchor, setBlockedPreviewAnchor] = useState<HTMLElement | null>(null);
  const layCellRef = useRef<HTMLButtonElement>(null);
  const [activeWarningKey, setActiveWarningKey] = useState<string | null>(null);
  const [warningQuery, setWarningQuery] = useState("");
  const [warningSort, setWarningSort] = useState<"recorded" | "event">("recorded");
  const [warningPage, setWarningPage] = useState(1);
  const [warningPageSize, setWarningPageSize] = useState(4);
  const [warningDateDrafts, setWarningDateDrafts] = useState<Record<string, string>>({});
  const [warningDateValues, setWarningDateValues] = useState<Record<string, string>>({});
  const [editingWarningDateKey, setEditingWarningDateKey] = useState<string | null>(null);
  const [operationReviewKey, setOperationReviewKey] = useState<WarningPreviewKey>("profile-a::DEMO-001");
  const [secondaryOperationDrafts, setSecondaryOperationDrafts] = useState<Record<string, { request: string; backStake: string; backOdds: string; status: string; result: string }>>({});
  const warningTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [operationWorkbenchOpen, setOperationWorkbenchOpen] = useState(initialPartialLegOpen);
  const [operationWarningFocus, setOperationWarningFocus] = useState<"request" | "back" | "status" | "match" | null>(null);
  const [operationBaseline, setOperationBaseline] = useState<string | null>(null);
  const [operationExitConfirm, setOperationExitConfirm] = useState(false);
  const [savedOperationDrafts, setSavedOperationDrafts] = useState<Record<string, { request: string; backStake: string; backOdds: string; status: string; result: string }>>({});
  const ledgerReturnScroll = useRef({ page: 0, table: 0 });
  const [operationAction, setOperationAction] = useState<"back" | "status" | null>(null);
  const [finishStatusDraft, setFinishStatusDraft] = useState("Placed");
  const [finishResultDraft, setFinishResultDraft] = useState("Pending");
  const [legReviewOpen, setLegReviewOpen] = useState<number | null>(initialPartialLegOpen || initialAmendment === "operations" ? 0 : null);
  const [reminderActive, setReminderActive] = useState(false);
  const [reversalPending, setReversalPending] = useState(false);
  const [backReversalPending, setBackReversalPending] = useState(false);
  const [linked, setLinked] = useState(true);
  const [finishMode, setFinishMode] = useState<"existing" | "new">("existing");
  const [notice, setNotice] = useState("");
  const marketRef = useRef<HTMLInputElement>(null);
  const placementPreviewRef = useRef<HTMLDivElement>(null);
  const operationWorkbenchRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (initialPartialLegOpen) placementPreviewRef.current?.querySelector<HTMLDetailsElement>('[data-pd-id="sportsbook.workbench.partial-fill"]')?.setAttribute("open", "");
  }, [initialPartialLegOpen]);
  useLayoutEffect(() => {
    if (!operationWorkbenchOpen || !quickActionOpen) return;
    const field = operationWorkbenchRef.current?.querySelector<HTMLInputElement>('[data-pd-id="lab.proposal.quick-action"] input');
    field?.scrollIntoView({ block: "center" });
    field?.focus({ preventScroll: true });
  }, [operationWorkbenchOpen, quickActionOpen]);
  const laySummary = getPartialLayExecutionSummary({
    explicitTargetLayStake: requestedLayRecorded ? requestedLayStake : "",
    suggestedTargetLayStake: "",
    legs: recordedLegs,
  });
  const warningCount = Number(!requestedLayRecorded || !laySummary.hasReachedTarget) + Number(!backConfirmed) + 1;
  const warningCountForRow = (row: WarningPreviewRow) => row.key === "profile-a::DEMO-001" ? warningCount : row.warnings === 2 && savedOperationDrafts[row.key]?.request ? 1 : row.warnings;
  const filteredWarningRows = warningPreviewRows.filter(row =>
    (scope === "all" || row.key.startsWith(scope + "::")) &&
    (row.event.toLowerCase().includes(warningQuery.toLowerCase()) || row.profile.toLowerCase().includes(warningQuery.toLowerCase()) || row.record.toLowerCase().includes(warningQuery.toLowerCase())));
  const committedWarningDate = (row: WarningPreviewRow) => warningDateValues[row.key] ?? row.settles;
  const sortedWarningRows = [...filteredWarningRows].sort((a, b) => warningSort === "event"
    ? a.event.localeCompare(b.event)
    : committedWarningDate(a).localeCompare(committedWarningDate(b)));
  const warningPageCount = Math.max(1, Math.ceil(sortedWarningRows.length / warningPageSize));
  const visibleWarningRows = sortedWarningRows.slice((Math.min(warningPage, warningPageCount) - 1) * warningPageSize, Math.min(warningPage, warningPageCount) * warningPageSize);
  const genericWorkbenchRow = filteredWarningRows.find(row => row.key === activeWarningKey) ?? visibleWarningRows[0] ?? null;
  const activeOperationRow = warningPreviewRows.find(row => row.key === operationReviewKey) ?? warningPreviewRows[0];
  const secondaryOperationDraft = secondaryOperationDrafts[operationReviewKey] ?? {
    request: activeOperationRow.warnings === 2 ? "" : "8.00",
    backStake: activeOperationRow.warnings === 1 ? "" : "10.00",
    backOdds: activeOperationRow.warnings === 1 ? "" : "2.00",
    status: "Placed",
    result: "Pending",
  };
  const updateSecondaryOperationDraft = (field: keyof typeof secondaryOperationDraft, value: string) =>
    setSecondaryOperationDrafts(current => ({ ...current, [operationReviewKey]: { ...secondaryOperationDraft, [field]: value } }));
  const operationSnapshot = (rowKey: WarningPreviewKey) => JSON.stringify(rowKey === "profile-a::DEMO-001"
    ? { rowKey, requestedLayRecorded, requestedLayStake, actualBackStakeDraft, acceptedBackOddsDraft, backConfirmed, recordedLegs, finishStatusDraft, finishResultDraft }
    : { rowKey, draft: secondaryOperationDrafts[rowKey] ?? { request: warningPreviewRows.find(row => row.key === rowKey)?.warnings === 2 ? "" : "8.00", backStake: warningPreviewRows.find(row => row.key === rowKey)?.warnings === 1 ? "" : "10.00", backOdds: warningPreviewRows.find(row => row.key === rowKey)?.warnings === 1 ? "" : "2.00", status: "Placed", result: "Pending" } });
  const backStake = normalizeMoneyInput(actualBackStakeDraft.trim());
  const backEvidenceAvailable = backStake !== null && backStake !== "" && Number(backStake) > 0 && /^\d+(?:\.\d{1,2})?$/.test(acceptedBackOddsDraft.trim()) && Number(acceptedBackOddsDraft) > 1;
  const openOperationStage = (rowKey: WarningPreviewKey, nextStage: number, focus: "request" | "back" | "status" | "match" | null = null) => {
    if (!warningPreviewRows.some(row => row.key === rowKey) || (scope !== "all" && !rowKey.startsWith(`${scope}::`))) return;
    ledgerReturnScroll.current = { page: window.scrollY, table: document.querySelector<HTMLElement>('[data-pd-id="lab.proposal.table-scroll"]')?.scrollLeft ?? 0 };
    setOperationBaseline(operationSnapshot(rowKey));
    setOperationReviewKey(rowKey);
    setActiveWarningKey(rowKey);
    setOperationWarningFocus(focus);
    setStage(nextStage);
    setOperationWorkbenchOpen(true);
    setOperationAction(null);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => {
      if (!focus) { operationWorkbenchRef.current?.scrollIntoView({ block: "start" }); return; }
      const target = operationWorkbenchRef.current?.querySelector<HTMLElement>(`[data-operation-focus="${focus}"]`);
      target?.scrollIntoView({ block: "center" });
      target?.focus({ preventScroll: true });
    });
  };
  const restoreOperationBaseline = () => {
    if (!operationBaseline) return;
    const saved = JSON.parse(operationBaseline);
    if (saved.rowKey === "profile-a::DEMO-001") {
      setRequestedLayRecorded(saved.requestedLayRecorded); setRequestedLayStake(saved.requestedLayStake);
      setActualBackStakeDraft(saved.actualBackStakeDraft); setAcceptedBackOddsDraft(saved.acceptedBackOddsDraft);
      setBackConfirmed(saved.backConfirmed); setRecordedLegs(saved.recordedLegs);
      setFinishStatusDraft(saved.finishStatusDraft); setFinishResultDraft(saved.finishResultDraft);
    } else if (saved.draft) setSecondaryOperationDrafts(current => ({ ...current, [saved.rowKey]: saved.draft }));
  };
  const closeOperationWorkbench = () => {
    setOperationWorkbenchOpen(false);
    setOperationWarningFocus(null);
    setQuickActionOpen(false);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[data-pd-id="lab.proposal.table-scroll"]')?.scrollTo({ left: ledgerReturnScroll.current.table });
      window.scrollTo({ top: ledgerReturnScroll.current.page, behavior: "instant" });
      warningTriggerRefs.current[operationReviewKey]?.focus({ preventScroll: true });
    }));
  };
  const saveOperationDraft = async () => {
    if (operationReviewKey !== "profile-a::DEMO-001") setSavedOperationDrafts(current => ({ ...current, [operationReviewKey]: secondaryOperationDraft }));
    setOperationBaseline(operationSnapshot(operationReviewKey));
    setNotice("Synthetic review saved; no financial source record changed.");
    return true;
  };
  const operationDirty = Boolean(amendment === "operations" && operationWorkbenchOpen && operationBaseline && operationBaseline !== operationSnapshot(operationReviewKey));
  useUnsavedChangesGuard(operationDirty, {
    title: "You have unsaved Sportsbook changes.",
    message: "Keep editing, save this synthetic review, or discard its unsaved fields.",
    onDiscard: restoreOperationBaseline,
    onSaveAndClose: saveOperationDraft,
  });
  const cancelOperationWorkbench = () => { if (operationDirty) setOperationExitConfirm(true); else closeOperationWorkbench(); };
  const openCumulativeEditor = (rowKey: WarningPreviewKey, anchor?: HTMLElement | null) => {
    if (rowKey !== "profile-a::DEMO-001" || (scope !== "all" && !rowKey.startsWith(`${scope}::`))) return;
    setOperationReviewKey(rowKey);
    setCumulativeDraft(current => current.trim() ? current : laySummary.matchedTotal.toFixed(2));
    setCumulativeError("");
    if (anchor && requestedLayRecorded && !laySummary.hasReachedTarget) {
      setOperationWorkbenchOpen(false);
      previewCellEditor.start("lay_status", anchor);
      return;
    }
    if (!requestedLayRecorded) { openOperationStage(rowKey, 3, "request"); return; }
    setQuickActionOpen(true);
    openOperationStage(rowKey, 3, "match");
    // A double-click dispatches a second click after the first render. Restore
    // focus to the editor after that pointer event rather than the ledger cell.
    requestAnimationFrame(() => operationWorkbenchRef.current?.querySelector<HTMLInputElement>('[data-pd-id="lab.proposal.quick-action"] input')?.focus({ preventScroll: true }));
  };
  const confirmCumulativeEditor = (): boolean => {
    const canonical = normalizeMoneyInput(cumulativeDraft.trim());
    const request = normalizeMoneyInput(requestedLayStake.trim());
    if (!requestedLayRecorded || canonical === null || canonical === "" || request === null || request === "") {
      const message = "Matched so far needs a complete amount with at most two decimal places and a recorded Requested Lay Stake.";
      setCumulativeError(message); setNotice(message);
      return false;
    }
    const nextPence = Math.round(Number(canonical) * 100);
    const previousPence = Math.round(laySummary.matchedTotal * 100);
    const requestedPence = Math.round(Number(request) * 100);
    if (nextPence < previousPence || nextPence > requestedPence) {
      const message = `Enter a cumulative amount from the saved £${laySummary.matchedTotal.toFixed(2)} up to the £${Number(request).toFixed(2)} request. Downward changes require correction review.`;
      setCumulativeError(message); setNotice(message);
      return false;
    }
    const difference = nextPence - previousPence;
    if (difference > 0) setRecordedLegs(current => [...current, { exchange: "Matchbook", odds: "2.00", matchedStake: (difference / 100).toFixed(2) }]);
    setQuickActionOpen(false);
    setCumulativeError("");
    setNotice(difference > 0 ? `Synthetic £${(difference / 100).toFixed(2)} fill added; no source record changed.` : "Already recorded · no new fill added.");
    return true;
  };
  const layStatus = recordedLegs.length === 0 ? "Not recorded" : laySummary.hasReachedTarget ? "Fully matched" : "Partially matched";
  const nextMatchedValue = Number(matchedLayDraft);
  const canConfirmLay = !laySummary.hasReachedTarget && !laySummary.exceededTarget &&
    matchedLayDraft.trim() !== "" && Number.isFinite(nextMatchedValue) && nextMatchedValue > 0 &&
    (laySummary.remainingToMatch === null || nextMatchedValue <= laySummary.remainingToMatch);
  const updateLegDetail = (index: number, field: keyof PreviewLayLeg, value: string) => {
    setRecordedLegs(current => current.map((leg, currentIndex) => currentIndex === index ? { ...leg, [field]: value } : leg));
  };
  const renderLeg = (index: number, leg: PreviewLayLeg) => <DesignBetWorkbenchLeg dataPdId={`lab.proposal.leg-${index + 1}`} exchange={leg.exchange} index={index} key={index} matchedStake={leg.matchedStake} odds={leg.odds} onToggle={() => setLegReviewOpen(current => current === index ? null : index)} open={legReviewOpen === index}>
      <div className={lab.fieldPair}>
        <label>Exchange<select className={lab.placementLegSelect} onChange={event => updateLegDetail(index, "exchange", event.target.value)} value={leg.exchange}><option>Matchbook</option><option>Exchange A</option></select></label>
        <label>Lay odds<input inputMode="decimal" onChange={event => updateLegDetail(index, "odds", event.target.value)} value={leg.odds} /></label>
        <label>Matched stake<input inputMode="decimal" onChange={event => updateLegDetail(index, "matchedStake", event.target.value)} value={leg.matchedStake} /></label>
      </div>
  </DesignBetWorkbenchLeg>;

  const selectAmendment = (next: SportsbookProposalId) => {
    setAmendment(next);
    setStage(choices.find(choice => choice.id === next)?.stage ?? 4);
    setNotice("");
    window.history.replaceState(null, "", `/design-lab/sportsbook-proposals?amendment=${next}`);
  };
  const scenarioSource = outcomeState === "unavailable"
    ? { scenario_pnl_if_back_wins: null, scenario_pnl_if_lay_wins: null, scenario_pnl_if_outcome_2_wins: null, scenario_pnl_if_outcome_3_wins: null }
    : outcomeState === "exceptional"
      ? { scenario_pnl_if_back_wins: "-2.10", scenario_pnl_if_lay_wins: "1.75", scenario_pnl_if_outcome_2_wins: "0.00", scenario_pnl_if_outcome_3_wins: "8.20" }
      : { scenario_pnl_if_back_wins: "-0.45", scenario_pnl_if_lay_wins: "-0.65", scenario_pnl_if_outcome_2_wins: null, scenario_pnl_if_outcome_3_wins: null };
  const scenarios = sportsbookComparisonScenarios({ source: scenarioSource, labels: outcomeState === "exceptional"
    ? { back: "Player scores first but no further goals", lay: "Player does not score first", outcome2: "Player scores first and then scores again", outcome3: "Player scores first and gets a hat-trick" }
    : { back: "Back wins", lay: "Lay wins" } });
  const selectedRecord = amendment === "operations" ? { id: activeOperationRow.record, status: "Placed", offer: "Standard" }
    : outcomeState === "exceptional"
    ? { id: "DEMO-EXTRA", status: amendment === "protected" ? "Settled" : "Placed", offer: "Double Delight" }
    : outcomeState === "unavailable"
      ? { id: "DEMO-INCOMPLETE", status: amendment === "protected" ? "Settled" : "Prospecting", offer: "Standard" }
      : { id: amendment === "protected" ? "DEMO-PROTECTED" : "DEMO-001", status: amendment === "protected" ? "Settled" : "Placed", offer: "Standard" };
  const isNewFinish = amendment === "finish" && finishMode === "new";
  const outcomeUnavailable = outcomeState === "unavailable" || (amendment === "matching" && (fillState === "partial" || !requestedLayRecorded)) || (amendment === "operations" && activeOperationRow.key !== "profile-a::DEMO-001");
  const visibleScenarios = outcomeState === "exceptional" ? scenarios.slice(0, 2) : scenarios;
  const detailedScenarios = outcomeState === "exceptional" ? scenarios.slice(2) : [];

  return <div className={`${lab.lab} ${amendment === "operations" ? "lab-operations-preview" : ""}`} data-pd-id="lab.sportsbook-proposals.root" ref={setPortalTarget}>
    <a className={lab.skip} href="#lab-main">Skip to proposal</a>
    <div className={`${lab.frame} ${collapsed ? lab.collapsed : ""}`}>
      {mobileNav ? <button aria-label="Dismiss navigation" className={lab.navScrim} onClick={() => setMobileNav(false)} tabIndex={-1} type="button" /> : null}
      <aside aria-label="Design Lab proposal navigation" className={`${lab.sidebar} ${mobileNav ? lab.sidebarOpen : ""}`}>
        <div className={lab.brand}><BrandLogo variant="mark" /><span>Plum Duff <small>Design Lab</small></span><button aria-label="Close navigation" className={lab.sidebarClose} onClick={() => setMobileNav(false)} type="button"><Icon>close</Icon></button></div>
        <div className={lab.navGroup}><p>Fund Manager</p><nav aria-label="Primary destinations">
          {labDestinations.filter(item => item.group === "primary").map(item => item.id === "tracker" ? <div key={item.id}>
            <div className={`${lab.trackerNav} ${lab.navGroupActive}`}>
              <button className={lab.navActive} onClick={() => router.push("/design-lab")} title="Tracker overview" type="button"><Icon>{item.icon}</Icon><span>{item.label}</span></button>
              <button aria-controls="proposal-tracker-destinations" aria-expanded={trackerExpanded} aria-label={trackerExpanded ? "Collapse Tracker" : "Expand Tracker"} className={lab.trackerExpand} onClick={() => setTrackerExpanded(value => !value)} type="button"><Icon>{trackerExpanded ? "expand_less" : "expand_more"}</Icon></button>
            </div>
            {trackerExpanded ? <div className={lab.trackerChildren} id="proposal-tracker-destinations">{labDestinations.filter(child => child.group === "tracker").map(child => <button aria-current={child.id === "sportsbook" ? "page" : undefined} className={child.id === "sportsbook" ? lab.navActive : undefined} key={child.id} onClick={() => router.push("/design-lab")} title={child.label} type="button"><Icon>{child.icon}</Icon><span>{child.label}</span></button>)}</div> : null}
          </div> : <button key={item.id} onClick={() => router.push("/design-lab")} type="button"><Icon>{item.icon}</Icon><span>{item.label}</span></button>)}
        </nav></div>
        <div className={lab.navGroup}><button aria-expanded={showMore} className={lab.moreButton} onClick={() => setShowMore(value => !value)} type="button"><Icon>{showMore ? "expand_less" : "expand_more"}</Icon><span>See More</span></button>{showMore ? <nav aria-label="Less frequent destinations"><button onClick={() => router.push("/design-lab")} type="button"><Icon>settings</Icon><span>Settings</span></button></nav> : null}</div>
        <div className={lab.navFooter}>Synthetic data · no owner writes</div>
      </aside>
      <div className={lab.workspace}>
        <header className={lab.header} data-pd-id="lab.proposal.header">
          <div className={lab.headerLeft}><div className={lab.headerIdentity}>
            <button aria-expanded={mobileNav} aria-label={mobileNav ? "Close navigation" : "Open navigation"} className={`${lab.iconButton} ${lab.navToggle}`} onClick={() => setMobileNav(value => !value)} type="button"><Icon>menu</Icon></button>
            <button aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} className={`${lab.iconButton} ${lab.collapseButton}`} onClick={() => setCollapsed(value => !value)} type="button"><Icon>{collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}</Icon></button>
            <strong className={lab.headerTitle}>Fund Manager</strong>
          </div><div className={lab.profileSelect}><DesignLabSelect compact dataPdId="lab.proposal.profile" disabled={amendment === "operations" && operationWorkbenchOpen} label="Profile" onChange={value => { setScope(value); setActiveWarningKey(null); setOperationWorkbenchOpen(false); setOperationAction(null); setWarningPage(1); }} options={[{ value: "all", label: "All Profiles" }, { value: "profile-a", label: "Profile A" }, { value: "profile-b", label: "Profile B" }]} value={scope} /></div></div>
          <div className={lab.headerRight}>
            <div className={`${lab.searchBox} ${searchOpen ? lab.searchExpanded : ""}`} role="search"><Icon>search</Icon><input aria-label="Search synthetic proposal" placeholder="Search" type="search" /></div>
            <button aria-label="Open search" className={`${lab.iconButton} ${lab.mobileSearch}`} onClick={() => setSearchOpen(value => !value)} type="button"><Icon>search</Icon></button>
            <button aria-label="Preview notifications" data-pd-id="lab.header-trigger.notifications" className={`${lab.iconButton} ${lab.notificationTrigger}`} onClick={() => setNotice("Synthetic notification preview only.")} type="button"><Icon>notifications</Icon><span aria-hidden="true" className={lab.notificationCount}>2</span></button>
            <button aria-label="Preview tracked tasks" data-pd-id="lab.header-trigger.tracked" className={`${lab.iconButton} ${lab.notificationTrigger}`} onClick={() => setNotice("Synthetic tracked-task preview only.")} type="button"><Icon>task_alt</Icon><span aria-hidden="true" className={`${lab.notificationCount} ${lab.trackedCount}`}>1</span></button>
            <button aria-label="Open approved Lab help" data-pd-id="lab.header-trigger.help" className={`${lab.iconButton} ${lab.helpButton}`} onClick={() => router.push("/design-lab")} type="button"><Icon>help</Icon></button>
            <button aria-label="Open approved Lab launcher" data-pd-id="lab.header-trigger.launcher" className={lab.iconButton} onClick={() => router.push("/design-lab")} type="button"><Icon>apps</Icon></button>
            <button aria-label="Open approved Lab account menu" data-pd-id="lab.header-trigger.identity" className={`${lab.iconButton} ${lab.avatarButton}`} onClick={() => router.push("/design-lab")} type="button">L</button>
          </div>
        </header>
        <nav aria-label="Breadcrumb" className={lab.breadcrumb} data-pd-id="lab.proposal.breadcrumb"><span className={lab.crumb}><Link href="/design-lab">Position</Link></span><span className={lab.crumb}><Icon>chevron_right</Icon><Link href="/design-lab">Tracker</Link></span><span className={lab.crumb}><Icon>chevron_right</Icon>{amendment === "operations" && operationWorkbenchOpen ? <button onClick={() => void cancelOperationWorkbench()} type="button">Sportsbook Bets</button> : <span aria-current={amendment === "operations" ? "page" : undefined}>Sportsbook Bets</span>}</span>{amendment !== "operations" || operationWorkbenchOpen ? <span className={lab.crumb}><Icon>chevron_right</Icon><span aria-current="page">Bet details · proposal</span></span> : null}<span className={lab.labBadge}>LAB · proposal</span></nav>
        <main className={lab.main} data-pd-id="lab.proposal.main" id="lab-main">
          <DesignPageHead><div><h1>{amendment === "operations" ? operationWorkbenchOpen ? `Edit Sportsbook Bet · ${activeOperationRow.record}` : "Sportsbook Bets" : isNewFinish ? "New Sportsbook Bet" : `Edit Sportsbook Bet · ${selectedRecord.id}`}</h1><p>{amendment === "operations" && !operationWorkbenchOpen ? "Review recorded warnings and open the owning bet." : "Offer first · prepare and confirm external placement later"}</p></div><div className={lab.headActions}><Link className={lab.linkButton} href="/design-lab">Approved Lab</Link></div></DesignPageHead>
          {amendment !== "operations" || !operationWorkbenchOpen ? <><p className={local.previewNotice}><strong>{amendment === "matching" && fillState === "partial" ? "Partial-fill leg layout proposed for approval." : "Five Sportsbook presentation decisions approved for PD adoption."}</strong> This separate preview uses synthetic records and simulated actions only. The frozen Design Lab remains available from the link above.</p>
          <nav aria-label="Choose amendment" className={local.choiceRow}>{choices.map(choice => <a aria-current={amendment === choice.id ? "page" : undefined} href={`?amendment=${choice.id}`} key={choice.id} onClick={event => { event.preventDefault(); selectAmendment(choice.id); }}>{choice.label}</a>)}</nav></> : null}
          {amendment === "operations" && !operationWorkbenchOpen ? <section aria-label="Proposed Sportsbook ledger row" className={`${local.proposalLedger} lab-ledger-amendment`} data-pd-id="lab.proposal.ledger">
            <div className={local.proposalLedgerHeading}><div><h2>Sportsbook Bets</h2><p>4 synthetic records · planned £10.00 · requested {requestedLayRecorded ? `£${Number(requestedLayStake).toFixed(2)}` : "Not recorded"}</p></div><button className={lab.secondaryButton} disabled={!genericWorkbenchRow} onClick={() => { if (genericWorkbenchRow) openOperationStage(genericWorkbenchRow.key, 3); }} type="button">Open Bet Workbench</button></div>
            <div className={local.previewControls}>
              <label>Search proposal rows<input aria-label="Search proposal rows" onChange={event => { setWarningQuery(event.target.value); setWarningPage(1); setActiveWarningKey(null); }} value={warningQuery} /></label>
              <label>Sort proposal rows<select aria-label="Sort proposal rows" onChange={event => { setWarningSort(event.target.value as "recorded" | "event"); setActiveWarningKey(null); setWarningPage(1); }} value={warningSort}><option value="recorded">Recorded date</option><option value="event">Event name</option></select></label>
              <label>Rows per page<select aria-label="Rows per page" onChange={event => { setWarningPageSize(Number(event.target.value)); setWarningPage(1); setActiveWarningKey(null); }} value={warningPageSize}><option value={4}>4</option><option value={2}>2</option></select></label>
            </div>
            <div className={local.proposalTableScroll} data-pd-id="lab.proposal.table-scroll"><table><thead><tr><th scope="col">Settles</th><th scope="col">Event Name</th><th scope="col">Bookmaker</th><th scope="col">Offer Details</th><th scope="col">Strategy</th><th scope="col">Back Bet</th><th scope="col">Lay Bet</th><th scope="col">Status</th></tr></thead><tbody>
              {visibleWarningRows.map(row => <Fragment key={row.key}><tr className={warningCountForRow(row) > 0 ? local.warnedRow : local.cleanRow} data-pd-id={`lab.proposal.row.${row.record}`}>
                {row.key === "profile-a::DEMO-001" ? <>
              <td className={local.proposalDateCell}><div className={local.warningDateRow}>{editingWarningDateKey === row.key ? <label className={local.dateEditor}>Settles<input aria-label="Settles date and time" onChange={event => setWarningDateDrafts(current => ({ ...current, [row.key]: event.target.value }))} type="datetime-local" value={warningDateDrafts[row.key] ?? committedWarningDate(row)} /><span><button className={lab.linkButton} onClick={() => { setWarningDateValues(current => ({ ...current, [row.key]: warningDateDrafts[row.key] ?? committedWarningDate(row) })); setEditingWarningDateKey(null); setNotice("Synthetic Settles date updated; no source record changed."); }} type="button">Apply date</button><button className={lab.linkButton} onClick={() => setEditingWarningDateKey(null)} type="button">Cancel</button></span></label> : <button aria-label="Edit Settles date and time" className={local.proposalCellButton} onClick={() => { setWarningDateDrafts(current => ({ ...current, [row.key]: committedWarningDate(row) })); setEditingWarningDateKey(row.key); }} type="button">{formatCompactLedgerDate(committedWarningDate(row))?.compact ?? "Not recorded"}</button>}<button aria-controls="lab-proposal-warning-profile-a--DEMO-001" aria-expanded={activeWarningKey === row.key} aria-label={`Show ${warningCount} recorded ${warningCount === 1 ? "warning" : "warnings"}`} className={local.warningTrigger} ref={node => { warningTriggerRefs.current[row.key] = node; }} onClick={() => setActiveWarningKey(current => current === row.key ? null : row.key)} type="button"><Icon>warning</Icon><span>{warningCount}</span></button></div></td>
              <td><strong>Arsenal v Chelsea</strong><small>Football · Match odds</small></td><td><button aria-label="Review protected bookmaker cell" className={local.proposalCellButton} onDoubleClick={event => setBlockedPreviewAnchor(event.currentTarget.closest("td"))} onKeyDown={event => { if (event.key === "Enter" || event.key === "F2") { event.preventDefault(); setBlockedPreviewAnchor(event.currentTarget.closest("td")); } }} type="button">Matchbook</button></td><td><button aria-label="Edit synthetic Offer details" className={local.proposalCellButton} data-pd-id="lab.proposal.offer-details-cell" onDoubleClick={event => { setOfferCellDraft(offerCellValue); previewSelectorEditor.start("offer_details", event.currentTarget.closest("td")!); }} onKeyDown={event => { if (event.key === "Enter" || event.key === "F2") { event.preventDefault(); setOfferCellDraft(offerCellValue); previewSelectorEditor.start("offer_details", event.currentTarget.closest("td")!); } }} type="button">{offerCellValue.offerType} · {offerCellValue.betType} · {offerCellValue.fixtureType}</button></td><td><button aria-label="Edit synthetic Strategy" className={local.proposalCellButton} onDoubleClick={event => { setStrategyDraft(strategyValue); previewSelectorEditor.start("match_strategy", event.currentTarget.closest("td")!); }} onKeyDown={event => { if (event.key === "Enter" || event.key === "F2") { event.preventDefault(); setStrategyDraft(strategyValue); previewSelectorEditor.start("match_strategy", event.currentTarget.closest("td")!); } }} type="button">{strategyValue}</button></td>
              <td><button aria-expanded={operationAction === "back"} className={local.proposalCellButton} onClick={() => { setOperationReviewKey(row.key); setOperationAction(current => current === "back" ? null : "back"); }} type="button">{backConfirmed ? "Back confirmed" : "Back not recorded"}<Icon>arrow_drop_down</Icon></button></td>
              <td><button aria-label={laySummary.hasReachedTarget ? "Review fully matched Lay" : "Edit partial lay matched so far"} className={local.proposalCellButton} ref={layCellRef} onClick={event => { if (event.detail === 0) { if (laySummary.hasReachedTarget) openOperationStage(row.key, 3); else openCumulativeEditor(row.key, event.currentTarget); } }} onDoubleClick={event => { if (laySummary.hasReachedTarget) openOperationStage(row.key, 3); else openCumulativeEditor(row.key, event.currentTarget); }} onPointerUp={event => { if (event.pointerType === "touch") { if (laySummary.hasReachedTarget) openOperationStage(row.key, 3); else openCumulativeEditor(row.key, event.currentTarget); } }} onKeyDown={event => { if (event.key === "F2" || event.key === "Enter") { event.preventDefault(); if (laySummary.hasReachedTarget) openOperationStage(row.key, 3); else openCumulativeEditor(row.key, event.currentTarget); } }} type="button"><span>{layStatus}</span><small>£{laySummary.matchedTotal.toFixed(2)} matched{laySummary.remainingToMatch === null ? " · Requested Lay Stake not recorded" : ` · £${laySummary.remainingToMatch.toFixed(2)} remaining`}</small></button></td>
              <td><button aria-expanded={operationAction === "status"} className={local.proposalCellButton} onClick={() => { setOperationReviewKey(row.key); setOperationAction(current => current === "status" ? null : "status"); }} type="button">Placed<Icon>arrow_drop_down</Icon></button></td>
                </> : <>
                  <td className={local.proposalDateCell}><div className={local.warningDateRow}>
                    {editingWarningDateKey === row.key ? <label className={local.dateEditor}>Settles<input aria-label={`Settles date and time for ${row.event}`} onChange={event => setWarningDateDrafts(current => ({ ...current, [row.key]: event.target.value }))} type="datetime-local" value={warningDateDrafts[row.key] ?? committedWarningDate(row)} /><span><button className={lab.linkButton} onClick={() => { setWarningDateValues(current => ({ ...current, [row.key]: warningDateDrafts[row.key] ?? committedWarningDate(row) })); setEditingWarningDateKey(null); }} type="button">Apply date</button><button className={lab.linkButton} onClick={() => setEditingWarningDateKey(null)} type="button">Cancel</button></span></label>
                      : <button aria-label={`Edit Settles date and time for ${row.event}`} className={local.proposalCellButton} onClick={() => { setWarningDateDrafts(current => ({ ...current, [row.key]: committedWarningDate(row) })); setEditingWarningDateKey(row.key); }} type="button">{formatCompactLedgerDate(committedWarningDate(row))?.compact ?? "Not recorded"}</button>}
                    {warningCountForRow(row) > 0 ? <button aria-controls={`lab-proposal-warning-${row.record}`} aria-expanded={activeWarningKey === row.key} aria-label={`Show ${warningCountForRow(row)} recorded ${warningCountForRow(row) === 1 ? "warning" : "warnings"} for ${row.event}, ${row.profile}`} className={local.warningTrigger} ref={node => { warningTriggerRefs.current[row.key] = node; }} onClick={() => setActiveWarningKey(current => current === row.key ? null : row.key)} type="button"><Icon>warning</Icon><span>{warningCountForRow(row)}</span></button> : null}
                  </div></td>
                  <td><strong>{row.event}</strong><small>{row.record} · {row.profile}</small></td><td>{row.bookmaker}</td><td>Standard · Single</td><td>Standard</td><td>{row.warnings === 1 ? "Back not recorded" : "Back confirmed"}</td><td>{row.warnings === 2 && !savedOperationDrafts[row.key]?.request ? "Requested Lay Stake not recorded" : "Matched"}</td><td>Placed</td>
                </>}
              </tr>
              {warningCountForRow(row) > 0 ? <tr className={local.warningDetailRow} aria-hidden={activeWarningKey !== row.key}><td colSpan={8}><div className={local.warningDetailsMotion} data-open={activeWarningKey === row.key} inert={activeWarningKey !== row.key} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); setActiveWarningKey(null); requestAnimationFrame(() => warningTriggerRefs.current[row.key]?.focus({ preventScroll: true })); } }}><div className={local.warningDetailsClip}><section aria-label={`Recorded warnings for ${row.event}, ${row.profile}`} className={`${local.warningPanel} ${local.warningDetailsPanel}`} data-pd-id={row.key === "profile-a::DEMO-001" ? "lab.proposal.warnings" : `lab.proposal.warnings.${row.record}`} id={row.key === "profile-a::DEMO-001" ? "lab-proposal-warning-profile-a--DEMO-001" : `lab-proposal-warning-${row.record}`}>
                <div className={local.warningPanelHeading}><h3>{row.event} · {row.profile} · {warningCountForRow(row)} {warningCountForRow(row) === 1 ? "item needs" : "items need"} review</h3><button aria-label={`Close warnings for ${row.event}`} className={lab.linkButton} onClick={() => { setActiveWarningKey(null); requestAnimationFrame(() => warningTriggerRefs.current[row.key]?.focus({ preventScroll: true })); }} type="button">Close</button></div>
                {row.key === "profile-a::DEMO-001" ? <>
                <ul className={local.warningList}>
                {!requestedLayRecorded || !laySummary.hasReachedTarget ? <li><span><strong>Lay match</strong> · {requestedLayRecorded ? `£${laySummary.matchedTotal.toFixed(2)} of £${Number(requestedLayStake).toFixed(2)} requested.` : "Requested Lay Stake not recorded."}</span> <button className={`${lab.linkButton} ${local.warningInlineAction}`} onClick={() => requestedLayRecorded ? openCumulativeEditor(row.key) : openOperationStage(row.key, 3, "request")} type="button">{requestedLayRecorded ? "Update matched amount" : "Review Requested Lay Stake"}</button></li> : null}
                {!backConfirmed ? <li><span><strong>Back confirmation</strong> · Not recorded.</span> <button className={`${lab.linkButton} ${local.warningInlineAction}`} onClick={() => openOperationStage(row.key, 3, "back")} type="button">Review Back confirmation</button></li> : null}
                <li><span><strong>Settlement</strong> · Event date is recorded; settlement deadline is not established.</span> <button className={`${lab.linkButton} ${local.warningInlineAction}`} onClick={() => openOperationStage(row.key, 4, "status")} type="button">Review settlement</button></li>
                </ul>
                </> : <ul className={local.warningList}>
                  {row.warnings === 1 ? <li><span><strong>Back confirmation</strong> · Not recorded.</span> <button className={`${lab.linkButton} ${local.warningInlineAction}`} onClick={() => { openOperationStage(row.key, 3, "back"); }} type="button">Review Back confirmation</button></li> : <>{!savedOperationDrafts[row.key]?.request ? <li><span><strong>Requested Lay Stake</strong> · Not recorded.</span> <button className={`${lab.linkButton} ${local.warningInlineAction}`} onClick={() => { openOperationStage(row.key, 3, "request"); }} type="button">Review Requested Lay Stake</button></li> : null}<li><span><strong>Settlement</strong> · Actual result requires review.</span> <button className={`${lab.linkButton} ${local.warningInlineAction}`} onClick={() => { openOperationStage(row.key, 4, "status"); }} type="button">Review settlement</button></li></>}
                </ul>}
              </section></div></div></td></tr> : null}</Fragment>)}
            </tbody></table></div>
            <div className={local.previewPager}><span>{sortedWarningRows.length} synthetic records · Page {Math.min(warningPage, warningPageCount)} of {warningPageCount}</span>{warningPageCount > 1 ? <><button className={lab.secondaryButton} disabled={warningPage <= 1} onClick={() => { setWarningPage(page => page - 1); setActiveWarningKey(null); }} type="button">Previous</button><button className={lab.secondaryButton} disabled={warningPage >= warningPageCount} onClick={() => { setWarningPage(page => page + 1); setActiveWarningKey(null); }} type="button">Next</button></> : null}</div>
            {operationAction ? <section aria-label={`${operationAction === "back" ? "Back Bet" : "Status"} actions`} className={local.warningPanel} data-pd-id={`lab.proposal.${operationAction}-actions`}><h3>{operationAction === "back" ? "Back Bet actions" : "Status actions"}</h3>{operationAction === "back" ? <><p>Back confirmation is independent of the recorded Lay fills.</p><button className={lab.secondaryButton} onClick={() => { setActualBackStakeDraft(backEvidenceAvailable ? "" : "10.00"); setAcceptedBackOddsDraft(backEvidenceAvailable ? "" : "2.00"); }} type="button">{backEvidenceAvailable ? "Show missing Back evidence" : "Restore Back evidence"}</button><button className={lab.secondaryButton} disabled={backConfirmed || !backEvidenceAvailable} onClick={() => openOperationStage(operationReviewKey, 3, "back")} type="button">Review Back confirmation in Placement</button>{!backEvidenceAvailable ? <p role="status">Record the actual Back stake and accepted odds before confirming externally.</p> : null}{backConfirmed ? <button className={lab.secondaryButton} onClick={() => { openOperationStage(operationReviewKey, 3); setBackReversalPending(true); }} type="button">Review Back reversal in Placement</button> : null}</> : <><p>{finishResultDraft === "Pending" ? "Settlement requires a recorded result." : `Draft result: ${finishResultDraft}. Review the remaining placement prerequisites before saving.`} The event date does not establish a settlement deadline.</p><button className={lab.secondaryButton} disabled={finishResultDraft === "Pending"} onClick={() => openOperationStage(operationReviewKey, 4, "status")} type="button">{finishResultDraft === "Pending" ? "Mark Settled · result missing" : "Review Settled change"}</button><button className={lab.secondaryButton} onClick={() => openOperationStage(operationReviewKey, 4, "status")} type="button">Review settlement in Finish</button><button className={lab.secondaryButton} onClick={() => openOperationStage(operationReviewKey, 3, "request")} type="button">Review missing placement evidence</button></>}</section> : null}

          </section> : null}
          {amendment !== "operations" || operationWorkbenchOpen ? <div className={lab.entry} data-pd-id="lab.proposal.workbench" ref={operationWorkbenchRef}>
            <DesignBetWorkbenchContext title="Bet Workbench · simulated" context={`${amendment === "operations" ? activeOperationRow.profile : "Profile A"} · ${isNewFinish ? "New placed-record example" : selectedRecord.status}`} />
            <DesignBetWorkbenchStageRail activeId={String(stage)} onSelect={id => { const next = Number(id); setStage(next); if (amendment === "operations") { setOperationWarningFocus(null); return; } if (next === 0) selectAmendment("offer"); else if (next === 1) selectAmendment("requirements"); else if (next === 2 || next === 3) { selectAmendment("matching"); setStage(next); } else selectAmendment("finish"); }} stages={stages.map((label, index) => ({ id: String(index), label }))} />
            <DesignBetWorkbenchGrid>
              <div className={lab.entryFields}>
                {amendment === "protected" ? <fieldset><legend>Finish / Review</legend>{reviewClosed ? <p role="status">Protected review closed in this simulation. No source record changed.</p> : <><DesignBetWorkbenchProtectedNotice /><dl className={lab.detailGrid}><div><dt>Status</dt><dd>Settled</dd></div><div><dt>Result</dt><dd>Back won</dd></div><div><dt>Profile</dt><dd>Profile A</dd></div></dl>{correction ? <label>Correction reason<textarea aria-label="Correction reason" placeholder="Record why the value needs correction" rows={2} /></label> : null}</>}</fieldset> : null}
                {amendment === "offer" ? <fieldset>
                  <legend>Offer</legend>
                  <label>Original Offer text<textarea defaultValue="Synthetic offer wording" rows={5} /></label>
                  <div className={lab.fieldPair}>
                    <DesignLabSelect dataPdId="lab.proposal.bookmaker" label="Bookmaker" onChange={setBookmaker} options={[{ value: "Bookmaker A", label: "Bookmaker A" }, { value: "Bookmaker B", label: "Bookmaker B" }]} value={bookmaker} />
                    <label>Offer Name<input defaultValue="Demo Offer" /></label>
                    <label>Offer Type<input defaultValue="Bet & Get" /></label>
                    <label>Bet Type<input defaultValue="Single" /></label>
                    <label>Fixture Type<input defaultValue="Football" /></label>
                    <label>Back Stake · if known<input defaultValue="10.00" inputMode="decimal" /></label>
                  </div>
                  <details onToggle={event => setOfferDetailsOpen(event.currentTarget.open)} open={offerDetailsOpen}>
                    <summary>Additional offer details</summary>
                    <div className={lab.fieldPair}>
                      <label>Event Name<input defaultValue="Synthetic fixture" /></label>
                      <label>Market<input aria-invalid={offerError} defaultValue="" placeholder="Choose the recorded market" ref={marketRef} /></label>
                      <label>Promotion Link<input placeholder="Optional recorded URL" /></label>
                      <label>Account review<input readOnly value={`${bookmaker} · Profile A`} /></label>
                    </div>
                    {offerError ? <p className={local.error} role="alert">Market requires review before continuing.</p> : null}
                  </details>
                  <button className={lab.secondaryButton} onClick={() => { setOfferError(true); setOfferDetailsOpen(true); setNotice("Validation opened Additional offer details at the field needing attention."); requestAnimationFrame(() => marketRef.current?.focus()); }} type="button">Trigger validation error</button>
                </fieldset> : null}
                {amendment === "requirements" ? <fieldset><legend>Recorded requirements</legend><div className={local.switchRow}><button className={lab.secondaryButton} onClick={() => setOutcomeState("ordinary")} type="button">Ordinary result</button><button className={lab.secondaryButton} onClick={() => setOutcomeState("exceptional")} type="button">Extra scenarios</button><button className={lab.secondaryButton} onClick={() => setOutcomeState("unavailable")} type="button">Unavailable data</button></div><dl className={lab.detailGrid}><div><dt>Qualifying source</dt><dd>{outcomeState === "unavailable" ? "Unknown" : "Recorded · synthetic"}</dd></div><div><dt>Reward conditions</dt><dd>Unknown</dd></div><div><dt>External placement evidence</dt><dd>{outcomeState === "ordinary" ? "Recorded · synthetic" : "Unknown"}</dd></div></dl><small className={local.fieldHelp}>Unknown means no recorded evidence. This preview does not confirm external activity.</small></fieldset> : null}
                {amendment === "operations" ? <fieldset data-pd-id="lab.proposal.operations"><legend>{stages[stage]}</legend>
                  {stage === 0 ? <div className={lab.fieldPair}><label>Bookmaker<input readOnly value={activeOperationRow.bookmaker} /></label><label>Offer Name<input readOnly value="Synthetic Sportsbook offer" /></label><label>Offer Type<input readOnly value="Bet & Get" /></label><label>Bet Type<input readOnly value="Single" /></label><label>Fixture Type<input readOnly value="Football" /></label><label>Event Name<input readOnly value={activeOperationRow.event} /></label></div>
                    : stage === 1 ? <><dl className={lab.detailGrid}><div><dt>Recorded requirements</dt><dd>Unknown</dd></div><div><dt>Owning Profile</dt><dd>{activeOperationRow.profile}</dd></div><div><dt>Source record</dt><dd>{activeOperationRow.record}</dd></div></dl><small className={local.fieldHelp}>Unknown means the synthetic source has no recorded requirement evidence.</small></>
                    : stage === 2 ? <><div className={lab.fieldPair}><label>Recommended Lay Stake · plan<input readOnly value="10.00" /></label><label>Requested Lay Stake<input readOnly value={activeOperationRow.key === "profile-a::DEMO-001" ? requestedLayRecorded ? requestedLayStake : "" : secondaryOperationDraft.request} placeholder="Not recorded" /></label><label>Matched so far<input readOnly value={activeOperationRow.key === "profile-a::DEMO-001" ? laySummary.matchedTotal.toFixed(2) : ""} placeholder="Not recorded" /></label></div><details><summary>Advanced calculator options</summary><p>Use the existing calculator and recorded source evidence in PD. This proposal makes no financial calculation.</p></details></>
                    : activeOperationRow.key !== "profile-a::DEMO-001" ? <>
                    {operationWarningFocus ? <p className={`${local.warningPanel} ${local.operationFieldWarning}`} data-pd-id="lab.proposal.field-warning" role="status"><Icon>warning</Icon><span>{operationWarningFocus === "request" ? "Requested Lay Stake is not recorded. Review the recorded request before updating matched Lay evidence." : operationWarningFocus === "back" ? "Back placement confirmation is not recorded. Review the actual Back stake and accepted odds." : operationWarningFocus === "match" ? "Matching is incomplete. Record only the externally confirmed matched Lay Stake." : "Settlement requires the recorded result and placement evidence; the event date is not a deadline."}</span></p> : null}
                    <p className={local.fieldHelp}>{activeOperationRow.event} · {activeOperationRow.profile} · {activeOperationRow.record}. Synthetic changes remain with this record until saved or discarded.</p>
                    {stage === 4 ? <div className={lab.fieldPair}><label>Status<select data-operation-focus="status" onChange={event => updateSecondaryOperationDraft("status", event.target.value)} value={secondaryOperationDraft.status}><option>Placed</option><option>Settled</option></select></label><label>Result<select onChange={event => updateSecondaryOperationDraft("result", event.target.value)} value={secondaryOperationDraft.result}><option>Pending</option><option>Back Won</option><option>Lay Won</option></select></label></div> : <div className={lab.fieldPair}><label>Requested Lay Stake<input data-operation-focus="request" inputMode="decimal" onChange={event => updateSecondaryOperationDraft("request", event.target.value)} placeholder="Not recorded" value={secondaryOperationDraft.request} /></label><label>Actual Back stake<input data-operation-focus="back" inputMode="decimal" onChange={event => updateSecondaryOperationDraft("backStake", event.target.value)} placeholder="Not recorded" value={secondaryOperationDraft.backStake} /></label><label>Accepted Back odds<input inputMode="decimal" onChange={event => updateSecondaryOperationDraft("backOdds", event.target.value)} placeholder="Not recorded" value={secondaryOperationDraft.backOdds} /></label></div>}
                    <p className={local.fieldHelp}>This proposal keeps the entered evidence here. No financial source record is changed.</p>
                  </> : stage === 4 ? <>{operationWarningFocus === "status" ? <p className={`${local.warningPanel} ${local.operationFieldWarning}`} data-pd-id="lab.proposal.field-warning" role="status"><Icon>warning</Icon><span>Settlement requires a recorded result and placement evidence; the event date is not a deadline.</span></p> : null}<p className={local.fieldHelp}>{activeOperationRow.event} · {activeOperationRow.profile} · synthetic Placed record. Settlement requires an actual result; the event date alone is not a deadline.</p><div className={lab.fieldPair}><label>Status<select data-operation-focus="status" onChange={event => setFinishStatusDraft(event.target.value)} value={finishStatusDraft}><option>Placed</option><option>Settled</option></select></label><label>Result<select onChange={event => setFinishResultDraft(event.target.value)} value={finishResultDraft}><option>Pending</option><option>Back Won</option><option>Lay Won</option></select></label></div>{finishStatusDraft === "Settled" && finishResultDraft === "Pending" ? <p role="status">Choose a recorded result before settlement can be saved. The Status and Result draft remains here when you return.</p> : null}<p className={local.fieldHelp}>A settled change uses the governed result and correction command in PD. This preview makes no write.</p></> : <>
                  {operationWarningFocus ? <p className={`${local.warningPanel} ${local.operationFieldWarning}`} data-pd-id="lab.proposal.field-warning" role="status"><Icon>warning</Icon><span>{operationWarningFocus === "request" ? "Requested Lay Stake is not recorded. Review the recorded request before updating matched Lay evidence." : operationWarningFocus === "match" ? "Matching is incomplete. Record only the externally confirmed matched Lay Stake." : "Back placement confirmation is not recorded. Review the actual Back stake and accepted odds."}</span></p> : null}
                  <p className={local.fieldHelp}>{activeOperationRow.event} · {activeOperationRow.profile} · £10 Back plan · {requestedLayRecorded ? `Requested Lay Stake £${Number(requestedLayStake).toFixed(2)} recorded` : "Requested Lay Stake not recorded"} · £{laySummary.matchedTotal.toFixed(2)} matched. No financial command is connected.</p>
                  <button className={lab.secondaryButton} onClick={() => setRequestedLayRecorded(value => !value)} type="button">{requestedLayRecorded ? "Show missing-request example" : "Restore recorded £8 request"}</button>
                  <div className={lab.fieldPair}><label>Requested Lay Stake<input data-operation-focus="request" inputMode="decimal" onChange={event => { setRequestedLayStake(event.target.value); setRequestedLayRecorded(event.target.value.trim() !== ""); }} placeholder="Not recorded" value={requestedLayRecorded ? requestedLayStake : ""} /></label><label>Actual Back stake<input data-operation-focus="back" inputMode="decimal" onChange={event => setActualBackStakeDraft(event.target.value)} placeholder="Not recorded" value={actualBackStakeDraft} /></label><label>Accepted Back odds<input inputMode="decimal" onChange={event => setAcceptedBackOddsDraft(event.target.value)} placeholder="Not recorded" value={acceptedBackOddsDraft} /></label><label>Back placement<input readOnly value={backConfirmed ? "Confirmed externally" : "Not recorded"} /></label></div>
                  <button className={lab.secondaryButton} disabled={backConfirmed || !backEvidenceAvailable} onClick={() => { setBackConfirmed(true); setNotice("Synthetic Back confirmation recorded independently; Lay evidence is unchanged."); }} type="button">Confirm external Back</button>
                  <div className={local.quickFigures}><div><span>Requested</span><strong>{requestedLayRecorded ? `£${Number(requestedLayStake).toFixed(2)}` : "Not recorded"}</strong></div><div><span>Matched</span><strong>£{laySummary.matchedTotal.toFixed(2)}</strong></div><div><span>Remaining</span><strong>{laySummary.remainingToMatch === null ? "Not recorded" : `£${Math.max(0, laySummary.remainingToMatch).toFixed(2)}`}</strong></div></div>
                  <p className={local.inlineStatus}>{!requestedLayRecorded ? "Requested Lay Stake not recorded · matching completion unknown" : laySummary.hasReachedTarget ? "Fully matched" : "Partially matched"}</p>
                  <div className={local.switchRow}><button className={lab.primaryButton} disabled={!requestedLayRecorded || laySummary.hasReachedTarget} onClick={() => openCumulativeEditor("profile-a::DEMO-001")} type="button">Update matched amount</button><button className={lab.secondaryButton} disabled={!requestedLayRecorded || laySummary.hasReachedTarget} onClick={() => { setCumulativeDraft(requestedLayStake); setQuickActionOpen(true); }} type="button">{laySummary.remainingToMatch === null ? "Confirm remaining · request unknown" : `Confirm remaining £${Math.max(0, laySummary.remainingToMatch).toFixed(2)} matched`}</button></div>
                  {!requestedLayRecorded ? <p className={local.fieldHelp}>Record the requested Lay stake in Placement before confirming a remaining amount.</p> : null}
                  {quickActionOpen ? <section aria-label="Update matched amount" className={local.warningPanel} data-pd-id="lab.proposal.quick-action"><h3>Update matched amount</h3><label>Matched so far<input data-operation-focus="match" inputMode="decimal" onChange={event => setCumulativeDraft(event.target.value)} value={cumulativeDraft} /></label><p>Enter the total actually matched. The next fill is the difference from £{laySummary.matchedTotal.toFixed(2)} already recorded at Matchbook · odds 2.00. Changed odds, exchange or ambiguous legs require Placement review.</p><div className={local.switchRow}><button className={lab.secondaryButton} onClick={() => { setQuickActionOpen(false); setCumulativeDraft(laySummary.matchedTotal.toFixed(2)); }} type="button">Cancel</button><button className={lab.primaryButton} onClick={confirmCumulativeEditor} type="button">Confirm actual match</button></div></section> : null}
                  <DesignBetWorkbenchPlacementDetails
                    legs={<DesignBetWorkbenchRecordedLegs
                      guidance={laySummary.remainingToMatch !== null && laySummary.remainingToMatch > 0 ? "Remaining lay exposure is still open. Use Recommended Next Lay Stake to place the next leg and re-check liability." : null}
                      hasLegs={recordedLegs.length > 0}
                      matchedTotal={laySummary.matchedTotal}
                      onCopyRecommended={() => setNotice("Recommended Next Lay Stake copied only in this synthetic preview.")}
                      recommendedNext={laySummary.nextRecommendedStake}
                      remaining={laySummary.remainingToMatch}
                      target={laySummary.targetLayStake}
                    >{recordedLegs.map((leg, index) => renderLeg(index, leg))}</DesignBetWorkbenchRecordedLegs>}
                    followUp={<div className={local.placementCardContent}><strong>Follow-up reminder</strong><p>{reminderActive ? "Recheck scheduled for this synthetic partial fill." : "Not set"}</p><button className={lab.secondaryButton} onClick={() => { setReminderActive(value => !value); setNotice("Reminder state changed only in this preview."); }} type="button">{reminderActive ? "Review Reminder" : "Set Reminder"}</button></div>}
                    reversal={<div className={lab.placementReversalActions}>
                      <div className={lab.placementReversalAction}>{reversalPending ? <><p>Remove the recorded Lay placement?</p><button className={lab.dangerButton} onClick={() => { setRecordedLegs([]); setLegReviewOpen(null); setReversalPending(false); setNotice("Synthetic Lay placement removed; Back confirmation is unchanged."); }} type="button">Remove Lay</button><button className={lab.secondaryButton} onClick={() => setReversalPending(false)} type="button">Cancel reversal</button></> : <button className={lab.secondaryButton} disabled={recordedLegs.length === 0} onClick={() => setReversalPending(true)} type="button">Review Lay reversal</button>}</div>
                      <div className={lab.placementReversalAction}>{backReversalPending ? <><p>Remove the recorded Back confirmation?</p><button className={lab.dangerButton} onClick={() => { setBackConfirmed(false); setBackReversalPending(false); setNotice("Synthetic Back confirmation removed; Lay placement is unchanged."); }} type="button">Remove Back Placement</button><button className={lab.secondaryButton} onClick={() => setBackReversalPending(false)} type="button">Cancel reversal</button></> : <button className={lab.secondaryButton} disabled={!backConfirmed} onClick={() => setBackReversalPending(true)} type="button">Review Back reversal</button>}</div>
                    </div>}
                  />
                  </>}
                </fieldset> : null}
                {amendment === "matching" ? <fieldset key={`${stage}-${fillState}`}>
                  <legend>{stage === 3 ? "Placement" : "Matching"}</legend>
                  <div className={local.switchRow}>
                    <button aria-pressed={stage === 2} className={lab.secondaryButton} onClick={() => setStage(2)} type="button">Matching</button>
                    <button aria-pressed={stage === 3} className={lab.secondaryButton} onClick={() => setStage(3)} type="button">Placement</button>
                    <button aria-pressed={fillState === "standard"} className={lab.secondaryButton} onClick={() => { setFillState("standard"); setBackConfirmed(false); setRecordedLegs([]); setMatchedLayDraft("5.00"); setLegReviewOpen(null); setReminderActive(false); setReversalPending(false); setBackReversalPending(false); }} type="button">Standard case</button>
                    <button aria-pressed={fillState === "partial"} className={lab.secondaryButton} onClick={() => { setFillState("partial"); setBackConfirmed(false); setRecordedLegs([]); setMatchedLayDraft("5.00"); setLegReviewOpen(null); setReminderActive(false); setReversalPending(false); setBackReversalPending(false); }} type="button">Partial fill</button>
                  </div>
                  {stage === 2 ? <>
                    <div className={lab.fieldPair}>
                      <label>Back stake<input defaultValue="10.00" inputMode="decimal" /></label>
                      <label>Back odds<input defaultValue="2.10" inputMode="decimal" /></label>
                      <label>Lay odds<input defaultValue="2.20" inputMode="decimal" /></label>
                      <label>Commission<input defaultValue="2.00" inputMode="decimal" /></label>
                      <label>Exchange<input defaultValue="Exchange A" /></label>
                      <label>Strategy<input defaultValue="Standard" /></label>
                      <label>Requested Lay Stake<input inputMode="decimal" onChange={event => setRequestedLayStake(event.target.value)} placeholder="Not recorded" value={requestedLayRecorded ? requestedLayStake : ""} /></label>
                    </div>
                    <button className={lab.secondaryButton} onClick={() => setRequestedLayRecorded(value => !value)} type="button">{requestedLayRecorded ? "Show Not recorded example" : "Show recorded example"}</button>
                    <details><summary>Advanced calculator options</summary><div className={lab.fieldPair}><label>Calculator Type<input defaultValue={fillState === "partial" ? "Partial lay" : "Standard"} /></label><label>Lay mode<input defaultValue="Reference stake" /></label><label>Back bet<input defaultValue="£10.00 at 2.10" readOnly /></label><label>Lay bet<input defaultValue="Reference 9.54 at 2.20" readOnly /></label><label>Execution choice<input defaultValue={fillState === "partial" ? "Partial match review" : "Standard hedge"} readOnly /></label></div><small className={local.fieldHelp}>Advanced strategy and execution choices are illustrative. Replan uses the native calculator in PD.</small><button className={lab.secondaryButton} onClick={() => setNotice("Replan simulated. No calculation or source record changed.")} type="button">Replan with current references</button></details>
                  </> : <>
                    <div className={lab.fieldPair}>
                      <label>Back placement<input readOnly value={backConfirmed ? "Confirmed externally" : "Not recorded"} /></label>
                      <label>Lay placement<input readOnly value={layStatus} /></label>
                      <label>Actual back stake<input inputMode="decimal" placeholder="Not recorded" readOnly value={backConfirmed ? "10.00" : ""} /></label>
                      <label>Actual matched lay stake<input inputMode="decimal" placeholder="Not recorded" readOnly value={recordedLegs.length ? laySummary.matchedTotal.toFixed(2) : ""} /></label>
                    </div>
                    {!laySummary.hasReachedTarget ? <label>Matched Lay amount to confirm<input aria-label="Matched Lay amount to confirm" inputMode="decimal" onChange={event => setMatchedLayDraft(event.target.value)} placeholder="Enter exact matched amount" value={matchedLayDraft} /></label> : null}
                    <div className={`${local.switchRow} ${local.placementConfirm}`}><button className={lab.secondaryButton} disabled={backConfirmed} onClick={() => { setBackConfirmed(true); setNotice("External Back confirmation simulated; Lay remains separate."); }} type="button">Confirm external Back</button><button className={lab.secondaryButton} disabled={!canConfirmLay} onClick={() => { if (!canConfirmLay) return; const prior = recordedLegs.at(-1); setRecordedLegs(current => [...current, { exchange: prior?.exchange ?? (initialPartialLegOpen ? "Matchbook" : "Exchange A"), odds: prior?.odds ?? (initialPartialLegOpen ? "2.00" : "2.20"), matchedStake: matchedLayDraft }]); setNotice(`External Lay match of £${matchedLayDraft} simulated; Back remains separate.`); setMatchedLayDraft(""); }} type="button">Confirm external Lay · £{matchedLayDraft || "—"}</button></div>
                    <p role="status">Back: {backConfirmed ? "Confirmed" : "Not recorded"} · Lay: {layStatus}</p>
                    <div ref={placementPreviewRef}><DesignBetWorkbenchPlacementDetails
                      fields={<div className={lab.fieldPair}><label>Recommended Lay Stake · plan<input readOnly value="10.00" /></label><label>Requested Lay Stake<input readOnly value={requestedLayRecorded ? requestedLayStake : ""} placeholder="Not recorded" /></label><label>Matched so far<input readOnly value={recordedLegs.length ? laySummary.matchedTotal.toFixed(2) : ""} placeholder="Not recorded" /></label><label>Actual lay amount<input readOnly value={requestedLayRecorded ? requestedLayStake : ""} placeholder="Not recorded" /></label></div>}
                      legs={<DesignBetWorkbenchRecordedLegs guidance={laySummary.remainingToMatch !== null && laySummary.remainingToMatch > 0 ? "Remaining lay exposure is still open. Use Recommended Next Lay Stake to place the next leg and re-check liability." : null} hasLegs={recordedLegs.length > 0} matchedTotal={laySummary.matchedTotal} onCopyRecommended={() => setNotice("Recommended Next Lay Stake copied only in this synthetic preview.")} recommendedNext={laySummary.nextRecommendedStake} remaining={laySummary.remainingToMatch} target={laySummary.targetLayStake}>{recordedLegs.map((leg, index) => renderLeg(index, leg))}</DesignBetWorkbenchRecordedLegs>}
                      followUp={<div className={local.placementCardContent}><strong>Follow-up reminder</strong><p>{reminderActive ? "Recheck scheduled for this synthetic partial fill." : "Not set"}</p><button className={lab.secondaryButton} onClick={() => { setReminderActive(value => !value); setNotice("Reminder state changed only in this preview."); }} type="button">{reminderActive ? "Review Reminder" : "Set Reminder"}</button></div>}
                      reversal={<div className={lab.placementReversalActions}>
                        <div className={lab.placementReversalAction}>{reversalPending ? <><p>Remove the recorded Lay placement?</p><button className={lab.dangerButton} onClick={() => { setRecordedLegs([]); setMatchedLayDraft("5.00"); setLegReviewOpen(null); setReversalPending(false); setNotice("Synthetic Lay placement removed; Back confirmation is unchanged."); }} type="button">Remove Lay</button><button className={lab.secondaryButton} onClick={() => setReversalPending(false)} type="button">Cancel reversal</button></> : <button className={lab.secondaryButton} disabled={recordedLegs.length === 0} onClick={() => setReversalPending(true)} type="button">Review Lay reversal</button>}</div>
                        <div className={lab.placementReversalAction}>{backReversalPending ? <><p>Remove the recorded Back confirmation?</p><button className={lab.dangerButton} onClick={() => { setBackConfirmed(false); setBackReversalPending(false); setNotice("Synthetic Back confirmation removed; Lay placement is unchanged."); }} type="button">Remove Back Placement</button><button className={lab.secondaryButton} onClick={() => setBackReversalPending(false)} type="button">Cancel reversal</button></> : <button className={lab.secondaryButton} disabled={!backConfirmed} onClick={() => setBackReversalPending(true)} type="button">Review Back reversal</button>}</div>
                      </div>}
                    /></div>
                  </>}
                </fieldset> : null}
                {amendment === "finish" ? <fieldset className={local.finishCard}>
                  <legend>Finish / Review</legend>
                  <div className={local.switchRow}>
                    <button aria-pressed={finishMode === "existing"} className={lab.secondaryButton} onClick={() => setFinishMode("existing")} type="button">Existing unchanged bet</button>
                    <button aria-pressed={finishMode === "new"} className={lab.secondaryButton} onClick={() => { setFinishMode("new"); setLinked(false); }} type="button">New placed-record example</button>
                    <button className={lab.secondaryButton} onClick={() => setLinked(true)} type="button">With linked reward</button>
                    <button className={lab.secondaryButton} onClick={() => setLinked(false)} type="button">Without linked reward</button>
                  </div>
                  <div className={lab.fieldPair}><label>Status<select defaultValue={isNewFinish ? "Placed" : selectedRecord.status}><option>Prospecting</option><option>Placed</option><option>Settled</option></select></label><div className={lab.settlesField}><label htmlFor="lab-proposal-settles">Settles</label><div className={lab.settlesRow}><input id="lab-proposal-settles" type="datetime-local" /><button className={lab.secondaryButton} onClick={() => setNotice("Football settlement-time assist simulated; no source date changed.")} type="button">+90m Football</button></div></div><label>Result<select defaultValue="Pending"><option>Pending</option><option>Back Won</option><option>Lay Won</option></select></label></div>
                  <details><summary>Linked Free Bets</summary>{linked ? <div className={local.linkedDetail}><p>One recorded synthetic relationship · Profile A</p><button className={lab.linkButton} onClick={() => setNotice("Linked Free Bet review simulated. No source record changed.")} type="button">Review linked Free Bet</button></div> : <p>No linked reward is recorded for this synthetic case.</p>}</details>
                  <details data-pd-id="lab.proposal.additional-review"><summary>Additional review details</summary><div className={lab.fieldPair}><label>Manual override<input inputMode="decimal" placeholder="Not recorded" /></label><label>Override reason<input placeholder="Required when an override is entered" /></label></div><label>Notes<textarea rows={3} /></label></details>
                  <details data-pd-id="lab.proposal.history"><summary>History</summary><p>Recorded source and audited changes appear here. This proposal has no persisted history.</p></details>
                </fieldset> : null}
              </div>
              <DesignBetWorkbenchSummary title="Outcome Comparison">
                <p>{selectedRecord.offer} · {selectedRecord.status} · synthetic signed fixtures</p>
                {outcomeUnavailable
                  ? <p role="status">{outcomeState === "unavailable" ? "Outcome unavailable: required source values are not recorded." : amendment === "operations" ? "Outcome unavailable: no governed scenario amounts are recorded for this synthetic row." : "Outcome unavailable: Requested Lay Stake or partial-fill evidence is not complete."}</p>
                  : <dl>{visibleScenarios.map(row => <div data-pd-id={`lab.proposal.outcome.${row.key}`} key={row.key}><dt>{row.label}</dt><dd>{money(String(row.amount))}</dd></div>)}</dl>}
                <details data-pd-id="lab.proposal.detailed-outcomes">
                  <summary>Detailed outcomes</summary>
                  {outcomeUnavailable ? <p>No additional governed amounts are recorded for this synthetic state.</p>
                    : detailedScenarios.length ? <dl>{detailedScenarios.map(row => <div data-pd-id={`lab.proposal.outcome.${row.key}`} key={row.key}><dt>{row.label}</dt><dd>{money(String(row.amount))}</dd></div>)}</dl>
                      : <p>No additional outcome branches are recorded for this synthetic case.</p>}
                </details>
              </DesignBetWorkbenchSummary>
            </DesignBetWorkbenchGrid>
            {notice ? <p className={local.inlineStatus} role="status">{notice}</p> : null}
            <div className={lab.entryFooter} data-pd-id="lab.proposal.footer">
              <span className={local.footerMessage}>{amendment === "operations" ? "Synthetic review only · no financial source write" : "Proposal only · no Save command is connected"}</span>
              {amendment === "protected" ? reviewClosed
                ? <button className={lab.secondaryButton} onClick={() => setReviewClosed(false)} type="button">Reopen protected review</button>
                : <DesignBetWorkbenchProtectedActions correction={correction}
                    onCancel={() => { setReviewClosed(true); setNotice("Protected review closed; no record changed."); }}
                    onCancelCorrection={() => { setCorrection(false); setNotice("Correction draft abandoned; protected review remains open."); }}
                    onReviewCorrection={() => { setCorrection(true); setNotice("Correction editor opened; no write was made."); }}
                    onSaveCorrection={() => setNotice("Save Audited Correction simulated; no record changed.")} />
                : <>
                  {amendment === "finish" && !isNewFinish ? <details className={lab.footerMore}><summary>More actions</summary><button className={lab.dangerButton} onClick={() => setNotice("Destructive action preview only; no record changed.")} type="button">Delete record · preview</button></details> : null}
                  <button className={lab.secondaryButton} onClick={() => { if (amendment === "operations") void cancelOperationWorkbench(); else setNotice("Preview cancelled; no record changed."); }} type="button">Cancel</button>
                  <button className={lab.primaryButton} onClick={() => { if (amendment === "operations") void saveOperationDraft(); else setNotice("Primary action simulated; no bet was placed, settled or saved."); }} type="button">{isNewFinish ? "Finish Placed Record" : "Save Existing Bet"}</button>
                </>}
            </div>
          </div> : null}
        </main>
        {blockedPreviewAnchor ? <LedgerCellReviewPopover anchor={blockedPreviewAnchor} dataPdId="lab.proposal.protected-cell" onDismiss={restoreFocus => { if (restoreFocus) requestAnimationFrame(() => blockedPreviewAnchor.querySelector<HTMLElement>("button")?.focus({ preventScroll: true })); setBlockedPreviewAnchor(null); }} onReview={() => openOperationStage("profile-a::DEMO-001", 3, "back")} portalTarget={portalTarget ?? undefined} reason="Bookmaker is tied to recorded placement. Review the source before changing it." /> : null}
        {previewSelectorEditor.session?.column === "offer_details" ? <LedgerFloatingCellEditor cellBound compact commitOnTab={false} dirty={JSON.stringify(offerCellDraft) !== JSON.stringify(offerCellValue)} error="" label="Offer details" ledger="Sportsbook proposal" onCancel={() => { setOfferCellDraft(offerCellValue); previewSelectorEditor.close(); }} onReview={() => { previewSelectorEditor.close(); openOperationStage("profile-a::DEMO-001", 0); }} onSave={async () => { setOfferCellValue(offerCellDraft); previewSelectorEditor.close(); return true; }} portalTarget={portalTarget ?? undefined} session={previewSelectorEditor.session}><DesignOfferDetailsCellFields dataPdId="lab.proposal.offer-details-editor" value={offerCellDraft} offerTypes={["Bet & Get", "Cashback", "Sign up / Welcome"]} betTypes={offerCellDraft.offerType === "Cashback" ? ["Single", "Accumulator"] : ["Single", "Multiple"]} fixtureTypes={["Football", "Tennis", "Horse Racing"]} onOfferTypeChange={offerType => setOfferCellDraft(current => ({ ...current, offerType, betType: offerType === "Cashback" ? "Accumulator" : "Single" }))} onBetTypeChange={betType => setOfferCellDraft(current => ({ ...current, betType }))} onFixtureTypeChange={fixtureType => setOfferCellDraft(current => ({ ...current, fixtureType }))} /></LedgerFloatingCellEditor> : previewSelectorEditor.session ? <LedgerFloatingCellEditor compact dirty={strategyDraft !== strategyValue} error="" label="Strategy" ledger="Sportsbook proposal" onCancel={() => { setStrategyDraft(strategyValue); previewSelectorEditor.close(); }} onReview={() => { previewSelectorEditor.close(); openOperationStage("profile-a::DEMO-001", 2); }} onSave={async () => { setStrategyValue(strategyDraft); previewSelectorEditor.close(); return true; }} portalTarget={portalTarget ?? undefined} session={previewSelectorEditor.session}><label><span className="sr-only">Strategy</span><select aria-label="Strategy" className={lab.floatingCellInput} onChange={event => setStrategyDraft(event.target.value)} value={strategyDraft}>{["Standard", "Underlay", "Overlay", "Custom", "No Lay"].map(option => <option key={option} value={option}>{option}</option>)}</select></label></LedgerFloatingCellEditor> : null}
        {previewCellEditor.session ? <LedgerFloatingCellEditor compact wide commitOnTab={false} dirty={cumulativeDraft !== laySummary.matchedTotal.toFixed(2)} error={cumulativeError} label="Matched so far" ledger="Sportsbook" onCancel={() => { previewCellEditor.close(); setCumulativeError(""); setCumulativeDraft(laySummary.matchedTotal.toFixed(2)); }} onReview={() => { previewCellEditor.close(); openOperationStage("profile-a::DEMO-001", 3, "request"); }} onSave={async () => { const saved = confirmCumulativeEditor(); if (saved) previewCellEditor.close(); return saved; }} portalTarget={portalTarget ?? undefined} session={previewCellEditor.session}><DesignCumulativeLayCellFields matched={laySummary.matchedTotal} onCancel={() => { previewCellEditor.close(); setCumulativeError(""); }} onChange={setCumulativeDraft} remaining={laySummary.remainingToMatch ?? 0} requested={Number(requestedLayStake)} value={cumulativeDraft} /></LedgerFloatingCellEditor> : null}
        {operationExitConfirm ? <ModalBoundary onDismiss={() => setOperationExitConfirm(false)}><div className="modal-backdrop" onClick={() => setOperationExitConfirm(false)}><section aria-label="You have unsaved Sportsbook changes." aria-modal="true" className={lab.editModal} data-pd-id="lab.proposal.unsaved-dialog" onClick={event => event.stopPropagation()} role="dialog"><div className={lab.modalHead}><h2>You have unsaved Sportsbook changes.</h2></div><p>Keep editing, save this synthetic review, or discard its unsaved fields.</p><div className={lab.actionRow}><button className={lab.secondaryButton} onClick={() => setOperationExitConfirm(false)} type="button">Keep editing</button><button className={lab.primaryButton} onClick={() => { void saveOperationDraft().then(() => { setOperationExitConfirm(false); closeOperationWorkbench(); }); }} type="button">Save and close</button><button className={lab.dangerButton} onClick={() => { restoreOperationBaseline(); setOperationExitConfirm(false); closeOperationWorkbench(); }} type="button">Discard changes</button></div></section></div></ModalBoundary> : null}
      </div>
    </div>
  </div>;
}
