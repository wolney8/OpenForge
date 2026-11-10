"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { DesignLabSelect } from "@/components/design-lab-select";
import { DesignLabHeaderOverlay } from "@/components/design-lab-header-overlay";
import { DesignLabAuth, type LabSessionState } from "@/components/design-lab-auth";
import { DesignLabOnboarding } from "@/components/design-lab-onboarding";
import { DesignLabNotifications } from "@/components/design-lab-notifications";
import { DesignPageHead } from "@/components/design-ledger-screen";
import { DesignLabReportChart } from "@/components/design-lab-report-chart";
import { DesignReportSurface, DesignReportSourceRows, designReportClasses } from "@/components/design-report-presentation";
import { DesignManagementSurface } from "@/components/design-management-presentation";
import { DesignLabSpecialistConcept } from "@/components/design-lab-specialist-concept";
import { DesignLabFreeBetWorkflow, DesignLabCasinoWorkflow } from "@/components/design-lab-financial-workflows";
import { DesignLabSubscriberPreview } from "@/components/design-lab-subscriber-preview";
import { DesignLabOfferWorkflow, DesignLabPositionTable, type LabTaskWorkState } from "@/components/design-lab-operations";
import { DesignLabToday, initialLabTodayView, type LabTodayViewState } from "@/components/design-lab-today";
import { DesignPositionMetrics, DesignPositionWorkGrid, DesignPositionSurface, DesignPositionSectionHead, DesignPositionTask, DesignPositionShortcut, designPositionActionClasses } from "@/components/design-position-presentation";
import { DesignLabTaskState } from "@/components/design-lab-task-state";
import { DesignTrackedTaskRow } from "@/components/design-tracked-task-row";
import { DesignLabLedgerGrid, defaultLabLedgerView, type LabLedgerView, type LabLedgerRow } from "@/components/design-lab-ledger-grid";
import { ModalBoundary } from "@/components/modal-boundary";
import { useTheme } from "@/components/theme-provider";
import { aggregateFinancialValues } from "@/lib/financial-aggregate";
import { formatFinancialValue } from "@/lib/financial-display";
import { getStandardQualifyingErrors } from "@/lib/standard-qualifying-calculator";
import { hasCompleteDecimalInputSyntax } from "@/lib/sportsbook-odds-input";
import { initialLabAccounts, labAccountBalanceError, labProfiles, saveLabAccountBalance, summarizeDesignLab, type LabAccount, type LabProfileId, type LabScope, type LabRange } from "@/lib/design-lab-fixture";
import { labLedgerColumns, labLedgerColumnSpecs, labQualifyingFixture, labRecordInputs, labRecords, labReportPoints, type LabLedgerKey, type LabRecord } from "@/lib/design-lab-connected-data";
import { displayLabLocalDate, evaluateLabFieldEdit, labFieldDisplayColumn, nextLabReviewTracking, type LabEditResult, type LabFieldChange, type LabReviewTracking } from "@/lib/design-lab-field-edit";
import { buildLabReviewTasks, buildLabTodayTasks, labTaskDateLabel, labTaskNeedsUrgentReview, sortLabTodayTasks, type LabTodayTask } from "@/lib/design-lab-operations";
import { activeLabNotificationEvents, buildLabNotificationEvents } from "@/lib/design-lab-notification-policy";
import { labDestination, labDestinationLabel, labDestinations, type LabSection } from "@/lib/design-lab-navigation";
import { cp116LabRecords, initialFreeBetJourney, initialCasinoJourney } from "@/lib/design-lab-financial-journeys";
import styles from "./design-lab-connected.module.css";

type Section = LabSection;
type EntryMode = "modal" | "page";
type BetState = "Draft" | "Prospecting" | "Placed" | "Settled";
type Overlay = "launcher" | "notifications" | "tracked" | "help" | "identity" | null;
const sectionName = labDestinationLabel;
const money = (value: number) => value === 0 ? "£0.00" : formatFinancialValue(value);
function Icon({ children }: { children: ReactNode }) { return <span aria-hidden="true" className="material-symbols-outlined">{children}</span>; }

type LabBetDraft = { event: string; offerText: string; offerName: string; offerType: string; betType: string; fixtureType: string; eventDate: string; bookmaker: string; exchange: string; backStake: string; backOdds: string; layOdds: string; requestedLayStake: string; matchedLayStake: string; commission: string; strategy: string };
const initialBet: LabBetDraft = { event: "", offerText: "", offerName: "", offerType: "Qualifying", betType: "Normal", fixtureType: "Football", eventDate: "", bookmaker: "", exchange: "Exchange A", backStake: "", backOdds: "", layOdds: "", requestedLayStake: "", matchedLayStake: "", commission: "", strategy: "Standard" };
const initialNotificationEvents = buildLabNotificationEvents(buildLabTodayTasks(labRecords, initialLabAccounts, "all"));

export function DesignLabConnected() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [accounts, setAccounts] = useState<LabAccount[]>(initialLabAccounts);
  const [section, setSection] = useState<Section>("home");
  const [scope, setScope] = useState<LabScope>("all");
  const [range, setRange] = useState<LabRange>("Last Month");
  const [collapsed, setCollapsed] = useState(false);
  const [trackerExpanded, setTrackerExpanded] = useState(true);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [showMore, setShowMore] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResultsOpen, setSearchResultsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [ledgerViews, setLedgerViews] = useState<Partial<Record<LabLedgerKey, LabLedgerView>>>({});
  const [savedViews, setSavedViews] = useState<Partial<Record<LabLedgerKey, LabLedgerView>>>({});
  const ledgerScroll = useRef<Partial<Record<LabLedgerKey, { left: number; top: number }>>>({});
  const [selected, setSelected] = useState<LabRecord | null>(null);
  const [previewEditor, setPreviewEditor] = useState<{ section: LabLedgerKey; mode: "Add" | "Edit" } | null>(null);
  const [financialWorkbenchDirty,setFinancialWorkbenchDirty] = useState(false);
  const [previewStage, setPreviewStage] = useState("Offer Setup");
  const [returnSection, setReturnSection] = useState<Section>("home");
  const [returnScope, setReturnScope] = useState<LabScope>("all");
  const [copiedRows, setCopiedRows] = useState<LabRecord[]>([]);
  const [cp116JourneyStarted,setCp116JourneyStarted] = useState(false);
  const [freeBetJourney,setFreeBetJourney] = useState(initialFreeBetJourney);
  const [casinoJourney,setCasinoJourney] = useState(initialCasinoJourney);
  const cp116Records = useMemo(()=>cp116JourneyStarted?cp116LabRecords(freeBetJourney,casinoJourney):[],[cp116JourneyStarted,freeBetJourney,casinoJourney]);
  const [labLedgerOverrides, setLabLedgerOverrides] = useState<Record<string,Record<number,string>>>({});
  const [labInputOverrides, setLabInputOverrides] = useState<Record<string,Record<string,string>>>({});
  const [labEditHistory, setLabEditHistory] = useState<Record<string,string[]>>({});
  const [labReviewTracking, setLabReviewTracking] = useState<Record<string,LabReviewTracking>>({});
  const labReviewIndicators: Record<string,string[]> = Object.fromEntries(Object.entries(labReviewTracking).map(([id,tracking])=>[id,[...new Set(Object.values(tracking.causes).flat())]]));
  const [reviewContext, setReviewContext] = useState<{recordId:string; sourceFields:string[]; affectedFields:string[]; targetField:string}|null>(null);
  const [todayView, setTodayView] = useState<LabTodayViewState>(initialLabTodayView);
  const todayScrollRef = useRef<number | null>(null);
  const [labTaskStates, setLabTaskStates] = useState<Record<string, LabTaskWorkState>>({});
  const [labBlockedReasons, setLabBlockedReasons] = useState<Record<string,string>>({});
  const [labReviewDates, setLabReviewDates] = useState<Record<string,string>>({});
  const [trackedTaskSnapshots, setTrackedTaskSnapshots] = useState<LabTodayTask[]>([]);
  const [resolvingTaskIds, setResolvingTaskIds] = useState<string[]>([]);
  const resolvedTransitionIds = useRef(new Set<string>());
  const resolutionTimers = useRef(new Map<string, number>());
  const [trackedNotice, setTrackedNotice] = useState("");
  const [currentTrackedTaskId, setCurrentTrackedTaskId] = useState<string | null>(null);
  const [taskBannerState, setTaskBannerState] = useState<"expanded" | "compact" | "hidden">("expanded");
  const [todayBoardScrollLeft, setTodayBoardScrollLeft] = useState(0);
  const [labAuth, setLabAuth] = useState<LabSessionState>("authenticated");
  const [onboarding, setOnboarding] = useState(false);
  const [newLabProfile, setNewLabProfile] = useState<{ name: string; code: string } | null>(null);
  const [subscriberPreview, setSubscriberPreview] = useState(false);
  const [notificationRead, setNotificationRead] = useState<string[]>([]);
  const [notificationCleared, setNotificationCleared] = useState<string[]>([]);
  const [editingAccount, setEditingAccount] = useState<LabAccount | null>(null);
  const [balanceDraft, setBalanceDraft] = useState("");
  const [accountError, setAccountError] = useState("");
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [correctionMode, setCorrectionMode] = useState(false);
  const [step, setStep] = useState(0);
  const [backConfirmed, setBackConfirmed] = useState(false);
  const [layConfirmed, setLayConfirmed] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [accountObservedAt, setAccountObservedAt] = useState<Record<string,string>>({});
  const [accountAudit, setAccountAudit] = useState<Record<string,string[]>>({});
  const [bet, setBet] = useState(initialBet);
  const [savedBet, setSavedBet] = useState(initialBet);
  const [editingExistingId, setEditingExistingId] = useState<string | null>(null);
  const [existingBet, setExistingBet] = useState<LabBetDraft>(initialBet);
  const [existingOriginal, setExistingOriginal] = useState<LabBetDraft>(initialBet);
  const [existingBackConfirmed, setExistingBackConfirmed] = useState<boolean | null>(null);
  const [existingLayConfirmed, setExistingLayConfirmed] = useState<boolean | null>(null);
  const [betState, setBetState] = useState<BetState>("Draft");
  const [betOwnerProfileId, setBetOwnerProfileId] = useState<LabProfileId | null>(null);
  const [audit, setAudit] = useState<string[]>([]);
  const [entryError, setEntryError] = useState("");
  const [matchingOpen, setMatchingOpen] = useState(false);
  const [dirtyConfirm, setDirtyConfirm] = useState(false);
  const [failedSave, setFailedSave] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const headerTriggerRef = useRef<HTMLElement | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const navTriggerRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summary = useMemo(() => summarizeDesignLab(accounts, scope, range), [accounts, scope, range]);
  const betProfile = betOwnerProfileId ?? (scope === "all" ? null : scope);
  const recordedBetProfile = betOwnerProfileId ?? (scope === "all" ? "LAB-PROFILE-A" : scope);
  const fixtureMatches = bet.bookmaker === "Bookmaker A" && bet.exchange === "Exchange A" && bet.backStake === labQualifyingFixture.backStake && bet.backOdds === labQualifyingFixture.backOdds && bet.layOdds === labQualifyingFixture.layOdds && bet.requestedLayStake === labQualifyingFixture.layStake && bet.commission === labQualifyingFixture.commission && bet.strategy === "Standard";
  const layIsPartial = layConfirmed && Number(bet.matchedLayStake) < Number(bet.requestedLayStake);
  const newBetInScope = scope === "all" || scope === recordedBetProfile;
  const cp116FreeSettled = freeBetJourney.children.filter(child=>child.status==="Settled"&&child.finalPnl!==null&&(scope==="all"||scope===freeBetJourney.profileId)&&range==="This Year");
  const cp116CasinoSettled = casinoJourney.status==="Settled"&&(scope==="all"||scope===casinoJourney.profileId)&&range==="This Year";
  const sportsbookRealised = aggregateFinancialValues([summary.realised.knownValue, ...(betState === "Settled" && newBetInScope && range === "This Year" ? [fixtureMatches && !layIsPartial ? -0.62 : Number.NaN] : [])]);
  const realisedWithNew = aggregateFinancialValues([sportsbookRealised.knownValue, ...cp116FreeSettled.map(child=>Number(child.finalPnl)), ...(cp116CasinoSettled?[Number(casinoJourney.confirmedNetResult)]:[])]);
  const exposureWithNew = aggregateFinancialValues([summary.exposure.knownValue, ...(betState === "Placed" && newBetInScope ? [fixtureMatches && !layIsPartial ? Number(labQualifyingFixture.liability) : Number.NaN] : [])]);
  const reportPoints = [
    ...labReportPoints.filter(point => (scope === "all" || point.profileId === scope) && (range === "This Year" || point.month === "Oct")),
    ...(betState === "Settled" && newBetInScope && range === "This Year" && fixtureMatches && !layIsPartial ? [{ id: "LAB-SB-NEW", date: "1 Nov", value: -0.62 }] : []),
  ].sort((a, b) => ({ "12 Sep": 0, "20 Sep": 1, "8 Oct": 2, "15 Oct": 3, "1 Nov": 4 }[a.date as "12 Sep" | "20 Sep" | "8 Oct" | "15 Oct" | "1 Nov"] - { "12 Sep": 0, "20 Sep": 1, "8 Oct": 2, "15 Oct": 3, "1 Nov": 4 }[b.date as "12 Sep" | "20 Sep" | "8 Oct" | "15 Oct" | "1 Nov"]));
  const betDirty = entryMode !== null && (editingExistingId ? JSON.stringify(existingBet) !== JSON.stringify(existingOriginal) : JSON.stringify(bet) !== JSON.stringify(betState === "Draft" ? initialBet : savedBet));
  const accountDirty = editingAccount !== null && balanceDraft !== editingAccount.currentBalance;
  const newBetRecord = useMemo<LabRecord | null>(() => betState === "Draft" ? null : { id: "LAB-SB-NEW", profileId: recordedBetProfile, section: "sportsbook", title: bet.event || bet.offerName || "Offer captured · event pending", subtitle: `${bet.bookmaker} · ${bet.strategy}`, status: betState, cells: [bet.eventDate || "Not entered", bet.bookmaker, bet.event || "Event pending", bet.offerName || "—", bet.offerText || "—", bet.strategy, layConfirmed ? layIsPartial ? "Partially laid" : "Matched" : "Not confirmed", backConfirmed ? "Confirmed" : "Not confirmed", betState === "Settled" && fixtureMatches && !layIsPartial ? "£ (0.62)" : betState === "Prospecting" ? "Planning · unavailable" : fixtureMatches && !layIsPartial ? "Current £ (0.62)" : "Current · unavailable", betState, "Open"] }, [betState, recordedBetProfile, bet, layConfirmed, layIsPartial, backConfirmed, fixtureMatches]);
  const records = useMemo(() => {
    const listed = [...copiedRows, ...labRecords, ...cp116Records].filter(item => scope === "all" || item.profileId === scope).map(item => {
      const patch = labLedgerOverrides[item.id];
      if (!patch) return item;
      const titleColumn = ({ sportsbook:2, casino:3, extraPlace:1 } as Partial<Record<LabLedgerKey,number>>)[item.section];
      return {
        ...item,
        cells: item.cells.map((cell,index) => patch[index] ?? cell),
        title: titleColumn !== undefined && patch[titleColumn] ? patch[titleColumn] : item.title,
      };
    });
    return newBetRecord && (scope === "all" || scope === recordedBetProfile) ? [newBetRecord, ...listed] : listed;
  }, [scope, copiedRows, cp116Records, labLedgerOverrides, recordedBetProfile, newBetRecord]);
  const reviewTasks = useMemo(() => buildLabReviewTasks([...copiedRows,...labRecords,...cp116Records,...(newBetRecord?[newBetRecord]:[])],labReviewTracking,"all"),[copiedRows,cp116Records,labReviewTracking,newBetRecord]);
  const allTodayTasks = useMemo(() => [...buildLabTodayTasks([...copiedRows, ...labRecords, ...cp116Records.filter(item=>item.id!==freeBetJourney.sourceId)], accounts, "all"),...reviewTasks], [copiedRows, cp116Records, freeBetJourney.sourceId, accounts, reviewTasks]);
  const liveNotificationEvents = useMemo(() => buildLabNotificationEvents(allTodayTasks), [allTodayTasks]);
  const trackedTaskIds = trackedTaskSnapshots.map(task => task.id);
  const trackedEntries = trackedTaskSnapshots.map(snapshot => {
    const live = allTodayTasks.find(task => task.id === snapshot.id);
    return { task: live ?? snapshot, sourceResolved: !live && snapshot.group === "Needs Action" };
  });
  const trackedTasks = trackedEntries.filter(item => resolvingTaskIds.includes(item.task.id) || (labTaskStates[item.task.id] ?? "To Do") !== "Done");
  const trackedPreview = sortLabTodayTasks(trackedTasks.map(item => item.task), "Priority").slice(0, 5).map(task => trackedTasks.find(item => item.task.id === task.id)!);
  const completedTrackedTasks = trackedEntries.filter(item => !resolvingTaskIds.includes(item.task.id) && labTaskStates[item.task.id] === "Done");
  useEffect(() => {
    for (const snapshot of trackedTaskSnapshots) {
      if (snapshot.group !== "Needs Action" || allTodayTasks.some(task => task.id === snapshot.id) || resolvedTransitionIds.current.has(snapshot.id)) continue;
      resolvedTransitionIds.current.add(snapshot.id);
      setLabTaskStates(current => ({...current,[snapshot.id]:"Done"}));
      setResolvingTaskIds(current => [...current,snapshot.id]);
      setTrackedNotice(`${snapshot.title} — Source Resolved`);
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1000;
      resolutionTimers.current.set(snapshot.id,window.setTimeout(() => {
        setResolvingTaskIds(current => current.filter(id => id !== snapshot.id));
        resolutionTimers.current.delete(snapshot.id);
      },duration));
    }
  },[allTodayTasks,trackedTaskSnapshots]);
  useEffect(() => { const timers = resolutionTimers.current; return () => {for(const timer of timers.values()) clearTimeout(timer);}; },[]);
  const currentTrackedTask = trackedTasks.find(item => item.task.id === currentTrackedTaskId)?.task ?? trackedTasks[0]?.task;
  const allNotificationEvents = [...new Map([...initialNotificationEvents, ...liveNotificationEvents].map(event => [event.id, event])).values()];
  const currentNotificationEvents = activeLabNotificationEvents(allNotificationEvents, allTodayTasks, scope);
  const unreadNotifications = currentNotificationEvents.filter(event => event.priority === "Action Required" && !notificationRead.includes(event.id) && !notificationCleared.includes(event.id)).length;
  const searchIndex = useMemo(() => [
    ...accounts.map(item => ({ id: item.id, title: item.name, kind: "Accounts", context: item.type, profileId: item.profileId, section: "accounts" as Section })),
    ...records.map(item => ({ id: item.id, title: item.title, kind: sectionName(item.section), context: item.subtitle, profileId: item.profileId, section: item.section as Section })),
    { id: "LAB-REPORT-PNL", title: "Performance and P&L", kind: "Reports", context: "Settled results", profileId: "LAB-PROFILE-A", section: "reports" as Section },
    { id: "LAB-REPORT-EXPOSURE", title: "Open exposure", kind: "Reports", context: "Committed positions", profileId: "LAB-PROFILE-A", section: "reports" as Section },
  ], [accounts, records]);
  const searchResults = search.trim() ? searchIndex.filter(item => search.trim().toLowerCase().split(/\s+/).every(word => [item.title, item.kind, item.context].join(" ").toLowerCase().includes(word))).slice(0, 12) : [];
  const selectedAccount = selected?.section === "accounts" ? accounts.find(item => item.id === selected.id) : null;
  const selectedIsNewBet = selected?.id === "LAB-SB-NEW";

  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [section, selected, entryMode]);
  useEffect(() => {
    if (!reviewContext || entryMode !== "page" || (editingExistingId ?? (selectedIsNewBet ? "LAB-SB-NEW" : null)) !== reviewContext.recordId) return;
    const frame=requestAnimationFrame(()=>{
      const field=reviewContext.targetField === "match_strategy" ? document.querySelector<HTMLElement>('[data-pd-id="lab.bet.strategy"] button') : null;
      (field ?? document.querySelector<HTMLElement>('[data-pd-id="lab.review.target"]'))?.focus({preventScroll:true});
    });
    return ()=>cancelAnimationFrame(frame);
  },[reviewContext,entryMode,editingExistingId,selectedIsNewBet,step]);
  useEffect(() => {
    if (!reviewContext || !previewEditor || selected?.id !== reviewContext.recordId) return;
    const frame=requestAnimationFrame(()=>document.querySelector<HTMLElement>('[data-pd-id="lab.review.target"]')?.focus({preventScroll:true}));
    return ()=>cancelAnimationFrame(frame);
  },[reviewContext,previewEditor,selected]);
  useEffect(() => {
    if (section !== "tasks" || selected || todayScrollRef.current === null) return;
    const y = todayScrollRef.current;
    todayScrollRef.current = null;
    const frame = requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, [section, selected]);
  useEffect(() => {
    if (!mobileNav) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMobileNav(false); navTriggerRef.current?.focus(); }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileNav]);
  useEffect(() => {
    if (!accountDirty && !betDirty) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [accountDirty, betDirty]);

  function guarded(action: () => void) {
    if (accountDirty || financialWorkbenchDirty || (entryMode !== null && betDirty)) {
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      pendingAction.current = action;
      setDirtyConfirm(true);
      return;
    }
    action();
  }
  function go(next: Section, after?: () => void) { guarded(() => { setSelected(null); setPreviewEditor(null); setEntryMode(null); setSection(next); if (labDestination(next).parent === "tracker") setTrackerExpanded(true); if (labDestination(next).group === "more") setShowMore(true); setMobileNav(false); setOverlay(null); setSearch(""); setSearchOpen(false); setSearchResultsOpen(false); if (after) requestAnimationFrame(after); }); }
  function toggleOverlay(next: Exclude<Overlay,null>, trigger: HTMLElement) { headerTriggerRef.current = trigger; setSearchResultsOpen(false); if (next === "tracked" && taskBannerState === "expanded") setTaskBannerState("compact"); setOverlay(current => current === next ? null : next); }
  function openRecord(record: LabRecord) { guarded(() => { if (!selected) { setReturnSection(section); setReturnScope(scope); } setReviewContext(null); setSelected(record); setPreviewEditor(null); setPreviewStage(record.section === "freeBets" ? "Available" : "Offer Setup"); setSection(record.section); setTrackerExpanded(true); setSearch(""); setSearchOpen(false); }); }
  function openAccount(account: LabAccount) { openRecord({ id: account.id, profileId: account.profileId, section: "accounts", title: account.name, subtitle: account.type, status: account.status, cells: [account.id, account.name, account.type, account.status, "Yes", account.currentBalance ? money(Number(account.currentBalance)) : "Unknown", "—", accountObservedAt[account.id] ?? "—", "—", "—", "—", "Open"].map((cell,index)=>labLedgerOverrides[account.id]?.[index]??cell) }); }
  function openEntry(mode: EntryMode) { setReviewContext(null); setEditingExistingId(null); setCorrectionMode(false); setEntryError(""); setEntryMode(mode); setStep(0); setSelected(null); setMobileNav(false); }
  function openExistingEntry(record: LabRecord, column?: number) {
    if(!selected){setReturnSection(section);setReturnScope(scope);}
    const source={...labRecordInputs[record.id],...record.sourceInputs,...labInputOverrides[record.id]};
    const draft: LabBetDraft={...initialBet,offerType:source.offer_type??"",betType:source.bet_type??"",fixtureType:source.fixture_type??"",event:source.event_name??"",offerName:source.offer_name??"",offerText:source.offer_details??"",bookmaker:source.bookmaker??"",strategy:source.match_strategy??"",eventDate:source.date_settled??"",exchange:source.exchange??"",backStake:source.back_stake??"",backOdds:source.back_odds??"",layOdds:source.lay_odds??"",requestedLayStake:source.requested_lay_stake??"",matchedLayStake:source.matched_lay_stake??"",commission:source.commission??""};
    setExistingBet(draft);setExistingOriginal(draft);setExistingBackConfirmed(record.execution?.backConfirmed ?? null);setExistingLayConfirmed(record.execution?.layConfirmed ?? null);setEditingExistingId(record.id);setCorrectionMode(column===6||column===7||column===5||column===8);setCorrectionReason("");setEntryMode("page");setStep(column===9?3:column===6||column===7||column===5||column===8?2:0);setSelected(record);setSection("sportsbook");setEntryError("");
  }
  function openDependencyReview(record: LabRecord, column: number) {
    const causes = labReviewTracking[record.id]?.causes ?? {};
    const sourceFields = Object.keys(causes);
    const affectedFields = [...new Set(Object.values(causes).flat())];
    const targetField = sourceFields[0] ?? labLedgerColumnSpecs(record.section)[column]?.id ?? "";
    setReviewContext(sourceFields.length ? {recordId:record.id,sourceFields,affectedFields,targetField} : null);
    if(record.id === "LAB-SB-NEW") {
      setReturnSection(section);setReturnScope(scope);setSelected(record);setEntryMode("page");setEditingExistingId(null);
      setCorrectionMode(betState === "Placed" || betState === "Settled");
      setStep(affectedFields.some(field=>["status","result"].includes(field)) ? 4 : affectedFields.includes("back_bet_status") ? 3 : 2);
      return;
    }
    if(record.section === "sportsbook") {
      openExistingEntry(record,column);
      if(sourceFields.length) setStep(affectedFields.some(field=>["status","result"].includes(field)) ? 4 : affectedFields.includes("back_bet_status") ? 3 : 2);
    } else {
      if(!selected){setReturnSection(section);setReturnScope(scope);}
      setSelected(record);setPreviewEditor({section:record.section,mode:"Edit"});setSection(record.section);
    }
  }
  function applyLabFieldEdits(record: LabRecord, changes: LabFieldChange[], originals: Record<string,string>, intent: "inline" | "workbench", reason = ""): LabEditResult {
    const eligible=accounts.filter(account=>account.profileId===record.profileId && account.status==="Active");
    const eligibleAccounts=eligible.map(account=>account.name);
    const eligibleAccountsByField={bookmaker:eligible.filter(account=>account.type==="Bookie").map(account=>account.name),exchange:eligible.filter(account=>account.type==="Exchange").map(account=>account.name),linked_account:eligibleAccounts};
    const result=evaluateLabFieldEdit({record,changes,originals,intent,eligibleAccounts,eligibleAccountsByField,correctionReason:reason});
    if(result.outcome==="APPLIED" && failedSave){setFailedSave(false);return {outcome:"VALIDATION_FAILED",message:"Simulated save failed. Your entry is retained; retry the edit."};}
    if(result.outcome!=="APPLIED" || !result.changes) return result;
    const appliedChanges=result.changes;
    const nextReview=nextLabReviewTracking(labReviewTracking[record.id],record.section,appliedChanges,originals);
    const remainingReview=new Set(Object.values(nextReview.causes).flat());
    if(record.id==="LAB-SB-NEW") {
      const map:Record<string,keyof LabBetDraft>={event_name:"event",offer_name:"offerName",offer_details:"offerText",bookmaker:"bookmaker",match_strategy:"strategy",date_settled:"eventDate"};
      const patch:Partial<LabBetDraft>={};
      for(const change of result.changes) if(map[change.field]) Object.assign(patch,{[map[change.field]]:change.value});
      setBet(current=>({...current,...patch}));
      setSavedBet(current=>({...current,...patch}));
      setAudit(current=>[...current,`2 Nov 2026 · Lab Fund Manager · ${appliedChanges.map(change=>`${labLedgerColumnSpecs(record.section).find(spec=>spec.id===change.field)?.label??change.field}: ${originals[change.field]??""} → ${change.value}`).join(", ")} · ${intent} synthetic audit`]);
    } else {
      const sourcePatch=Object.fromEntries(result.changes.map(change=>[change.field,change.value]));
      const displayPatch:Record<number,string>={};
      for(const change of result.changes){const index=labFieldDisplayColumn(record.section,change.field);if(index>=0){const kind=labLedgerColumnSpecs(record.section)[index].kind;displayPatch[index]=!change.value?"—":kind==="money"?(Number(change.value)===0?"£0.00":formatFinancialValue(Number(change.value))):kind==="date"?displayLabLocalDate(change.value):change.value;}}
      const financial=result.changes.some(change=>["financial-input","planning-choice","planning-account"].includes(labLedgerColumnSpecs(record.section).find(spec=>spec.id===change.field)?.edit??""));
      if(financial && result.reviewFields?.includes("displayed_value")){const index=labFieldDisplayColumn(record.section,"displayed_value");if(index>=0)displayPatch[index]=remainingReview.has("displayed_value")?"Unavailable":labRecords.find(item=>item.id===record.id)?.cells[index]??record.cells[index];}
      setLabInputOverrides(current=>({...current,[record.id]:{...current[record.id],...sourcePatch}}));
      setLabLedgerOverrides(current=>({...current,[record.id]:{...current[record.id],...displayPatch}}));
      setLabEditHistory(current=>({...current,[record.id]:[...(current[record.id]??[]),`2 Nov 2026 · Lab Fund Manager · ${appliedChanges.map(change=>`${labLedgerColumnSpecs(record.section).find(spec=>spec.id===change.field)?.label??change.field}: ${originals[change.field]??""} → ${change.value}`).join(", ")} · ${intent} synthetic audit${reason?` · reason: ${reason}`:""}`]}));
    }
    setLabReviewTracking(current=>({...current,[record.id]:nextLabReviewTracking(current[record.id],record.section,appliedChanges,originals)}));
    return result;
  }
  function saveExistingBet() {
    if (!editingExistingId || !selected) return;
    const changed=Object.entries(existingBet).filter(([key,value])=>value!==existingOriginal[key as keyof LabBetDraft]);
    if (!changed.length) {setEntryMode(null);return;}
    if (failedSave) {setFailedSave(false);setEntryError("Simulated save failed. Your entered values are retained.");return;}
    const fieldMap:Record<string,string>={event:"event_name",offerName:"offer_name",offerText:"offer_details",bookmaker:"bookmaker",strategy:"match_strategy",eventDate:"date_settled",offerType:"offer_type",betType:"bet_type",fixtureType:"fixture_type",exchange:"exchange",backStake:"back_stake",backOdds:"back_odds",layOdds:"lay_odds",requestedLayStake:"requested_lay_stake",matchedLayStake:"matched_lay_stake",commission:"commission"};
    const originalSource=Object.fromEntries(Object.entries(existingOriginal).map(([field,value])=>[fieldMap[field]??field,value]));
    const result=applyLabFieldEdits(selected,changed.map(([field,value])=>({field:fieldMap[field]??field,value})),originalSource,"workbench",correctionReason);
    if(["VALIDATION_FAILED","UNAVAILABLE","GOVERNED_CORRECTION_REQUIRED","REVIEW_REQUIRED"].includes(result.outcome)){setEntryError(result.message??"Review this change in the governed workflow.");return;}
    setEntryMode(null);setEditingExistingId(null);setReviewContext(null);setEntryError("");setSelected(null);setSection("sportsbook");
  }
  function closeEntry() { guarded(() => { setEntryMode(null); setEditingExistingId(null); setReviewContext(null); setEntryError(""); }); }
  function saveAccount() {
    if (!editingAccount) return;
    const error = labAccountBalanceError(balanceDraft);
    if (error) { setAccountError(error); return; }
    if (failedSave) { setFailedSave(false); setAccountError("Simulated save failed. Your entry is retained."); return; }
    setAccounts(current => saveLabAccountBalance(current, editingAccount.id, balanceDraft));
    setAccountObservedAt(current => ({...current, [editingAccount.id]: "1 Nov 2026 · synthetic confirmed observation"}));
    setAccountAudit(current => ({...current,[editingAccount.id]:[...(current[editingAccount.id] ?? []),`1 Nov 2026 · confirmed ${balanceDraft === "0.00" ? "authoritative zero" : "observed balance"} · simulation`]}));
    setEditingAccount(null); setAccountError("");
    setSelected(null); setSection(returnSection === "tasks" ? "tasks" : "accounts");
    if (returnSection === "tasks") setScope(returnScope);
  }
  function saveBet(next: BetState) {
    if (!betProfile) { setEntryError("Choose the owning Profile before saving this synthetic bet."); return; }
    if (!bet.offerText.trim() && !bet.offerName.trim()) { setEntryError("Capture the original offer text or an Offer Name before saving."); return; }
    if (!bet.bookmaker) { setEntryError("Choose a Bookmaker before saving."); return; }
    if (next === "Placed" && !bet.event.trim()) { setEntryError("Enter Event Name before finishing the Placed record. Matching can happen first."); return; }
    if (next === "Placed" && (!backConfirmed || !layConfirmed)) { setEntryError("Confirm both external Back and Lay activity before finishing the Placed record."); return; }
    if (next === "Placed") { const error = Object.values(getStandardQualifyingErrors({backStake:bet.backStake,backOdds:bet.backOdds,layOdds:bet.layOdds,exchangeCommission:bet.commission})).find(Boolean); if (error) { setEntryError(error); return; } }
    if (next === "Placed" && (!Number.isFinite(Number(bet.matchedLayStake)) || Number(bet.matchedLayStake) <= 0 || Number(bet.matchedLayStake) > Number(bet.requestedLayStake))) { setEntryError("Enter a matched Lay Stake greater than zero and no more than the requested Lay Stake."); return; }
    if (failedSave) { setFailedSave(false); setEntryError("Simulated save failed. The draft is retained."); return; }
    if (betState === "Draft") setBetOwnerProfileId(betProfile);
    setBetState(next); setSavedBet(bet); setAudit(current => [...current, `${next} · simulated · 1 Nov 2026`]); setEntryError(""); setEntryMode(null); setSection("sportsbook");
  }
  function settle(result: "Back wins" | "Lay wins") {
    if (!fixtureMatches || layIsPartial) { setEntryError("Settlement simulation has no governed outcome fixture for a partial or edited lay."); return; }
    setBetState("Settled"); setAudit(current => [...current, `Settled: ${result} · simulated · 1 Nov 2026`]); setSelected(null); setSection("reports");
  }
  function saveCorrection() {
    if (!correctionReason.trim()) { setEntryError(`Enter a correction reason for this ${betState.toLowerCase()} record.`); return; }
    if (!bet.event.trim()) { setEntryError("Enter Event Name before correction."); return; }
    if (betState === "Settled" && !fixtureMatches) { setEntryError("Restore the validated fixture values before correcting this settled sample."); return; }
    if (betState === "Placed" && (!backConfirmed || !layConfirmed)) { setEntryError("Reconfirm the actual external Back and Lay execution before saving a placed correction."); return; }
    if (betState === "Placed") { const error = Object.values(getStandardQualifyingErrors({backStake:bet.backStake,backOdds:bet.backOdds,layOdds:bet.layOdds,exchangeCommission:bet.commission})).find(Boolean); if (error) { setEntryError(error); return; } }
    if (failedSave) { setFailedSave(false); setEntryError("Simulated save failed. The correction remains editable."); return; }
    setAudit(current => [...current, `${betState} correction: ${correctionReason.trim()} · simulated · 1 Nov 2026`]);
    setSavedBet(bet);
    setCorrectionMode(false); setEntryMode(null); setEntryError(""); setSelected(null); setSection("sportsbook");
  }
  function selectSearchResult(item: (typeof searchIndex)[number]) {
    if (item.section === "reports") { go("reports"); return; }
    if (item.section === "accounts") { const account = accounts.find(row => row.id === item.id); if (account) openAccount(account); return; }
    const record = records.find(row => row.id === item.id); if (record) openRecord(record);
  }
  const ledgerSection = section in labLedgerColumns ? section as LabLedgerKey : null;
  const visibleReportIds = new Set(reportPoints.map(point => point.id));
  const mainTitle = entryMode === "page" ? editingExistingId ? `Edit Sportsbook Bet · ${editingExistingId}` : "Add Sportsbook Bet" : previewEditor ? previewEditor.section === "freeBets" ? "Free Bet Workbench" : previewEditor.section === "casino" ? "Casino Offer Workbench" : `${previewEditor.mode} ${sectionName(previewEditor.section)}` : selected ? selected.title : sectionName(section);

  function renderNotifications(fullPage: boolean) {
    return <DesignLabNotifications events={allNotificationEvents} liveTasks={allTodayTasks} scope={scope} read={notificationRead} cleared={notificationCleared} fullPage={fullPage}
      onRead={ids => setNotificationRead(current => [...new Set([...current, ...ids])])}
      onClear={id => setNotificationCleared(current => [...new Set([...current, id])])}
      onOpen={openNotificationTask}
      onViewAll={fullPage ? undefined : () => { setOverlay(null); go("notifications"); }}
      onViewToday={() => { setOverlay(null); go("tasks"); }} />;
  }

  function signInSimulation() { setLabAuth("authenticating"); window.setTimeout(() => setLabAuth("authenticated"), 350); }
  function openNotificationTask(task: LabTodayTask) {
    setOverlay(null);
    const origin = section === "notifications" ? "notifications" : "tasks";
    if (task.sourceId) {
      const account = accounts.find(item => item.id === task.sourceId);
      if (account) { openAccount(account); setReturnSection(origin); setReturnScope(scope); return; }
      const record = [...copiedRows, ...labRecords, ...cp116Records, ...(newBetRecord ? [newBetRecord] : [])].find(item => item.id === task.sourceId);
      if (record) { if(task.reviewCondition && labReviewTracking[record.id] && Object.keys(labReviewTracking[record.id].causes).length) openDependencyReview(record,labFieldDisplayColumn(record.section,Object.values(labReviewTracking[record.id].causes)[0]?.[0]??"displayed_value")); else openRecord(record); setReturnSection(origin); setReturnScope(scope); return; }
    }
    go(task.id === "reload" || task.id === "advisory" ? "offers" : "tasks");
  }
  function toggleTrackedTask(id: string) {
    const task = allTodayTasks.find(item => item.id === id);
    if (!task) return;
    setTrackedTaskSnapshots(current => current.some(item => item.id === id) ? current.filter(item => item.id !== id) : [...current, task]);
    setCurrentTrackedTaskId(id);
  }
  function bulkTrackTasks(ids: string[], action: "track" | "untrack") {
    const targets = new Set(ids);
    setTrackedTaskSnapshots(current => action === "untrack"
      ? current.filter(task => !targets.has(task.id))
      : [...current, ...allTodayTasks.filter(task => targets.has(task.id) && !current.some(existing => existing.id === task.id))]);
  }
  function completeTrackedTask(task: LabTodayTask) {
    if (task.group === "Needs Action") {
      setTrackedNotice(`${task.title} requires source resolution. Open Source to complete the underlying work.`);
      return;
    }
    if (!task.manual && task.authority !== "Advisory suggestion") return;
    setLabTaskStates(current => ({...current,[task.id]:"Done"}));
    setTrackedNotice(task.authority === "Advisory suggestion" ? `${task.title} marked reviewed. Offer availability remains unverified.` : `${task.title} marked Done for ${task.profileId ?? "All Profiles"}.`);
  }
  function untrackTask(id: string, origin: HTMLButtonElement) {
    const row = origin.closest<HTMLElement>('[data-pd-id^="lab.tracked-task."], [data-pd-id^="lab.header-tracked-task."]');
    const siblings = row?.parentElement ? [...row.parentElement.querySelectorAll<HTMLElement>('[data-pd-id^="lab.tracked-task."], [data-pd-id^="lab.header-tracked-task."]')] : [];
    const index = row ? siblings.indexOf(row) : -1;
    const nextAction = (siblings[index + 1] ?? siblings[index - 1])?.querySelector<HTMLButtonElement>("button");
    setTrackedTaskSnapshots(current => current.filter(item => item.id !== id));
    if (currentTrackedTaskId === id) setCurrentTrackedTaskId(null);
    requestAnimationFrame(() => (nextAction?.isConnected ? nextAction : document.querySelector<HTMLElement>('[data-pd-id="lab.tracked.view-all"]') ?? document.querySelector<HTMLElement>('[data-pd-id="lab.header-trigger.tracked"]'))?.focus({ preventScroll: true }));
  }
  function trackedTaskRow(item: {task: LabTodayTask; sourceResolved: boolean}, panel: boolean, history = false) {
    const {task, sourceResolved} = item;
    const owner = task.profileId ? labProfiles.find(profile => profile.id === task.profileId)?.name ?? task.profileId : "All Profiles";
    return <DesignTrackedTaskRow action={!task.previewOnly ? <button onClick={() => { setCurrentTrackedTaskId(task.id); if (task.sourceId) openNotificationTask(task); else go("offers"); }} type="button">{sourceResolved ? "View Source" : task.group === "Needs Action" ? "Resolve Source" : "Open Source"}</button> : null}
      context={`${owner} · ${sourceResolved ? "Source Resolved" : labTaskDateLabel(task)}`}
      dataPdId={`${panel ? "lab.header-tracked-task" : "lab.tracked-task"}.${task.id}`}
      extraAction={!sourceResolved && !history && task.group !== "Needs Action" ? <button aria-label={`Mark ${task.title} Done — ${owner}`} className={styles.doneIcon} onClick={() => completeTrackedTask(task)} title="Mark Done" type="button"><Icon>check</Icon></button> : null}
      key={task.id} onUntrack={event => untrackTask(task.id,event.currentTarget)}
      state={sourceResolved && !history ? <span className={styles.resolvedState}><Icon>check_circle</Icon>Source Resolved</span> : <DesignLabTaskState state={labTaskStates[task.id] ?? "To Do"} />}
      title={task.title} untrackLabel={`Untrack ${task.title} — ${owner}`}
      urgent={labTaskNeedsUrgentReview(task) && !sourceResolved} variant={panel ? "popup" : "banner"}/>;
  }

  if (labAuth !== "authenticated") return <div className={styles.lab} data-pd-id="design-lab-connected.root"><DesignLabAuth destination={sectionName(section)} onRetry={signInSimulation} onScenario={setLabAuth} onSignIn={signInSimulation} state={labAuth}/></div>;
  if (onboarding) return <div className={styles.lab} data-pd-id="design-lab-connected.root"><DesignLabOnboarding onCreated={setNewLabProfile} onExit={() => { setOnboarding(false); setSection("home"); }}/></div>;

  return <div className={styles.lab} data-pd-id="design-lab-connected.root">
    <a className={styles.skip} href="#lab-main">Skip to content</a>
    <div className={`${styles.frame} ${collapsed ? styles.collapsed : ""}`}>
      {mobileNav ? <button aria-label="Dismiss navigation" className={styles.navScrim} onClick={() => { setMobileNav(false); navTriggerRef.current?.focus(); }} tabIndex={-1} type="button" /> : null}
      <aside aria-label="Design Lab navigation" className={`${styles.sidebar} ${mobileNav ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}><BrandLogo variant="mark" /><span>Plum Duff <small>Design Lab</small></span><button aria-label="Close navigation" className={styles.sidebarClose} onClick={() => { setMobileNav(false); navTriggerRef.current?.focus(); }} type="button"><Icon>close</Icon></button></div>
        <div className={styles.navGroup}><p>Fund Manager</p><nav aria-label="Primary destinations">
          {labDestinations.filter(item => item.group === "primary").map(item => item.id === "tracker" ?
            <div key={item.id}><div className={`${styles.trackerNav} ${labDestination(section).parent === "tracker" || section === "tracker" ? styles.navGroupActive : ""}`}>
              <button aria-current={section === "tracker" ? "page" : undefined} className={section === "tracker" ? styles.navActive : ""} data-pd-id="lab.nav.tracker" onClick={() => go("tracker")} title="Tracker overview" type="button"><Icon>{item.icon}</Icon><span>{item.label}</span></button>
              <button aria-controls="lab-tracker-destinations" aria-expanded={trackerExpanded} aria-label={trackerExpanded ? "Collapse Tracker" : "Expand Tracker"} className={styles.trackerExpand} data-pd-id="lab.nav.tracker-expand" onClick={() => setTrackerExpanded(value => !value)} type="button"><Icon>{trackerExpanded ? "expand_less" : "expand_more"}</Icon></button>
            </div>{trackerExpanded ? <div className={styles.trackerChildren} id="lab-tracker-destinations">{labDestinations.filter(child => child.group === "tracker").map(child => <button aria-current={section === child.id ? "page" : undefined} className={section === child.id ? styles.navActive : ""} data-pd-id={`lab.nav.${child.id}`} key={child.id} onClick={() => go(child.id)} title={child.label} type="button"><Icon>{child.icon}</Icon><span>{child.label}</span></button>)}</div> : null}</div> : <button aria-current={section === item.id ? "page" : undefined} className={section === item.id ? styles.navActive : ""} data-pd-id={`lab.nav.${item.id}`} key={item.id} onClick={() => go(item.id)} title={item.label} type="button"><Icon>{item.icon}</Icon><span>{item.label}</span></button>)}
        </nav></div>
        <div className={styles.navGroup}><button aria-expanded={showMore} className={styles.moreButton} onClick={() => setShowMore(value => !value)} type="button"><Icon>{showMore ? "expand_less" : "expand_more"}</Icon><span>See More</span></button>{showMore ? <nav aria-label="Less frequent destinations">{labDestinations.filter(item => item.group === "more").map(item => <button aria-current={section === item.id ? "page" : undefined} className={section === item.id ? styles.navActive : ""} data-pd-id={`lab.nav.${item.id}`} key={item.id} onClick={() => go(item.id)} type="button"><Icon>{item.icon}</Icon><span>{item.label}</span></button>)}</nav> : null}</div>
        <div className={styles.navFooter}>Synthetic data · no owner writes</div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.header} data-pd-id="lab.header">
          <div className={styles.headerLeft}>
            <div className={styles.headerIdentity}>
              <button aria-label={mobileNav ? "Close navigation" : "Open navigation"} aria-expanded={mobileNav} className={`${styles.iconButton} ${styles.navToggle}`} onClick={() => setMobileNav(value => !value)} ref={navTriggerRef} type="button"><Icon>menu</Icon></button>
              <button aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} className={`${styles.iconButton} ${styles.collapseButton}`} onClick={() => setCollapsed(value => !value)} type="button"><Icon>{collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}</Icon></button>
              <strong className={styles.headerTitle}>Fund Manager</strong>
            </div>
            <div className={styles.profileSelect}><DesignLabSelect compact dataPdId="lab.profile" label="Profile" onChange={value => guarded(() => { setScope(value as LabScope); setSelected(null); })} options={[{ value: "all", label: "All Profiles" }, ...labProfiles.map(item => ({ value: item.id, label: item.name }))]} value={scope} /></div>
          </div>
          <div className={styles.headerRight}>
            <div className={`${styles.searchBox} ${searchOpen ? styles.searchExpanded : ""}`} ref={searchBoxRef} role="search"><Icon>search</Icon><input aria-label="Search synthetic Plum Duff" data-pd-id="lab.search" onChange={event => { setSearch(event.target.value); setSearchResultsOpen(Boolean(event.target.value.trim())); setOverlay(null); }} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setSearchResultsOpen(false); if (searchOpen) { setSearchOpen(false); event.currentTarget.blur(); } } else if (event.key === "ArrowDown" && searchResultsOpen) { event.preventDefault(); document.querySelector<HTMLElement>('[data-pd-id="lab.search-results"] button')?.focus(); } }} placeholder="Search" ref={searchRef} type="search" value={search} /></div>
            <button aria-label="Open search" className={`${styles.iconButton} ${styles.mobileSearch}`} onClick={() => { setSearchOpen(true); requestAnimationFrame(() => searchRef.current?.focus()); }} type="button"><Icon>search</Icon></button>
            <button aria-expanded={overlay === "notifications"} aria-label={`Notifications, ${unreadNotifications} unread`} className={`${styles.iconButton} ${styles.notificationTrigger}`} data-pd-id="lab.header-trigger.notifications" onClick={event => toggleOverlay("notifications", event.currentTarget)} type="button"><Icon>notifications</Icon>{unreadNotifications ? <span aria-hidden="true" className={styles.notificationCount}>{unreadNotifications > 9 ? "9+" : unreadNotifications}</span> : null}</button>
            <button aria-expanded={overlay === "tracked"} aria-label={`Tracked Tasks, ${trackedTasks.length} active`} className={`${styles.iconButton} ${styles.notificationTrigger}`} data-pd-id="lab.header-trigger.tracked" onClick={event => toggleOverlay("tracked", event.currentTarget)} type="button"><Icon>task_alt</Icon>{trackedTasks.length ? <span aria-hidden="true" className={`${styles.notificationCount} ${styles.trackedCount}`}>{trackedTasks.length}</span> : null}</button>
            <button aria-expanded={overlay === "help"} aria-label="Design Lab help" className={`${styles.iconButton} ${styles.helpButton}`} data-pd-id="lab.header-trigger.help" onClick={event => toggleOverlay("help", event.currentTarget)} type="button"><Icon>help</Icon></button>
            <button aria-expanded={overlay === "launcher"} aria-label="Open app launcher" className={styles.iconButton} data-pd-id="lab.header-trigger.launcher" onClick={event => toggleOverlay("launcher", event.currentTarget)} type="button"><Icon>apps</Icon></button>
            <button aria-expanded={overlay === "identity"} aria-label="Account menu" className={`${styles.iconButton} ${styles.avatarButton}`} data-pd-id="lab.header-trigger.identity" onClick={event => toggleOverlay("identity", event.currentTarget)} type="button">L</button>
          </div>
          {overlay ? <DesignLabHeaderOverlay anchorRef={headerTriggerRef} key={overlay} label={overlay === "launcher" ? "App launcher" : overlay === "identity" ? "Account menu" : overlay === "help" ? "Design Lab help" : overlay === "tracked" ? "Tracked Tasks" : "Notifications"} onClose={() => setOverlay(null)} preferredWidth={overlay === "identity" ? 460 : 380}>
            {overlay === "launcher" ? <div className={styles.menuBody} data-pd-id="lab.launcher"><h2>Apps and tools</h2>{(["Betting Tools", "Administration"] as const).map(group => <div key={group}><h3>{group}</h3>{labDestinations.filter(item => item.group === "launcher" && item.owner === group).map(item => <button className={styles.menuRow} data-pd-id={`lab.launcher.${item.id}`} key={item.id} onClick={() => go(item.id)} type="button"><Icon>{item.icon}</Icon><span><strong>{item.label}</strong><small>{item.status === "preview" ? "Preview · synthetic only" : "Lab simulation"}</small></span><Icon>arrow_forward</Icon></button>)}</div>)}</div> : overlay === "tracked" ? <div className={styles.menuBody} data-pd-id="lab.header-tracked-panel">
              <h2>Tracked Tasks ({trackedTasks.length})</h2>
              {trackedPreview.length ? <div className={styles.trackedPanelRows}>{trackedPreview.map(item => trackedTaskRow(item,true))}</div> : <p className={styles.menuEmpty}>No Active Tracked Tasks</p>}
              {trackedTasks.length > trackedPreview.length ? <p className={styles.trackedPreviewCount}>Showing {trackedPreview.length} of {trackedTasks.length} active tasks</p> : null}
              {trackedNotice ? <p className={styles.trackedNotice} role="status">{trackedNotice}</p> : null}
              {completedTrackedTasks.length ? <details className={styles.trackedHistory}><summary>Completed History ({completedTrackedTasks.length})</summary><div className={styles.trackedPanelRows}>{completedTrackedTasks.map(item => trackedTaskRow(item,true,true))}</div></details> : null}
              <button className={styles.menuRow} data-pd-id="lab.tracked.view-all" onClick={() => go("tasks", () => { setTaskBannerState("expanded"); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[data-pd-id="lab.active-task.toggle"]')?.focus()); })} type="button"><Icon>view_list</Icon><span>View All Tracked Tasks</span></button>
            </div> : overlay === "notifications" ? renderNotifications(false) : overlay === "help" ? <div className={styles.menuBody}><h2>Design Lab help</h2><button className={styles.menuRow} onClick={() => { setOverlay(null); go("home"); }} type="button"><Icon>space_dashboard</Icon><span><strong>Position</strong><small>Return to the synthetic overview</small></span></button><button className={styles.menuRow} onClick={() => { setOverlay(null); go("sportsbook"); }} type="button"><Icon>table_chart</Icon><span><strong>Sportsbook Bets</strong><small>Explore the lab ledger</small></span></button><p className={styles.menuEmpty}>Synthetic data only. No owner financial writes.</p></div> : <div className={styles.menuBody}><div className={styles.menuIdentity}><span aria-hidden="true" className={styles.menuAvatar}>L</span><div><strong>Lab Manager</strong><small>demo@example.invalid</small><button disabled title="Identity management is not simulated" type="button">Manage Account · preview</button></div></div><div className={styles.menuGroup}><button className={styles.menuRow} onClick={() => { setOverlay(null); setOnboarding(true); }} type="button"><Icon>person_add</Icon><span>Add Profile · simulation</span></button><button className={styles.menuRow} disabled title="Settings are not simulated" type="button"><Icon>settings</Icon><span>Settings · preview</span></button><button aria-checked={theme === "dark"} className={`${styles.menuSwitch} material-switch${theme === "dark" ? " is-selected" : ""}`} data-pd-id="lab.identity.dark-mode" onClick={toggleTheme} role="switch" type="button"><Icon>dark_mode</Icon><span>Dark Mode</span><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span></button></div><div className={styles.menuGroup}><button className={`${styles.menuRow} ${styles.menuDanger}`} onClick={() => guarded(() => { setOverlay(null); setLabAuth("signed-out"); })} type="button"><Icon>logout</Icon><span>Simulate Sign Out</span></button></div></div>}
          </DesignLabHeaderOverlay> : null}
          {search.trim() && searchResultsOpen && !overlay ? <DesignLabHeaderOverlay anchorRef={searchBoxRef} label="Search results" onClose={() => setSearchResultsOpen(false)} preferredWidth={480} returnFocusRef={searchRef} search><div className={styles.searchGroups} onKeyDown={event => { if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return; const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")]; const current = buttons.indexOf(document.activeElement as HTMLButtonElement); const next = event.key === "ArrowDown" ? Math.min(buttons.length - 1, current + 1) : Math.max(0, current - 1); if (buttons[next]) { event.preventDefault(); buttons[next].focus(); } }}>{["accounts", "sportsbook", "freeBets", "casino", "extraPlace", "cash", "reports"].map(id => labDestinationLabel(id as Section)).map(kind => { const group = searchResults.filter(item => item.kind === kind); return group.length ? <div key={kind}><h2>{kind}</h2>{group.map(item => <button key={item.id} onClick={() => { setSearchResultsOpen(false); selectSearchResult(item); }} type="button"><span><strong>{item.title}</strong><small>{item.context} · {labProfiles.find(profile => profile.id === item.profileId)?.name}</small></span><Icon>arrow_forward</Icon></button>)}</div> : null; })}{!searchResults.length ? <p>No synthetic results.</p> : null}</div></DesignLabHeaderOverlay> : null}
        </header>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb} data-pd-id="lab.breadcrumb">{labDestination(section).breadcrumb.map((id, index, path) => <span className={styles.crumb} key={id}>{index ? <Icon>chevron_right</Icon> : null}{index === path.length - 1 && !selected && !entryMode && !previewEditor ? <span aria-current="page">{sectionName(id)}</span> : <button onClick={() => go(id)} type="button">{sectionName(id)}</button>}</span>)}{selected || entryMode || previewEditor ? <span className={styles.crumb}><Icon>chevron_right</Icon><span aria-current="page">{previewEditor ? `${previewEditor.mode} ${sectionName(previewEditor.section)}` : selected ? selected.section === "accounts" ? "Account details" : selected.section === "sportsbook" ? "Bet details" : "Record details" : "Add Bet"}</span></span> : null}<span className={styles.labBadge}>LAB · simulation</span></nav>
        <main className={`${styles.main} ${ledgerSection && !selected && !entryMode && !previewEditor ? styles.ledgerWorkspace : ""}`} data-pd-id="lab.main" id="lab-main">
          <DesignPageHead><div><h1 ref={headingRef} tabIndex={-1}>{mainTitle}</h1>{entryMode || selected || section === "home" ? <p>{entryMode ? "Offer first · prepare and confirm external placement later" : selected ? selected.subtitle : "Position, tasks and the next decision."}</p> : null}</div><div className={styles.headActions}>{!entryMode && !previewEditor && !editingAccount ? <DesignLabSelect dataPdId="lab.range" label="Selected Range" onChange={value => guarded(() => setRange(value as LabRange))} options={[{ value: "Last Month", label: "Last Month" }, { value: "This Year", label: "This Year" }]} value={range} /> : null}<button className={styles.linkButton} onClick={() => router.push("/")} type="button">Exit Lab</button></div></DesignPageHead>
          {trackedTasks.length && taskBannerState !== "hidden" ? <section aria-label="Tracked Tasks" className={styles.activeTaskTray} data-pd-id="lab.active-task">
            <div className={styles.trackedHeader}><button aria-expanded={taskBannerState === "expanded"} aria-label={taskBannerState === "expanded" ? "Collapse Tracked Tasks" : "Expand Tracked Tasks"} className={styles.trackedHeaderToggle} data-pd-id="lab.active-task.toggle" onClick={() => setTaskBannerState(current => current === "expanded" ? "compact" : "expanded")} type="button"><span><strong>Tracked Tasks ({trackedTasks.length})</strong>{taskBannerState === "compact" && currentTrackedTask ? <small>Current · {currentTrackedTask.title}</small> : null}</span><Icon>{taskBannerState === "expanded" ? "expand_less" : "expand_more"}</Icon></button><button aria-label="Hide Tracked Tasks Banner" className={`${styles.iconButton} ${styles.hideBanner}`} onClick={() => setTaskBannerState("hidden")} type="button"><Icon>visibility_off</Icon></button></div>
            {taskBannerState === "expanded" ? <div className={styles.trackedRows}>{trackedTasks.map(item => trackedTaskRow(item,false))}{trackedNotice ? <p className={styles.trackedNotice} role="status">{trackedNotice}</p> : null}</div> : null}
          </section> : null}
          {entryMode === "page" ? renderBetEntry("page") : previewEditor ? renderPreviewEditor() : selected ? <section className={styles.surface} data-pd-id="lab.record-detail"><button className={styles.linkButton} onClick={() => { setSelected(null); setScope(returnScope); setSection(returnSection); }} type="button"><Icon>arrow_back</Icon> Back to {sectionName(returnSection)}</button><div className={styles.sectionHead}><h2>{selected.title}</h2><span className={`${styles.status} ${selected.status === "Placed" ? "table-chip-status-placed" : selected.status === "Settled" ? "table-chip-status-settled" : selected.status === "Awarded" ? "table-chip-status-awarded" : ""}`}>{selected.status}</span></div><p>{selected.subtitle} · {selected.id} · Owner: {labProfiles.find(profile => profile.id === selected.profileId)?.name}</p><p>{selected.previewOnly ? "Representative preview · deeper edits are not simulated." : "Synthetic source record"}</p><dl className={styles.detailGrid}>{labLedgerColumns[selected.section].map((label, index) => <div key={`${label}-${index}`}><dt>{label}</dt><dd>{selected.cells[index] ?? "—"}</dd></div>)}</dl><div className={styles.actionRow}>{selected.id === freeBetJourney.sourceId ? <button className={styles.primaryButton} onClick={() => setPreviewEditor({section:"freeBets",mode:"Add"})} type="button">Review Free Bet Award</button> : null}{(selected.id.startsWith("LAB-FB-CP116") || selected.id === casinoJourney.id) ? <button className={styles.primaryButton} onClick={() => setPreviewEditor({section:selected.section,mode:"Edit"})} type="button">Open {selected.section === "freeBets" ? "Free Bet" : "Casino"} Workbench</button> : null}{selected.section === "sportsbook" && !selectedIsNewBet && selected.id !== freeBetJourney.sourceId ? <button className={styles.primaryButton} onClick={() => openExistingEntry(selected)} type="button">Edit Bet</button> : selected.previewOnly && selected.id !== freeBetJourney.sourceId ? <button className={styles.secondaryButton} onClick={() => setPreviewEditor({ section: selected.section, mode: "Edit" })} type="button">Edit Record · Preview</button> : null}{selectedAccount ? <button className={styles.primaryButton} onClick={() => { setEditingAccount(selectedAccount); setBalanceDraft(selectedAccount.currentBalance); setAccountError(""); }} type="button">Review balance</button> : null}{selected.relatedId ? <button className={styles.secondaryButton} onClick={() => { const related = records.find(item => item.id === selected.relatedId); if (related) openRecord(related); }} type="button">Open linked {selected.relatedId.startsWith("LAB-FB") ? "Free Bet" : "qualifying bet"}</button> : null}{selectedIsNewBet && betState === "Placed" ? <><button className={styles.primaryButton} onClick={() => settle("Back wins")} type="button">Settle · back wins</button><button className={styles.secondaryButton} onClick={() => settle("Lay wins")} type="button">Settle · lay wins</button><button className={styles.secondaryButton} onClick={() => { setCorrectionMode(true); setCorrectionReason(""); setEntryMode("page"); setStep(2); }} type="button">Correct placed execution</button></> : null}{selectedIsNewBet && betState === "Prospecting" ? <button className={styles.primaryButton} onClick={() => openEntry("page")} type="button">Review for placement</button> : null}{selectedIsNewBet && betState === "Settled" ? <button className={styles.secondaryButton} onClick={() => { setCorrectionMode(true); setCorrectionReason(""); setEntryMode("page"); setStep(0); }} type="button">Correct synthetic details</button> : null}</div>{selected.section === "casino" && selected.id !== casinoJourney.id ? <div className={styles.workflowPreview}><h3>Offer flow · preview only</h3><div className={styles.stageTabs}>{["Offer Setup", "Wagering", "Reward", "Settlement"].map(stage => <button aria-pressed={previewStage === stage} key={stage} onClick={() => setPreviewStage(stage)} type="button">{stage}</button>)}</div><p>{previewStage === "Offer Setup" ? "Offer type, game, qualification and expiry are reviewed first." : previewStage === "Wagering" ? "Qualifying and reward wagering remain separate; progress is not simulated here." : previewStage === "Reward" ? "Reward face value and conversion remain distinct from cash P&L." : "Settlement requires the governed result and explicit confirmation."}</p></div> : null}{selected.section === "freeBets" && !selected.id.startsWith("LAB-FB-CP116") ? <div className={styles.workflowPreview}><h3>Free Bet lifecycle · preview only</h3><div className={styles.stageTabs}>{["Awarded", "Available", "Placed", "Settled"].map(stage => <button aria-pressed={previewStage === stage} key={stage} onClick={() => setPreviewStage(stage)} type="button">{stage}</button>)}</div><p>{previewStage} is a view of the proposed flow; this sample remains Available and linked to its qualifying bet.</p></div> : null}{labEditHistory[selected.id]?.length ? <section aria-label="Synthetic Edit History"><h3>Edit History</h3><ol>{labEditHistory[selected.id].map((item,index)=><li key={index}>{item}</li>)}</ol></section> : null}{selectedIsNewBet ? <>{entryError ? <p className={styles.error} role="alert">{entryError}</p> : null}<h3>Offer source</h3><p>{bet.offerText || "Original text not captured"}</p><h3>Execution</h3><p>Back: {backConfirmed ? "Externally confirmed" : "Not confirmed"} · Lay: {layConfirmed ? layIsPartial ? `Partially matched (${bet.matchedLayStake} of ${bet.requestedLayStake})` : "Fully matched" : "Not confirmed"}</p><h3>History</h3><ol>{audit.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol><button className={styles.linkButton} onClick={() => go("reports")} type="button">View report entry <Icon>arrow_forward</Icon></button></> : null}</section> : section === "home" ? <>
            <DesignPositionMetrics dataPdId="lab.metrics" label="Financial position" items={[
              { key: "cash", label: "Known cash", value: money(Number(summary.cash.knownSubtotal)), description: summary.cashMissingCount ? `Incomplete · ${summary.cashMissingCount} Account balance missing` : "All included balances known" },
              { key: "pnl", label: "Realised P&L", value: money(realisedWithNew.knownValue), description: `${range} · settled results${realisedWithNew.unknownCount ? ` · ${realisedWithNew.unknownCount} unavailable` : ""}` },
              { key: "exposure", label: "Committed exposure", value: money(exposureWithNew.knownValue), description: `Placed positions only; planning excluded${exposureWithNew.unknownCount ? ` · ${exposureWithNew.unknownCount} unavailable` : ""}` },
            ]} />
            <DesignPositionWorkGrid>
              <DesignPositionSurface>
                <DesignPositionSectionHead title="Next actions" action={<button className={designPositionActionClasses.link} onClick={() => go("tasks")} type="button">All tasks <Icon>arrow_forward</Icon></button>} />
                {summary.actionableAccounts.map(item => <DesignPositionTask key={item.id} title="Confirm current balance" description={<>{item.name} · {labProfiles.find(profile => profile.id === item.profileId)?.name}</>} action={<button className={designPositionActionClasses.primary} onClick={() => openAccount(item)} type="button">Review Account</button>} />)}
                {!summary.actionableAccounts.length ? <p>No Account balance tasks in this Profile.</p> : null}
                <DesignPositionTask title="Review open Sportsbook positions" description="Committed exposure stays separate from planning." action={<button className={designPositionActionClasses.secondary} onClick={() => go("sportsbook")} type="button">Open Sportsbook</button>} />
              </DesignPositionSurface>
              <DesignPositionSurface>
                <DesignPositionSectionHead title="Continue work" />
                <DesignPositionShortcut icon="sports_soccer" label="Record and settle a bet" onClick={() => go("sportsbook")} />
                <DesignPositionShortcut icon="monitoring" label="Review performance" onClick={() => go("reports")} />
                <DesignPositionShortcut icon="redeem" label="Inspect linked Free Bets" onClick={() => go("freeBets")} />
              </DesignPositionSurface>
            </DesignPositionWorkGrid>
            <DesignLabPositionTable accounts={accounts} scope={scope} range={range} onOpenReport={profileId => { setScope(profileId); go("reports"); }} />
          </> : section === "opportunities" ? <section className={styles.surface}><h2>Opportunities · advisory preview</h2><p>No live promotion or provider claim is made in this synthetic lab.</p><div className={styles.task}><div><strong>Capture an offer you found</strong><p>Discord, bookmaker or another source · keep the original wording.</p></div><button className={styles.primaryButton} onClick={() => { go("sportsbook"); openEntry("modal"); }} type="button">Quick Capture</button></div><div className={styles.task}><div><strong>Review current Prospecting</strong><p>Planning is separate from committed exposure.</p></div><button className={styles.secondaryButton} onClick={() => go("sportsbook")} type="button">Open Tracker</button></div></section>
          : section === "notifications" ? renderNotifications(true)
          : section === "tasks" ? <DesignLabToday scope={scope} records={[...copiedRows, ...labRecords, ...cp116Records]} accounts={accounts} extraTasks={reviewTasks} taskStates={labTaskStates} blockedReasons={labBlockedReasons} reviewDates={labReviewDates} trackedTaskIds={trackedTaskIds} onBlockedReason={(id,reason) => setLabBlockedReasons(current => ({...current,[id]:reason}))} onReviewDate={(id,date) => setLabReviewDates(current => ({...current,[id]:date}))} onTaskState={(id,state) => setLabTaskStates(current => ({...current,[id]:state}))} onToggleTrackTask={toggleTrackedTask} onBulkTrackTasks={bulkTrackTasks} onOpenSource={id => { const account = accounts.find(item => item.id === id); if (account) { openAccount(account); return; } const source = [...copiedRows, ...labRecords, ...cp116Records, ...(newBetRecord ? [newBetRecord] : [])].find(item => item.id === id); if (source) { const review=reviewTasks.find(task=>task.sourceId===id); if(review) openDependencyReview(source,labFieldDisplayColumn(source.section,Object.values(labReviewTracking[id]?.causes??{})[0]?.[0]??"displayed_value")); else openRecord(source); } }} onOpenOffer={() => go("offers")} onInspectHistory={() => go("offers")} view={todayView} onViewChange={setTodayView} onSourceLeave={() => { todayScrollRef.current=window.scrollY; }} boardScrollLeft={todayBoardScrollLeft} onBoardScroll={setTodayBoardScrollLeft} />
          : section === "offers" ? <DesignLabOfferWorkflow records={[...copiedRows, ...labRecords]} onCreated={rows => setCopiedRows(current => [...current, ...rows.filter(row => !current.some(existing => existing.id === row.id))])} onOpenRecord={id => { const row = [...copiedRows, ...labRecords].find(item => item.id === id); if (row) openRecord(row); }} onReturn={() => go("tasks")} />
          : section === "profiles" ? subscriberPreview ? <DesignLabSubscriberPreview onBack={() => setSubscriberPreview(false)}/> : <DesignManagementSurface dataPdId="lab.profiles"><div className={styles.sectionHead}><h2>Profiles</h2><button className={styles.primaryButton} onClick={() => setOnboarding(true)} type="button">Add Profile · simulation</button></div>{labProfiles.map(item => <DesignPositionTask key={item.id} title={item.name} description={item.id} action={<button className={styles.secondaryButton} onClick={() => { setScope(item.id); go("home"); }} type="button">Open position</button>} />)}{newLabProfile ? <div className={styles.task} data-pd-id="lab.created-profile"><div><strong>{newLabProfile.name}</strong><p>{newLabProfile.code} · synthetic first-use only; financial context not populated</p></div><span className={styles.status}>Lab created</span></div> : null}<div className={styles.task}><div><strong>Invited subscriber</strong><p>CP-056 representative review and restricted access preview</p></div><button className={styles.secondaryButton} onClick={() => setSubscriberPreview(true)} type="button">Inspect preview</button></div></DesignManagementSurface>
          : section === "reports" ? <section className={designReportClasses.grid} data-pd-id="lab.reports"><div className={styles.metrics}><div><span>Known realised P&amp;L</span><strong>{money(realisedWithNew.knownValue)}</strong><small>Settled sources only · {range}</small></div><div><span>Committed exposure</span><strong>{money(exposureWithNew.knownValue)}</strong><small>Planning excluded{exposureWithNew.unknownCount ? ` · ${exposureWithNew.unknownCount} unavailable` : ""}</small></div><div><span>Known cash</span><strong>{money(Number(summary.cash.knownSubtotal))}</strong><small>{summary.cashMissingCount ? `Incomplete · ${summary.cashMissingCount} unknown` : "Complete"}</small></div></div><DesignLabReportChart points={reportPoints} onOpen={id => { const source = records.find(item => item.id === id); if (source) openRecord(source); }} /><DesignReportSurface title="P&L by ledger"><dl className={styles.domainBreakdown}><div><dt>Sportsbook · settled</dt><dd>{money(sportsbookRealised.knownValue)}</dd></div><div><dt>Free Bets · settled</dt><dd>{cp116FreeSettled.length ? money(cp116FreeSettled.reduce((total,child)=>total+Number(child.finalPnl),0)) : "No settled fixture activity"}</dd></div><div><dt>Casino Offers · settled</dt><dd>{cp116CasinoSettled ? money(Number(casinoJourney.confirmedNetResult)) : "Unavailable · no confirmed fixture result"}</dd></div><div><dt>Extra Place</dt><dd>No settled activity</dd></div></dl></DesignReportSurface><DesignReportSurface title="Source drilldown"><DesignReportSourceRows>{records.filter(item => (item.section === "sportsbook" && item.status === "Settled" && visibleReportIds.has(item.id)) || ((item.section === "freeBets" || item.section === "casino") && item.status === "Settled" && (item.id.startsWith("LAB-FB-CP116") || item.id === casinoJourney.id) && range === "This Year")).map(item => <button key={item.id} onClick={() => openRecord(item)} type="button"><span><strong>{item.title}</strong><small>{item.id} · {sectionName(item.section)} · settled</small></span><span>{item.id === "LAB-SB-NEW" ? money(-0.62) : item.section === "freeBets" ? item.cells[9] : item.cells[8]}</span></button>)}</DesignReportSourceRows></DesignReportSurface></section>
          : section === "tracker" ? <section className={styles.surface} data-pd-id="lab.tracker-overview"><h2>Tracker</h2><p>Choose a ledger. Profile and range remain selected as you move between work.</p><div className={styles.toolLinks}>{labDestinations.filter(item => item.group === "tracker").map(item => <button className={styles.quickLink} key={item.id} onClick={() => go(item.id)} type="button"><Icon>{item.icon}</Icon><span>{item.label}</span><Icon>arrow_forward</Icon></button>)}</div></section>
          : section === "subscribers" ? <section data-pd-id="lab.tool.subscribers"><p className={styles.toolStatus}>Representative preview · no invitations or access grants are sent.</p><DesignLabSubscriberPreview onBack={() => go("home")}/></section>
          : labDestination(section).group === "launcher" ? <section className={styles.surface} data-pd-id={`lab.tool.${section}`}><span className={styles.toolStatus}>Preview · synthetic only</span><h2>{sectionName(section)}</h2><p>{section === "oddsmatcher" ? "Opportunity scanning and provider data remain outside this lab. Review the offer capture path or the live tool separately." : section === "calculators" ? "The governed calculation engine is unchanged. This preview shows where a calculator belongs in the connected journey." : section === "catalogue" ? "Provider and Account identities are managed under separate authorities; no catalogue records change here." : section === "administration" ? "Settings and administration remain protected normal-app workflows. This lab shows the destination only." : "Backup and restore remain protected operational workflows. No recovery action runs in this lab."}</p><div className={styles.actionRow}><button className={styles.secondaryButton} onClick={() => go("home")} type="button">Back to Position</button>{section === "oddsmatcher" ? <button className={styles.secondaryButton} onClick={() => go("opportunities")} type="button">View Opportunities preview</button> : section === "calculators" ? <button className={styles.secondaryButton} onClick={() => go("sportsbook")} type="button">Open Sportsbook workbench</button> : section === "catalogue" ? <button className={styles.secondaryButton} onClick={() => go("accounts")} type="button">Open Accounts</button> : section === "administration" ? <button className={styles.secondaryButton} onClick={() => go("profiles")} type="button">Open Profiles</button> : null}</div></section>
          : ledgerSection ? renderLedger(ledgerSection) : null}
          <details className={styles.simControls}><summary>Simulation controls</summary><label><input checked={failedSave} onChange={event => setFailedSave(event.target.checked)} type="checkbox"/> Fail the next simulated save</label><button onClick={() => setLabAuth("validation-unavailable")} type="button">Simulate temporary session validation issue</button><button onClick={() => setLabAuth("expired")} type="button">Simulate expired application session</button><p>Refresh resets synthetic edits.</p></details>
        </main>
      </div>
    </div>
    {entryMode === "modal" ? <ModalBoundary onDismiss={closeEntry}><div className="modal-backdrop"><div aria-labelledby="lab-entry-title" className={styles.entryModal} role="dialog"><div className={styles.modalHead}><h2 id="lab-entry-title">Quick Add Sportsbook Bet</h2><button aria-label="Close quick add" className={styles.iconButton} onClick={closeEntry} type="button"><Icon>close</Icon></button></div><div className={styles.modalBody}>{renderBetEntry("modal")}</div></div></div></ModalBoundary> : null}
    {editingAccount ? <ModalBoundary onDismiss={() => guarded(() => setEditingAccount(null))}><div className="modal-backdrop"><form aria-labelledby="lab-account-edit-title" className={styles.editModal} onSubmit={event => { event.preventDefault(); saveAccount(); }} role="dialog"><div className={styles.modalHead}><h2 id="lab-account-edit-title">Review {editingAccount.name}</h2><button aria-label="Close Account review" className={styles.iconButton} onClick={() => guarded(() => setEditingAccount(null))} type="button"><Icon>close</Icon></button></div><dl className={styles.balanceMeta}><div><dt>Last observed balance</dt><dd>{editingAccount.currentBalance ? money(Number(editingAccount.currentBalance)) : "Unknown"}</dd></div><div><dt>Observation time</dt><dd>{accountObservedAt[editingAccount.id] || "No confirmed lab observation"}</dd></div><div><dt>Expected movement</dt><dd>Unavailable in this synthetic sample; never applied to observed cash</dd></div></dl>{accountAudit[editingAccount.id]?.length ? <p>Observation history: {accountAudit[editingAccount.id].join("; ")}</p> : null}<p>Blank is unknown. Enter 0.00 only when zero is confirmed.</p><label>Observed Current Balance <span className={styles.moneyInput}>£ <input aria-invalid={Boolean(accountError)} onChange={event => { setBalanceDraft(event.target.value); setAccountError(""); }} value={balanceDraft}/></span></label>{accountError ? <p className={styles.error} role="alert">{accountError}</p> : null}<div className={styles.actionRow}><button className={styles.secondaryButton} onClick={() => guarded(() => setEditingAccount(null))} type="button">Cancel</button><button className={styles.primaryButton} type="submit">Confirm balance observation · simulation</button></div></form></div></ModalBoundary> : null}
    {dirtyConfirm ? <ModalBoundary onDismiss={() => setDirtyConfirm(false)} returnFocusRef={triggerRef}><div className="modal-backdrop"><div aria-labelledby="lab-dirty-title" className={styles.editModal} role="dialog"><h2 id="lab-dirty-title">Unsaved changes</h2><p>{financialWorkbenchDirty ? "The synthetic financial draft remains available if you leave." : "Keep the synthetic draft or discard these edits?"}</p><div className={styles.actionRow}><button className={styles.secondaryButton} onClick={() => setDirtyConfirm(false)} type="button">Keep editing</button><button className={styles.dangerButton} onClick={() => { setDirtyConfirm(false); setEditingAccount(null); setBet(betState === "Draft" ? initialBet : savedBet); setEditingExistingId(null); const action = pendingAction.current; pendingAction.current = null; action?.(); }} type="button">{financialWorkbenchDirty ? "Leave With Draft Saved" : "Discard changes"}</button></div></div></div></ModalBoundary> : null}
  </div>;

  function renderLedger(key: LabLedgerKey) {
    const ledgerRows: LabLedgerRow[] = key === "accounts"
      ? accounts.filter(item => scope === "all" || item.profileId === scope).map(item => ({
        id: item.id, profileId: item.profileId, section: "accounts", title: item.name, subtitle: item.type,
        status: item.status,
        cells: [item.id,item.name,item.type,item.status,"Yes",item.currentBalance ? money(Number(item.currentBalance)) : "Unknown","—",accountObservedAt[item.id] ?? "—","—","—","—","Open"].map((cell,index)=>labLedgerOverrides[item.id]?.[index]??cell),
        onOpen: () => openAccount(item),
      }))
      : records.filter(item => item.section === key).map(item => ({ ...item, onOpen: () => openRecord(item) }));
    return <>{key === "sportsbook" && (scope === "all" || scope === "LAB-PROFILE-A") ? <button className={styles.secondaryButton} data-pd-id="lab.cp116.open-source" onClick={()=>{const source=cp116LabRecords(freeBetJourney,casinoJourney).find(item=>item.id===freeBetJourney.sourceId);if(source){setCp116JourneyStarted(true);openRecord(source);}}} type="button">Open Historical Free Bet Award Fixture</button> : null}<DesignLabLedgerGrid ledgerKey={key} rows={ledgerRows} scope={scope} accounts={accounts}
      view={ledgerViews[key] ?? defaultLabLedgerView(key)}
      onViewChange={view => setLedgerViews(current => ({ ...current, [key]: view }))}
      savedView={savedViews[key] ? {section:key,view:savedViews[key]} : null}
      onSaveView={({section,view}) => setSavedViews(current => ({...current,[section]:view}))} onOpenEntry={openEntry}
      onOpenConcept={() => {if(key==="freeBets"||key==="casino")setCp116JourneyStarted(true);setPreviewEditor({section:key,mode:"Add"});}}
      onOpenBalance={id => { const account = accounts.find(item => item.id === id); if (account) { setEditingAccount(account); setBalanceDraft(account.currentBalance); setAccountError(""); } }}
      bet={bet} inputOverrides={labInputOverrides} reviewIndicators={labReviewIndicators} onFieldEdit={(row,changes,originals)=>applyLabFieldEdits(row,changes,originals,"inline")} betState={betState}
      onOpenReview={(row,column)=>{if(key==="accounts") openRecord(row);else openDependencyReview(row,column);}}
      onRequestPlacement={() => { openEntry("page"); setEntryError("Placement requires the full external confirmation and required fields."); }}
      scrollPosition={ledgerScroll.current[key] ?? {left:0,top:0}}
      onScrollPosition={position => { ledgerScroll.current[key] = position; }} /></>;
  }

  function renderPreviewEditor() {
    if (!previewEditor) return null;
    const source = previewEditor.mode === "Edit" && selected?.section === previewEditor.section ? selected : null;
    if (previewEditor.section === "accounts" || previewEditor.section === "sportsbook") return null;
    if (previewEditor.section === "freeBets" && (!source || source.id.startsWith("LAB-FB-CP116"))) return <DesignLabFreeBetWorkflow key={source?.id??"new"} journey={freeBetJourney} onJourney={setFreeBetJourney} recordId={source?.id??null} onDirtyChange={setFinancialWorkbenchDirty} onClose={()=>{setFinancialWorkbenchDirty(false);setPreviewEditor(null);setSelected(null);}} onOpenSource={()=>{const linked=cp116Records.find(item=>item.id===freeBetJourney.sourceId);if(linked)openRecord(linked);}} onReport={()=>{setFinancialWorkbenchDirty(false);setPreviewEditor(null);setSelected(null);setSection("reports");}}/>;
    if (previewEditor.section === "casino" && (!source || source.id===casinoJourney.id)) return <DesignLabCasinoWorkflow key={source?.id??"new"} journey={casinoJourney} onJourney={setCasinoJourney} onDirtyChange={setFinancialWorkbenchDirty} onClose={()=>{setFinancialWorkbenchDirty(false);setPreviewEditor(null);setSelected(null);}} onReport={()=>{setFinancialWorkbenchDirty(false);setPreviewEditor(null);setSelected(null);setSection("reports");}}/>;
    return <>{source && reviewContext?.recordId === source.id ? <div className={styles.reviewNotice} data-pd-id="lab.review.target" role="status" tabIndex={-1}><strong>Review Preview · Financial Save Unavailable</strong><span>{labProfiles.find(profile=>profile.id===source.profileId)?.name} · {source.id}</span><span>Changed: {reviewContext.sourceFields.join(", ")}. Check: {reviewContext.affectedFields.join(", ")}.</span><span>Open the populated fields below. No unvalidated financial result will be saved.</span></div> : null}<DesignLabSpecialistConcept key={`${previewEditor.section}-${source?.id??"new"}`} section={previewEditor.section} source={source} sourceOverrides={source?labInputOverrides[source.id]??{}:{}} onPreviewSave={(record,fields)=>{const originals={...labRecordInputs[record.id],...record.sourceInputs,...labInputOverrides[record.id]};const result=applyLabFieldEdits(record,Object.entries(fields).map(([field,value])=>({field,value})),originals,"workbench");if(result.outcome==="APPLIED"||result.outcome==="UNCHANGED"){setPreviewEditor(null);setSelected(null);}return result;}} onClose={() => {setReviewContext(null);setPreviewEditor(null);}} /></>;
  }

  function renderBetEntry(mode: EntryMode) {
    const entryBet=editingExistingId?existingBet:bet;
    const setEntryBet=editingExistingId?setExistingBet:setBet;
    const entryBetProfile=editingExistingId?selected?.profileId:betProfile;
    const entryBetState=editingExistingId?selected?.status:betState;
    const entryBackConfirmed=editingExistingId?existingBackConfirmed:backConfirmed;
    const entryLayConfirmed=editingExistingId?existingLayConfirmed:layConfirmed;
    const setEntryBackConfirmed=editingExistingId?setExistingBackConfirmed:setBackConfirmed;
    const setEntryLayConfirmed=editingExistingId?setExistingLayConfirmed:setLayConfirmed;
    const entryFixtureMatches=!editingExistingId&&entryBet.bookmaker==="Bookmaker A"&&entryBet.exchange==="Exchange A"&&entryBet.backStake===labQualifyingFixture.backStake&&entryBet.backOdds===labQualifyingFixture.backOdds&&entryBet.layOdds===labQualifyingFixture.layOdds&&entryBet.requestedLayStake===labQualifyingFixture.layStake&&entryBet.commission===labQualifyingFixture.commission&&entryBet.strategy==="Standard";
    const accountChoices = (type: "Bookie" | "Exchange", current: string) => {
      const eligible = accounts.filter(account => account.type === type && account.status === "Active" && (!entryBetProfile || account.profileId === entryBetProfile)).map(account => account.name);
      return [{value:"",label:type === "Bookie" ? "Choose bookmaker" : "Choose exchange"},...Array.from(new Set([...(editingExistingId && current ? [current] : []),...eligible])).map(value=>({value,label:editingExistingId && value===current && !eligible.includes(value) ? `${value} · recorded` : value}))];
    };
    const entryLayIsPartial=entryLayConfirmed&&Number(entryBet.matchedLayStake)<Number(entryBet.requestedLayStake);
    const existingMaterialDirty=Boolean(editingExistingId && (["offerType","betType","fixtureType","bookmaker","exchange","strategy","eventDate","backStake","backOdds","layOdds","requestedLayStake","matchedLayStake","commission"] as (keyof LabBetDraft)[]).some(field=>existingBet[field]!==existingOriginal[field]));
    const update = (key: keyof LabBetDraft, value: string) => { setEntryBet(current => ({...current, [key]: value})); if (!editingExistingId) {if (["backStake","backOdds"].includes(key)) setEntryBackConfirmed(false); if (["layOdds","commission","requestedLayStake","matchedLayStake"].includes(key)) setEntryLayConfirmed(false);} setEntryError(""); };
    const stages = ["Offer", "Requirements", "Matching", "Placement", "Finish / Review"];
    return <div className={styles.entry} data-pd-id={`lab.entry.${mode}`}>
      <div className={styles.entryTop}><div><strong>{mode === "modal" ? "Quick Capture · simulated" : "Bet Workbench · simulated"}</strong><p>{entryBetProfile ? labProfiles.find(profile => profile.id === entryBetProfile)?.name : "Choose owning Profile"} · {entryBetState === "Draft" ? "New offer" : entryBetState}</p></div>{scope === "all" && entryBetState === "Draft" ? <DesignLabSelect compact dataPdId="lab.bet.owner" label="Owning Profile" onChange={value => setBetOwnerProfileId(value as LabProfileId)} options={[{value:"",label:"Choose Profile"},...labProfiles.map(profile => ({value:profile.id,label:profile.name}))]} value={betOwnerProfileId ?? ""}/> : null}<button className={styles.linkButton} onClick={() => { setEntryMode(mode === "modal" ? "page" : "modal"); setStep(0); }} type="button">{mode === "modal" ? "Open full workbench" : "Compare Quick Capture"}</button></div>
      {mode === "page" ? <nav aria-label="Bet workbench sections" className={styles.stepper}>{stages.map((label, index) => <button aria-current={step === index ? "step" : undefined} className={step === index ? styles.stepActive : ""} key={label} onClick={() => setStep(index)} type="button"><span>{index + 1}</span>{label}</button>)}</nav> : null}
      {reviewContext?.recordId === (editingExistingId ?? (selectedIsNewBet ? "LAB-SB-NEW" : null)) && selected ? <div className={styles.reviewNotice} data-pd-id="lab.review.target" role="status" tabIndex={-1}><strong>Financial Review Required</strong><span>{labProfiles.find(profile=>profile.id===selected.profileId)?.name} · {selected.id}</span><span>Changed: {reviewContext.sourceFields.map(field=>labLedgerColumnSpecs(selected.section).find(spec=>spec.id===field)?.label??field).join(", ")}. Check: {reviewContext.affectedFields.map(field=>labLedgerColumnSpecs(selected.section).find(spec=>spec.id===field)?.label??field).join(", ")}.</span><span>Validated outputs remain unavailable until the input is reverted or a governed calculation can resolve it.</span></div> : null}
      <div className={styles.entryGrid}><div className={styles.entryFields}>
        {(mode === "modal" || step === 0) ? <fieldset><legend>Offer</legend><label>Original Offer text <textarea data-pd-id="lab.bet.offer-text" onChange={event => update("offerText", event.target.value)} placeholder="Paste original offer text verbatim" rows={mode === "modal" ? 3 : 5} value={entryBet.offerText}/></label><div className={styles.fieldPair}><DesignLabSelect dataPdId="lab.bet.bookmaker" label="Bookmaker" onChange={value => update("bookmaker", value)} options={accountChoices("Bookie",entryBet.bookmaker)} value={entryBet.bookmaker}/><label>Offer Name <input onChange={event => update("offerName", event.target.value)} value={entryBet.offerName}/></label><label>Offer Type <input onChange={event => update("offerType", event.target.value)} value={entryBet.offerType}/></label><label>Bet Type <input onChange={event => update("betType", event.target.value)} value={entryBet.betType}/></label><label>Fixture Type <input onChange={event => update("fixtureType", event.target.value)} value={entryBet.fixtureType}/></label><label>Back Stake · if known <input inputMode="decimal" onChange={event => update("backStake", event.target.value)} value={entryBet.backStake}/></label></div></fieldset> : null}
        {mode === "page" && step === 1 ? <fieldset><legend>Requirements</legend><p>These preparation tasks can be completed in any order. No external account action occurs in this lab.</p><label className={styles.checkRow}><input type="checkbox"/> Opt-in checked externally</label><label className={styles.checkRow}><input type="checkbox"/> Deposit prerequisite checked externally</label><label className={styles.checkRow}><input type="checkbox"/> Promotion requirement reviewed</label><p>Use Matching at any time, even before Event Name is known.</p></fieldset> : null}
        {mode === "page" && step === 2 ? <fieldset><legend>Matching</legend><div className={styles.actionRow}><button className={styles.secondaryButton} data-pd-id="lab.bet.load-fixture" onClick={() => { setEntryBet(current => ({...current,bookmaker:"Bookmaker A",exchange:"Exchange A",backStake:labQualifyingFixture.backStake,backOdds:labQualifyingFixture.backOdds,layOdds:labQualifyingFixture.layOdds,requestedLayStake:labQualifyingFixture.layStake,commission:labQualifyingFixture.commission,strategy:"Standard"})); setEntryBackConfirmed(false); setEntryLayConfirmed(false); setEntryError(""); }} type="button">Load validated CALC-001 example</button></div><button className={styles.secondaryButton} onClick={() => setMatchingOpen(value => !value)} type="button">{matchingOpen ? "Hide" : "Open"} matching</button>{matchingOpen ? <div className={styles.matchPanel}><strong>Fixture match · synthetic Exchange A</strong><p>Match and calculate before entering Event Name. No provider call or placement.</p></div> : null}<div className={styles.fieldPair}><DesignLabSelect dataPdId="lab.bet.exchange" label="Exchange" onChange={value => update("exchange", value)} options={accountChoices("Exchange",entryBet.exchange)} value={entryBet.exchange}/><DesignLabSelect dataPdId="lab.bet.strategy" label="Strategy" onChange={value => update("strategy", value)} options={["Standard","Underlay","Overlay","Bonus Lock-In","Custom"].map(value => ({value,label:value}))} value={entryBet.strategy}/><label>Back Odds <input inputMode="decimal" onChange={event => update("backOdds", event.target.value)} value={entryBet.backOdds}/></label><label>Lay Odds <input inputMode="decimal" onChange={event => update("layOdds", event.target.value)} value={entryBet.layOdds}/></label><label>Exchange commission <input inputMode="decimal" onChange={event => update("commission", event.target.value)} value={entryBet.commission}/></label><label>Requested Lay Stake <input inputMode="decimal" onChange={event => update("requestedLayStake", event.target.value)} value={entryBet.requestedLayStake}/></label></div><p>Underlay, Overlay and Bonus Lock-In remain named strategy previews. Only Standard CALC-001 has validated output in this lab.</p></fieldset> : null}
        {mode === "page" && step === 3 ? <fieldset><legend>Placement · externally confirmed</legend><p>Plum Duff records what you confirm; it does not place a bet.</p><div className={styles.placementRow}><span>Back bet</span><button className={styles.secondaryButton} onClick={() => { const errors = getStandardQualifyingErrors({backStake:entryBet.backStake,backOdds:entryBet.backOdds,layOdds:entryBet.layOdds,exchangeCommission:entryBet.commission}); if (errors.backStake || errors.backOdds) { setEntryError(errors.backStake || errors.backOdds || "Invalid Back bet"); return; } setEntryBackConfirmed(true); if(!editingExistingId) setAudit(current => [...current, "Back confirmed externally · simulated"]); }} disabled={Boolean(editingExistingId)} type="button">{entryBackConfirmed === null ? "Not Recorded" : entryBackConfirmed ? "Back confirmed" : "Confirm external Back"}</button></div><label>Actual matched Lay Stake <input inputMode="decimal" onChange={event => update("matchedLayStake", event.target.value)} placeholder="Enter matched amount" value={entryBet.matchedLayStake}/></label><div className={styles.placementRow}><span>Lay bet</span><button className={styles.secondaryButton} onClick={() => { const amount = Number(entryBet.matchedLayStake); if (!hasCompleteDecimalInputSyntax(entryBet.matchedLayStake) || !hasCompleteDecimalInputSyntax(entryBet.requestedLayStake) || !Number.isFinite(amount) || amount <= 0 || amount > Number(entryBet.requestedLayStake)) { setEntryError("Enter a matched Lay Stake greater than zero and no more than requested."); return; } const errors = getStandardQualifyingErrors({backStake:entryBet.backStake,backOdds:entryBet.backOdds,layOdds:entryBet.layOdds,exchangeCommission:entryBet.commission}); if (errors.layOdds || errors.exchangeCommission) { setEntryError(errors.layOdds || errors.exchangeCommission || "Invalid Lay bet"); return; } setEntryLayConfirmed(true); if(!editingExistingId) setAudit(current => [...current, amount < Number(entryBet.requestedLayStake) ? "Lay partially matched externally · simulated" : "Lay fully matched externally · simulated"]); }} disabled={Boolean(editingExistingId)} type="button">{entryLayConfirmed === null ? "Not Recorded" : entryLayConfirmed ? entryLayIsPartial ? "Partially laid" : "Fully laid" : "Confirm external Lay"}</button></div>{entryLayIsPartial ? <p role="status">Partial hedge: {entryBet.matchedLayStake} matched of {entryBet.requestedLayStake} requested; unmatched portion remains exposed. Financial outcome unavailable for this tuple.</p> : null}</fieldset> : null}
        {mode === "page" && step === 4 ? <fieldset><legend>Finish / Review</legend><div className={styles.fieldPair}><label>Event Name <input onChange={event => update("event", event.target.value)} placeholder="Actual market and selection text" value={entryBet.event}/></label><label>Event date/time <input onChange={event => update("eventDate", event.target.value)} type="datetime-local" value={entryBet.eventDate}/></label></div><dl className={styles.detailGrid}><div><dt>Offer</dt><dd>{entryBet.offerName || entryBet.offerText || "Not captured"}</dd></div><div><dt>Back</dt><dd>{entryBackConfirmed === null ? "Not Recorded" : entryBackConfirmed ? "Confirmed externally" : "Not confirmed"}</dd></div><div><dt>Lay</dt><dd>{entryLayConfirmed === null ? "Not Recorded" : entryLayConfirmed ? entryLayIsPartial ? "Partially matched" : "Fully matched" : "Not confirmed"}</dd></div></dl>{correctionMode && (!editingExistingId || existingMaterialDirty) ? <label>Correction reason <textarea onChange={event => setCorrectionReason(event.target.value)} rows={2} value={correctionReason}/></label> : null}</fieldset> : null}
      </div>{mode === "page" ? <aside className={styles.calcSummary}><h3>Outcome Comparison</h3><p>{entryBet.strategy} · synthetic reference</p>{entryFixtureMatches && !entryLayIsPartial ? <dl><div><dt>Requested Lay Stake</dt><dd>{money(Number(labQualifyingFixture.layStake))}</dd></div><div><dt>Liability</dt><dd>{money(Number(labQualifyingFixture.liability))}</dd></div><div><dt><Icon>chevron_right</Icon> Bookmaker wins</dt><dd>{money(Number(labQualifyingFixture.backWins))}</dd></div><div><dt><Icon>chevron_right</Icon> Exchange wins</dt><dd>{money(Number(labQualifyingFixture.layWins))}</dd></div><div><dt>Conservative</dt><dd>{money(Number(labQualifyingFixture.matchedResult))}</dd></div></dl> : <p role="status">Outcome unavailable for this edited or partial-lay tuple. Only Standard CALC-001 has governed results here.</p>}</aside> : null}</div>
      {entryError ? <p className={styles.error} role="alert">{entryError}</p> : null}
      <div className={styles.entryFooter}><button className={styles.secondaryButton} onClick={closeEntry} type="button">Cancel</button>{editingExistingId ? <button className={styles.primaryButton} onClick={saveExistingBet} type="button">{existingMaterialDirty||correctionMode?"Review Correction":"Save Existing Bet"}</button> : correctionMode ? <button className={styles.primaryButton} onClick={saveCorrection} type="button">Save audited correction</button> : <><button className={styles.secondaryButton} onClick={() => saveBet("Prospecting")} type="button">Save Prospecting</button>{mode === "page" ? <button className={styles.primaryButton} onClick={() => saveBet("Placed")} type="button">Finish Placed record</button> : null}</>}</div>
    </div>;
  }
}
