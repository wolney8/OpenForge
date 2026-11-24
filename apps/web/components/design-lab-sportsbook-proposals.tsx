"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { DesignBetWorkbenchContext, DesignBetWorkbenchGrid, DesignBetWorkbenchLeg, DesignBetWorkbenchPlacementDetails, DesignBetWorkbenchProtectedActions, DesignBetWorkbenchProtectedNotice, DesignBetWorkbenchRecordedLegs, DesignBetWorkbenchStageRail, DesignBetWorkbenchSummary } from "@/components/design-bet-workbench-presentation";
import { DesignPageHead } from "@/components/design-ledger-screen";
import { DesignLabSelect } from "@/components/design-lab-select";
import { formatFinancialValue } from "@/lib/financial-display";
import { normalizeMoneyInput } from "@/lib/decimal-input";
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
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [operationWorkbenchOpen, setOperationWorkbenchOpen] = useState(initialPartialLegOpen);
  const [operationAction, setOperationAction] = useState<"back" | "status" | null>(null);
  const [settlesEditing, setSettlesEditing] = useState(false);
  const [settlesValue, setSettlesValue] = useState("2026-11-20T18:54");
  const [settlesDraft, setSettlesDraft] = useState("2026-11-20T18:54");
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
  const backStake = normalizeMoneyInput(actualBackStakeDraft.trim());
  const backEvidenceAvailable = backStake !== null && backStake !== "" && Number(backStake) > 0 && /^\d+(?:\.\d{1,2})?$/.test(acceptedBackOddsDraft.trim()) && Number(acceptedBackOddsDraft) > 1;
  const openOperationStage = (nextStage: number, focus: "request" | "back" | "status" | null = null) => {
    setStage(nextStage);
    setOperationWorkbenchOpen(true);
    setOperationAction(null);
    requestAnimationFrame(() => {
      if (!focus) { operationWorkbenchRef.current?.scrollIntoView({ block: "start" }); return; }
      const target = operationWorkbenchRef.current?.querySelector<HTMLElement>(`[data-operation-focus="${focus}"]`);
      target?.scrollIntoView({ block: "center" });
      target?.focus({ preventScroll: true });
    });
  };
  const openCumulativeEditor = () => {
    setCumulativeDraft(current => current.trim() ? current : laySummary.matchedTotal.toFixed(2));
    setQuickActionOpen(true);
    openOperationStage(3);
    // A double-click dispatches a second click after the first render. Restore
    // focus to the editor after that pointer event rather than the ledger cell.
    requestAnimationFrame(() => operationWorkbenchRef.current?.querySelector<HTMLInputElement>('[data-pd-id="lab.proposal.quick-action"] input')?.focus({ preventScroll: true }));
  };
  const confirmCumulativeEditor = () => {
    const canonical = normalizeMoneyInput(cumulativeDraft.trim());
    const request = normalizeMoneyInput(requestedLayStake.trim());
    if (!requestedLayRecorded || canonical === null || canonical === "" || request === null || request === "") {
      setNotice("Matched so far needs a complete amount with at most two decimal places and a recorded Lay request.");
      return;
    }
    const nextPence = Math.round(Number(canonical) * 100);
    const previousPence = Math.round(laySummary.matchedTotal * 100);
    const requestedPence = Math.round(Number(request) * 100);
    if (nextPence < previousPence || nextPence > requestedPence) {
      setNotice(`Enter a cumulative amount from the saved £${laySummary.matchedTotal.toFixed(2)} up to the £${Number(request).toFixed(2)} request. Downward changes require correction review.`);
      return;
    }
    const difference = nextPence - previousPence;
    if (difference > 0) setRecordedLegs(current => [...current, { exchange: "Matchbook", odds: "2.00", matchedStake: (difference / 100).toFixed(2) }]);
    setQuickActionOpen(false);
    setNotice(difference > 0 ? `Synthetic £${(difference / 100).toFixed(2)} fill added; no source record changed.` : "Already recorded · no new fill added.");
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
  const selectedRecord = outcomeState === "exceptional"
    ? { id: "DEMO-EXTRA", status: amendment === "protected" ? "Settled" : "Placed", offer: "Double Delight" }
    : outcomeState === "unavailable"
      ? { id: "DEMO-INCOMPLETE", status: amendment === "protected" ? "Settled" : "Prospecting", offer: "Standard" }
      : { id: amendment === "protected" ? "DEMO-PROTECTED" : "DEMO-001", status: amendment === "protected" ? "Settled" : "Placed", offer: "Standard" };
  const isNewFinish = amendment === "finish" && finishMode === "new";
  const outcomeUnavailable = outcomeState === "unavailable" || (amendment === "matching" && (fillState === "partial" || !requestedLayRecorded));
  const visibleScenarios = outcomeState === "exceptional" ? scenarios.slice(0, 2) : scenarios;
  const detailedScenarios = outcomeState === "exceptional" ? scenarios.slice(2) : [];

  return <div className={lab.lab} data-pd-id="lab.sportsbook-proposals.root">
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
          </div><div className={lab.profileSelect}><DesignLabSelect compact dataPdId="lab.proposal.profile" label="Profile" onChange={setScope} options={[{ value: "all", label: "All Profiles" }, { value: "profile-a", label: "Profile A" }]} value={scope} /></div></div>
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
        <nav aria-label="Breadcrumb" className={lab.breadcrumb} data-pd-id="lab.proposal.breadcrumb"><span className={lab.crumb}><Link href="/design-lab">Position</Link></span><span className={lab.crumb}><Icon>chevron_right</Icon><Link href="/design-lab">Tracker</Link></span><span className={lab.crumb}><Icon>chevron_right</Icon><Link href="/design-lab">Sportsbook Bets</Link></span><span className={lab.crumb}><Icon>chevron_right</Icon><span aria-current="page">Bet details · proposal</span></span><span className={lab.labBadge}>LAB · proposal</span></nav>
        <main className={lab.main} data-pd-id="lab.proposal.main" id="lab-main">
          <DesignPageHead><div><h1>{isNewFinish ? "New Sportsbook Bet" : `Edit Sportsbook Bet · ${selectedRecord.id}`}</h1><p>Offer first · prepare and confirm external placement later</p></div><div className={lab.headActions}><Link className={lab.linkButton} href="/design-lab">Approved Lab</Link></div></DesignPageHead>
          <p className={local.previewNotice}><strong>{amendment === "matching" && fillState === "partial" ? "Partial-fill leg layout proposed for approval." : "Five Sportsbook presentation decisions approved for PD adoption."}</strong> This separate preview uses synthetic records and simulated actions only. The frozen Design Lab remains available from the link above.</p>
          <nav aria-label="Choose amendment" className={local.choiceRow}>{choices.map(choice => <a aria-current={amendment === choice.id ? "page" : undefined} href={`?amendment=${choice.id}`} key={choice.id} onClick={event => { event.preventDefault(); selectAmendment(choice.id); }}>{choice.label}</a>)}</nav>
          {amendment === "operations" ? <section aria-label="Proposed Sportsbook ledger row" className={local.proposalLedger} data-pd-id="lab.proposal.ledger">
            <div className={local.proposalLedgerHeading}><div><h2>Sportsbook Bets</h2><p>1 synthetic result · Profile A · planned £10.00 · requested {requestedLayRecorded ? `£${Number(requestedLayStake).toFixed(2)}` : "Not recorded"}</p></div><button className={lab.secondaryButton} onClick={() => openOperationStage(3)} type="button">Open Bet Workbench</button></div>
            <div className={local.proposalTableScroll}><table><thead><tr><th scope="col">Settles</th><th scope="col">Event Name</th><th scope="col">Bookmaker</th><th scope="col">Back Bet</th><th scope="col">Lay Bet</th><th scope="col">Status</th></tr></thead><tbody><tr>
              <td className={local.proposalDateCell}><div className={local.warningDateRow}>{settlesEditing ? <label className={local.dateEditor}>Settles<input aria-label="Settles date and time" onChange={event => setSettlesDraft(event.target.value)} type="datetime-local" value={settlesDraft} /><span><button className={lab.linkButton} onClick={() => { setSettlesValue(settlesDraft); setSettlesEditing(false); setNotice("Synthetic Settles date updated; no source record changed."); }} type="button">Apply date</button><button className={lab.linkButton} onClick={() => { setSettlesDraft(settlesValue); setSettlesEditing(false); }} type="button">Cancel</button></span></label> : <button aria-label="Edit Settles date and time" className={local.proposalCellButton} onClick={() => { setSettlesDraft(settlesValue); setSettlesEditing(true); }} type="button">{formatCompactLedgerDate(settlesValue)?.compact ?? "Not recorded"}</button>}<button aria-expanded={warningsOpen} aria-label={`Show ${warningCount} recorded warnings`} className={local.warningTrigger} onClick={() => setWarningsOpen(value => !value)} type="button"><Icon>warning</Icon><span>{warningCount}</span></button></div></td>
              <td><strong>Arsenal v Chelsea</strong><small>Football · Match odds</small></td><td>Matchbook</td>
              <td><button aria-expanded={operationAction === "back"} className={local.proposalCellButton} onClick={() => setOperationAction(current => current === "back" ? null : "back")} type="button">{backConfirmed ? "Back confirmed" : "Back not recorded"}<Icon>arrow_drop_down</Icon></button></td>
              <td><button aria-label={laySummary.hasReachedTarget ? "Review fully matched Lay" : "Edit partial lay matched so far"} className={local.proposalCellButton} onClick={() => { if (laySummary.hasReachedTarget) openOperationStage(3); else openCumulativeEditor(); }} onDoubleClick={() => { if (laySummary.hasReachedTarget) openOperationStage(3); else openCumulativeEditor(); }} onKeyDown={event => { if (event.key === "F2") { event.preventDefault(); if (laySummary.hasReachedTarget) openOperationStage(3); else openCumulativeEditor(); } }} type="button"><span>{layStatus}</span><small>£{laySummary.matchedTotal.toFixed(2)} matched{laySummary.remainingToMatch === null ? " · request not recorded" : ` · £${laySummary.remainingToMatch.toFixed(2)} remaining`}</small></button></td>
              <td><button aria-expanded={operationAction === "status"} className={local.proposalCellButton} onClick={() => setOperationAction(current => current === "status" ? null : "status")} type="button">Placed<Icon>arrow_drop_down</Icon></button></td>
            </tr></tbody></table></div>
            {operationAction ? <section aria-label={`${operationAction === "back" ? "Back Bet" : "Status"} actions`} className={local.warningPanel} data-pd-id={`lab.proposal.${operationAction}-actions`}><h3>{operationAction === "back" ? "Back Bet actions" : "Status actions"}</h3>{operationAction === "back" ? <><p>Back confirmation is independent of the recorded Lay fills.</p><button className={lab.secondaryButton} onClick={() => { setActualBackStakeDraft(backEvidenceAvailable ? "" : "10.00"); setAcceptedBackOddsDraft(backEvidenceAvailable ? "" : "2.00"); }} type="button">{backEvidenceAvailable ? "Show missing Back evidence" : "Restore Back evidence"}</button><button className={lab.secondaryButton} disabled={backConfirmed || !backEvidenceAvailable} onClick={() => openOperationStage(3, "back")} type="button">Review Back confirmation in Placement</button>{!backEvidenceAvailable ? <p role="status">Record the actual Back stake and accepted odds before confirming externally.</p> : null}{backConfirmed ? <button className={lab.secondaryButton} onClick={() => { openOperationStage(3); setBackReversalPending(true); }} type="button">Review Back reversal in Placement</button> : null}</> : <><p>Settlement requires a recorded result. The event date does not establish a settlement deadline.</p><button className={lab.secondaryButton} disabled type="button">Mark Settled · result missing</button><button className={lab.secondaryButton} onClick={() => openOperationStage(4, "status")} type="button">Review settlement in Finish</button><button className={lab.secondaryButton} onClick={() => openOperationStage(3, "request")} type="button">Review missing placement evidence</button></>}</section> : null}
            {warningsOpen ? <section aria-label="Recorded warnings" className={local.warningPanel} data-pd-id="lab.proposal.warnings"><h3>{warningCount} items need review</h3><ul>{!requestedLayRecorded || !laySummary.hasReachedTarget ? <li><strong>Lay match</strong> · {requestedLayRecorded ? `£${laySummary.matchedTotal.toFixed(2)} of £${Number(requestedLayStake).toFixed(2)} requested.` : "Requested stake not recorded."} <button className={lab.linkButton} onClick={() => requestedLayRecorded ? openCumulativeEditor() : openOperationStage(3, "request")} type="button">{requestedLayRecorded ? "Update matched amount" : "Review requested stake"}</button></li> : null}{!backConfirmed ? <li><strong>Back confirmation</strong> · Not recorded. <button className={lab.linkButton} onClick={() => openOperationStage(3, "back")} type="button">Review Back confirmation</button></li> : null}<li><strong>Settlement</strong> · Event date is recorded; settlement deadline is not established. <button className={lab.linkButton} onClick={() => openOperationStage(4, "status")} type="button">Review settlement</button></li></ul></section> : null}
          </section> : null}
          {amendment !== "operations" || operationWorkbenchOpen ? <div className={lab.entry} data-pd-id="lab.proposal.workbench" ref={operationWorkbenchRef}>
            <DesignBetWorkbenchContext title="Bet Workbench · simulated" context={`Profile A · ${isNewFinish ? "New placed-record example" : selectedRecord.status}`} />
            <DesignBetWorkbenchStageRail activeId={String(stage)} onSelect={id => { const next = Number(id); setStage(next); if (amendment === "operations" && (next === 3 || next === 4)) return; if (next === 0) selectAmendment("offer"); else if (next === 1) selectAmendment("requirements"); else if (next === 2 || next === 3) { selectAmendment("matching"); setStage(next); } else selectAmendment("finish"); }} stages={stages.map((label, index) => ({ id: String(index), label }))} />
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
                {amendment === "operations" ? <fieldset data-pd-id="lab.proposal.operations"><legend>{stage === 4 ? "Finish / Review" : "Placement"} · proposed ledger actions</legend>
                  {stage === 4 ? <><p className={local.previewNotice}>Arsenal v Chelsea · Profile A · synthetic Placed record. Settlement requires an actual result; the event date alone is not a deadline.</p><div className={lab.fieldPair}><label>Status<select data-operation-focus="status" defaultValue="Placed"><option>Placed</option><option>Settled</option></select></label><label>Result<select defaultValue="Pending"><option>Pending</option><option>Back Won</option><option>Lay Won</option></select></label></div><p className={local.fieldHelp}>A settled change uses the governed result and correction command in PD. This preview makes no write.</p></> : <>
                  <p className={local.previewNotice}>Arsenal v Chelsea · £10 Back plan · {requestedLayRecorded ? `£${Number(requestedLayStake).toFixed(2)} recorded Lay request` : "Lay request Not recorded"} · £{laySummary.matchedTotal.toFixed(2)} matched. No financial command is connected.</p>
                  <button className={lab.secondaryButton} onClick={() => setRequestedLayRecorded(value => !value)} type="button">{requestedLayRecorded ? "Show missing-request example" : "Restore recorded £8 request"}</button>
                  <div className={lab.fieldPair}><label>Requested Lay Stake<input data-operation-focus="request" inputMode="decimal" onChange={event => { setRequestedLayStake(event.target.value); setRequestedLayRecorded(event.target.value.trim() !== ""); }} placeholder="Not recorded" value={requestedLayRecorded ? requestedLayStake : ""} /></label><label>Actual Back stake<input data-operation-focus="back" inputMode="decimal" onChange={event => setActualBackStakeDraft(event.target.value)} placeholder="Not recorded" value={actualBackStakeDraft} /></label><label>Accepted Back odds<input inputMode="decimal" onChange={event => setAcceptedBackOddsDraft(event.target.value)} placeholder="Not recorded" value={acceptedBackOddsDraft} /></label><label>Back placement<input readOnly value={backConfirmed ? "Confirmed externally" : "Not recorded"} /></label></div>
                  <button className={lab.secondaryButton} disabled={backConfirmed || !backEvidenceAvailable} onClick={() => { setBackConfirmed(true); setNotice("Synthetic Back confirmation recorded independently; Lay evidence is unchanged."); }} type="button">Confirm external Back</button>
                  <div className={local.quickFigures}><div><span>Requested</span><strong>{requestedLayRecorded ? `£${Number(requestedLayStake).toFixed(2)}` : "Not recorded"}</strong></div><div><span>Matched</span><strong>£{laySummary.matchedTotal.toFixed(2)}</strong></div><div><span>Remaining</span><strong>{laySummary.remainingToMatch === null ? "Not recorded" : `£${Math.max(0, laySummary.remainingToMatch).toFixed(2)}`}</strong></div></div>
                  <p className={local.inlineStatus}>{!requestedLayRecorded ? "Request not recorded · completion unknown" : laySummary.hasReachedTarget ? "Fully matched" : "Partially matched"}</p>
                  <div className={local.switchRow}><button className={lab.primaryButton} disabled={!requestedLayRecorded || laySummary.hasReachedTarget} onClick={openCumulativeEditor} type="button">Update matched amount</button><button className={lab.secondaryButton} disabled={!requestedLayRecorded || laySummary.hasReachedTarget} onClick={() => { setCumulativeDraft(requestedLayStake); setQuickActionOpen(true); }} type="button">{laySummary.remainingToMatch === null ? "Confirm remaining · request unknown" : `Confirm remaining £${Math.max(0, laySummary.remainingToMatch).toFixed(2)} matched`}</button></div>
                  {!requestedLayRecorded ? <p className={local.fieldHelp}>Record the requested Lay stake in Placement before confirming a remaining amount.</p> : null}
                  {quickActionOpen ? <section aria-label="Update matched amount" className={local.warningPanel} data-pd-id="lab.proposal.quick-action"><h3>Update matched amount</h3><label>Matched so far<input inputMode="decimal" onChange={event => setCumulativeDraft(event.target.value)} value={cumulativeDraft} /></label><p>Enter the total actually matched. The next fill is the difference from £{laySummary.matchedTotal.toFixed(2)} already recorded at Matchbook · odds 2.00. Changed odds, exchange or ambiguous legs require Placement review.</p><div className={local.switchRow}><button className={lab.secondaryButton} onClick={() => { setQuickActionOpen(false); setCumulativeDraft(laySummary.matchedTotal.toFixed(2)); }} type="button">Cancel</button><button className={lab.primaryButton} onClick={confirmCumulativeEditor} type="button">Confirm actual match</button></div></section> : null}
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
                  <button className={lab.secondaryButton} onClick={() => { setOperationWorkbenchOpen(false); setQuickActionOpen(false); setNotice(""); }} type="button">Return to ledger</button>
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
                  ? <p role="status">{outcomeState === "unavailable" ? "Outcome unavailable: required source values are not recorded." : "Outcome unavailable: requested lay or partial-fill evidence is not complete."}</p>
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
              <span className={local.footerMessage}>Proposal only · no Save command is connected</span>
              {amendment === "protected" ? reviewClosed
                ? <button className={lab.secondaryButton} onClick={() => setReviewClosed(false)} type="button">Reopen protected review</button>
                : <DesignBetWorkbenchProtectedActions correction={correction}
                    onCancel={() => { setReviewClosed(true); setNotice("Protected review closed; no record changed."); }}
                    onCancelCorrection={() => { setCorrection(false); setNotice("Correction draft abandoned; protected review remains open."); }}
                    onReviewCorrection={() => { setCorrection(true); setNotice("Correction editor opened; no write was made."); }}
                    onSaveCorrection={() => setNotice("Save Audited Correction simulated; no record changed.")} />
                : <>
                  {amendment === "finish" && !isNewFinish ? <details className={lab.footerMore}><summary>More actions</summary><button className={lab.dangerButton} onClick={() => setNotice("Destructive action preview only; no record changed.")} type="button">Delete record · preview</button></details> : null}
                  <button className={lab.secondaryButton} onClick={() => setNotice("Preview cancelled; no record changed.")} type="button">Cancel</button>
                  <button className={lab.primaryButton} onClick={() => setNotice("Primary action simulated; no bet was placed, settled or saved.")} type="button">{isNewFinish ? "Finish Placed Record" : "Save Existing Bet"}</button>
                </>}
            </div>
          </div> : null}
        </main>
      </div>
    </div>
  </div>;
}
