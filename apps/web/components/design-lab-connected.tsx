"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { DesignLabSelect } from "@/components/design-lab-select";
import { DesignLabHeaderOverlay } from "@/components/design-lab-header-overlay";
import { DesignLabOfferWorkflow, DesignLabPositionTable, DesignLabToday } from "@/components/design-lab-operations";
import { DesignLabLedgerGrid, defaultLabLedgerView, type LabLedgerView, type LabLedgerRow } from "@/components/design-lab-ledger-grid";
import { ModalBoundary } from "@/components/modal-boundary";
import { useTheme } from "@/components/theme-provider";
import { aggregateFinancialValues } from "@/lib/financial-aggregate";
import { formatFinancialValue } from "@/lib/financial-display";
import { getStandardQualifyingErrors } from "@/lib/standard-qualifying-calculator";
import { hasCompleteDecimalInputSyntax } from "@/lib/sportsbook-odds-input";
import { initialLabAccounts, labAccountBalanceError, labProfiles, saveLabAccountBalance, summarizeDesignLab, type LabAccount, type LabProfileId, type LabScope, type LabRange } from "@/lib/design-lab-fixture";
import { labLedgerColumns, labQualifyingFixture, labRecords, labReportPoints, type LabLedgerKey, type LabRecord } from "@/lib/design-lab-connected-data";
import styles from "./design-lab-connected.module.css";

type Section = "home" | "tasks" | "offers" | "opportunities" | "profiles" | "reports" | LabLedgerKey;
type EntryMode = "modal" | "page";
type BetState = "Draft" | "Prospecting" | "Placed" | "Settled";
type Workspace = "manager" | "tracker";
type Overlay = "workspace" | "notifications" | "help" | "identity" | null;
const nav: { id: Section; label: string; icon: string; group: string }[] = [
  { id: "home", label: "Position", icon: "space_dashboard", group: "Fund Manager" },
  { id: "tasks", label: "Today", icon: "task_alt", group: "Fund Manager" },
  { id: "offers", label: "Recurring Offers", icon: "event_repeat", group: "More" },
  { id: "opportunities", label: "Opportunities", icon: "travel_explore", group: "Fund Manager" },
  { id: "profiles", label: "Profiles", icon: "group", group: "More" },
  { id: "sportsbook", label: "Sportsbook Bets", icon: "sports_soccer", group: "Profile work" },
  { id: "accounts", label: "Accounts", icon: "account_balance_wallet", group: "Fund Manager" },
  { id: "freeBets", label: "Free Bets", icon: "redeem", group: "Profile work" },
  { id: "casino", label: "Casino Offers", icon: "casino", group: "Profile work" },
  { id: "extraPlace", label: "Extra Place", icon: "emoji_events", group: "Profile work" },
  { id: "cash", label: "Cash Adjustments", icon: "account_balance", group: "Profile work" },
  { id: "reports", label: "Reports", icon: "monitoring", group: "Fund Manager" },
];
const sectionName = (section: Section) => nav.find(item => item.id === section)?.label ?? "Position";
const money = (value: number) => value === 0 ? "£0.00" : formatFinancialValue(value);
function Icon({ children }: { children: ReactNode }) { return <span aria-hidden="true" className="material-symbols-outlined">{children}</span>; }

type LabBetDraft = { event: string; offerText: string; offerName: string; offerType: string; betType: string; fixtureType: string; eventDate: string; bookmaker: string; exchange: string; backStake: string; backOdds: string; layOdds: string; requestedLayStake: string; matchedLayStake: string; commission: string; strategy: string };
const initialBet: LabBetDraft = { event: "", offerText: "", offerName: "", offerType: "Qualifying", betType: "Normal", fixtureType: "Football", eventDate: "", bookmaker: "", exchange: "Exchange A", backStake: "", backOdds: "", layOdds: "", requestedLayStake: "", matchedLayStake: "", commission: "", strategy: "Standard" };

export function DesignLabConnected() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [accounts, setAccounts] = useState<LabAccount[]>(initialLabAccounts);
  const [section, setSection] = useState<Section>("home");
  const [scope, setScope] = useState<LabScope>("all");
  const [range, setRange] = useState<LabRange>("Last Month");
  const [collapsed, setCollapsed] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace>("manager");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [showMore, setShowMore] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResultsOpen, setSearchResultsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [ledgerViews, setLedgerViews] = useState<Partial<Record<LabLedgerKey, LabLedgerView>>>({});
  const [savedView, setSavedView] = useState<{ section: LabLedgerKey; view: LabLedgerView } | null>(null);
  const ledgerScroll = useRef<Partial<Record<LabLedgerKey, { left: number; top: number }>>>({});
  const [selected, setSelected] = useState<LabRecord | null>(null);
  const [previewEditor, setPreviewEditor] = useState<{ section: LabLedgerKey; mode: "Add" | "Edit" } | null>(null);
  const [previewStage, setPreviewStage] = useState("Offer Setup");
  const [returnSection, setReturnSection] = useState<Section>("home");
  const [returnScope, setReturnScope] = useState<LabScope>("all");
  const [copiedRows, setCopiedRows] = useState<LabRecord[]>([]);
  const [labDoneTasks, setLabDoneTasks] = useState<string[]>([]);
  const [labDeferredTasks, setLabDeferredTasks] = useState<string[]>([]);
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
  const realisedWithNew = aggregateFinancialValues([summary.realised.knownValue, ...(betState === "Settled" && newBetInScope && range === "This Year" ? [fixtureMatches && !layIsPartial ? -0.62 : Number.NaN] : [])]);
  const exposureWithNew = aggregateFinancialValues([summary.exposure.knownValue, ...(betState === "Placed" && newBetInScope ? [fixtureMatches && !layIsPartial ? Number(labQualifyingFixture.liability) : Number.NaN] : [])]);
  const reportPoints = [
    ...labReportPoints.filter(point => (scope === "all" || point.profileId === scope) && (range === "This Year" || point.month === "Oct")),
    ...(betState === "Settled" && newBetInScope && range === "This Year" && fixtureMatches && !layIsPartial ? [{ id: "LAB-SB-NEW", date: "1 Nov", value: -0.62 }] : []),
  ].sort((a, b) => ({ "12 Sep": 0, "20 Sep": 1, "8 Oct": 2, "15 Oct": 3, "1 Nov": 4 }[a.date as "12 Sep" | "20 Sep" | "8 Oct" | "15 Oct" | "1 Nov"] - { "12 Sep": 0, "20 Sep": 1, "8 Oct": 2, "15 Oct": 3, "1 Nov": 4 }[b.date as "12 Sep" | "20 Sep" | "8 Oct" | "15 Oct" | "1 Nov"]));
  const betDirty = JSON.stringify(bet) !== JSON.stringify(initialBet) && (betState === "Draft" || correctionMode);
  const accountDirty = editingAccount !== null && balanceDraft !== editingAccount.currentBalance;
  const records = useMemo(() => {
    const listed = [...copiedRows, ...labRecords].filter(item => scope === "all" || item.profileId === scope);
    if (betState === "Draft") return listed;
    const added: LabRecord = { id: "LAB-SB-NEW", profileId: recordedBetProfile, section: "sportsbook", title: bet.event || bet.offerName || "Offer captured · event pending", subtitle: `${bet.bookmaker} · ${bet.strategy}`, status: betState, cells: [bet.eventDate || "Not entered", bet.bookmaker, bet.event || "Event pending", bet.offerName || "—", bet.offerText || "—", bet.strategy, layConfirmed ? layIsPartial ? "Partially laid" : "Matched" : "Not confirmed", backConfirmed ? "Confirmed" : "Not confirmed", betState === "Settled" && fixtureMatches && !layIsPartial ? "£ (0.62)" : betState === "Prospecting" ? "Planning · unavailable" : fixtureMatches && !layIsPartial ? "Current £ (0.62)" : "Current · unavailable", betState, "Open"] };
    return scope === "all" || scope === recordedBetProfile ? [added, ...listed] : listed;
  }, [scope, copiedRows, betState, recordedBetProfile, bet, backConfirmed, layConfirmed, layIsPartial, fixtureMatches]);
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
    if (accountDirty || (entryMode !== null && betDirty)) {
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      pendingAction.current = action;
      setDirtyConfirm(true);
      return;
    }
    action();
  }
  function go(next: Section) { guarded(() => { setSelected(null); setPreviewEditor(null); setEntryMode(null); setSection(next); if (next === "sportsbook") setWorkspace("tracker"); setMobileNav(false); setOverlay(null); setSearch(""); setSearchOpen(false); setSearchResultsOpen(false); }); }
  function toggleOverlay(next: Exclude<Overlay,null>, trigger: HTMLElement) { headerTriggerRef.current = trigger; setSearchResultsOpen(false); setOverlay(current => current === next ? null : next); }
  function changeWorkspace(next: Workspace) { setWorkspace(next); setOverlay(null); go(next === "manager" ? "home" : "sportsbook"); }
  function openRecord(record: LabRecord) { guarded(() => { setReturnSection(section); setReturnScope(scope); if (section === "tasks" || section === "offers") setScope(record.profileId); setSelected(record); setPreviewEditor(null); setPreviewStage(record.section === "freeBets" ? "Available" : "Offer Setup"); setSection(record.section); setSearch(""); setSearchOpen(false); }); }
  function openAccount(account: LabAccount) { openRecord({ id: account.id, profileId: account.profileId, section: "accounts", title: account.name, subtitle: account.type, status: account.status, cells: [account.id, account.name, account.type, account.status, "Yes", account.currentBalance ? money(Number(account.currentBalance)) : "Unknown", "—", "—", "—", "—", "—", "Open"] }); }
  function openEntry(mode: EntryMode) { setCorrectionMode(false); setEntryError(""); setEntryMode(mode); setStep(0); setSelected(null); setMobileNav(false); }
  function closeEntry() { guarded(() => { setEntryMode(null); setEntryError(""); }); }
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
    setBetState(next); setAudit(current => [...current, `${next} · simulated · 1 Nov 2026`]); setEntryError(""); setEntryMode(null); setSection("sportsbook");
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
    setCorrectionMode(false); setEntryMode(null); setEntryError(""); setSelected(null); setSection("sportsbook");
  }
  function selectSearchResult(item: (typeof searchIndex)[number]) {
    if (item.section === "reports") { setScope(item.profileId as LabScope); go("reports"); return; }
    if (item.section === "accounts") { const account = accounts.find(row => row.id === item.id); if (account) openAccount(account); return; }
    const record = records.find(row => row.id === item.id); if (record) openRecord(record);
  }
  const ledgerSection = section in labLedgerColumns ? section as LabLedgerKey : null;
  const visibleReportIds = new Set(reportPoints.map(point => point.id));
  const mainTitle = entryMode === "page" ? "Add Sportsbook Bet" : previewEditor ? `${previewEditor.mode} ${sectionName(previewEditor.section)}` : selected ? selected.title : sectionName(section);

  return <div className={styles.lab} data-pd-id="design-lab-connected.root">
    <a className={styles.skip} href="#lab-main">Skip to content</a>
    <div className={`${styles.frame} ${collapsed ? styles.collapsed : ""}`}>
      {mobileNav ? <button aria-label="Dismiss navigation" className={styles.navScrim} onClick={() => { setMobileNav(false); navTriggerRef.current?.focus(); }} tabIndex={-1} type="button" /> : null}
      <aside aria-label="Design Lab navigation" className={`${styles.sidebar} ${mobileNav ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}><BrandLogo variant="mark" /><span>Plum Duff <small>Design Lab</small></span></div>
        <div className={styles.navGroup}><p>{workspace === "manager" ? "Fund Manager" : "Tracker workspace"}</p><nav aria-label="Primary destinations">{workspace === "manager" ? <>{nav.filter(item => ["home","tasks","opportunities"].includes(item.id)).map(item => <button aria-current={section === item.id ? "page" : undefined} className={section === item.id ? styles.navActive : ""} data-pd-id={`lab.nav.${item.id}`} key={item.id} onClick={() => go(item.id)} title={item.label} type="button"><Icon>{item.icon}</Icon><span>{item.label}</span></button>)}<button aria-current={section === "sportsbook" ? "page" : undefined} className={section === "sportsbook" ? styles.navActive : ""} data-pd-id="lab.nav.sportsbook" onClick={() => go("sportsbook")} title="Sportsbook Bets" type="button"><Icon>table_chart</Icon><span>Sportsbook Bets</span></button>{nav.filter(item => ["accounts","reports"].includes(item.id)).map(item => <button aria-current={section === item.id ? "page" : undefined} className={section === item.id ? styles.navActive : ""} data-pd-id={`lab.nav.${item.id}`} key={item.id} onClick={() => go(item.id)} title={item.label} type="button"><Icon>{item.icon}</Icon><span>{item.label}</span></button>)}</> : nav.filter(item => ["sportsbook","accounts","freeBets","casino","extraPlace","cash","reports"].includes(item.id)).map(item => <button aria-current={section === item.id ? "page" : undefined} className={section === item.id ? styles.navActive : ""} data-pd-id={`lab.nav.${item.id}`} key={item.id} onClick={() => go(item.id)} title={item.label} type="button"><Icon>{item.icon}</Icon><span>{item.label}</span></button>)}</nav></div>
        {workspace === "manager" ? <div className={styles.navGroup}><button aria-expanded={showMore} className={styles.moreButton} onClick={() => setShowMore(value => !value)} type="button"><Icon>{showMore ? "expand_less" : "expand_more"}</Icon><span>See More</span></button>{showMore ? <nav aria-label="Less frequent destinations">{nav.filter(item => item.group !== "Fund Manager" && item.id !== "sportsbook").map(item => <button key={item.id} onClick={() => go(item.id)} type="button"><Icon>{item.icon}</Icon><span>{item.label}</span></button>)}</nav> : null}</div> : null}
        <div className={styles.navFooter}>Synthetic data · no owner writes</div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.header} data-pd-id="lab.header">
          <div className={styles.headerLeft}>
            <div className={styles.headerIdentity}>
              <button aria-label={mobileNav ? "Close navigation" : "Open navigation"} aria-expanded={mobileNav} className={`${styles.iconButton} ${styles.navToggle}`} onClick={() => setMobileNav(value => !value)} ref={navTriggerRef} type="button"><Icon>menu</Icon></button>
              <button aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} className={`${styles.iconButton} ${styles.collapseButton}`} onClick={() => setCollapsed(value => !value)} type="button"><Icon>{collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}</Icon></button>
              <strong className={styles.headerTitle}>{workspace === "manager" ? "Fund Manager" : "Tracker"}</strong>
            </div>
            <div className={styles.profileSelect}><DesignLabSelect compact dataPdId="lab.profile" label="Profile" onChange={value => guarded(() => { setScope(value as LabScope); setSelected(null); })} options={[{ value: "all", label: "All Profiles" }, ...labProfiles.map(item => ({ value: item.id, label: item.name }))]} value={scope} /></div>
          </div>
          <div className={styles.headerRight}>
            <div className={`${styles.searchBox} ${searchOpen ? styles.searchExpanded : ""}`} ref={searchBoxRef} role="search"><Icon>search</Icon><input aria-label="Search synthetic Plum Duff" data-pd-id="lab.search" onChange={event => { setSearch(event.target.value); setSearchResultsOpen(Boolean(event.target.value.trim())); setOverlay(null); }} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setSearchResultsOpen(false); if (searchOpen) { setSearchOpen(false); event.currentTarget.blur(); } } else if (event.key === "ArrowDown" && searchResultsOpen) { event.preventDefault(); document.querySelector<HTMLElement>('[data-pd-id="lab.search-results"] button')?.focus(); } }} placeholder="Search" ref={searchRef} type="search" value={search} /></div>
            <button aria-label="Open search" className={`${styles.iconButton} ${styles.mobileSearch}`} onClick={() => { setSearchOpen(true); requestAnimationFrame(() => searchRef.current?.focus()); }} type="button"><Icon>search</Icon></button>
            <button aria-expanded={overlay === "notifications"} aria-label="Notifications" className={styles.iconButton} data-pd-id="lab.header-trigger.notifications" onClick={event => toggleOverlay("notifications", event.currentTarget)} type="button"><Icon>notifications</Icon></button>
            <button aria-expanded={overlay === "help"} aria-label="Design Lab help" className={`${styles.iconButton} ${styles.helpButton}`} data-pd-id="lab.header-trigger.help" onClick={event => toggleOverlay("help", event.currentTarget)} type="button"><Icon>help</Icon></button>
            <button aria-expanded={overlay === "workspace"} aria-label="Switch workspace" className={styles.iconButton} data-pd-id="lab.header-trigger.workspace" onClick={event => toggleOverlay("workspace", event.currentTarget)} type="button"><Icon>apps</Icon></button>
            <button aria-expanded={overlay === "identity"} aria-label="Account menu" className={`${styles.iconButton} ${styles.avatarButton}`} data-pd-id="lab.header-trigger.identity" onClick={event => toggleOverlay("identity", event.currentTarget)} type="button">L</button>
          </div>
          {overlay ? <DesignLabHeaderOverlay anchorRef={headerTriggerRef} key={overlay} label={overlay === "workspace" ? "Workspaces" : overlay === "identity" ? "Account menu" : overlay === "help" ? "Design Lab help" : "Notifications"} onClose={() => setOverlay(null)} preferredWidth={overlay === "identity" ? 460 : 380}>
            {overlay === "workspace" ? <div className={styles.menuBody}><h2>Workspaces</h2><button className={styles.menuRow} onClick={() => changeWorkspace("manager")} type="button"><Icon>space_dashboard</Icon><span><strong>Fund Manager</strong><small>Position and Today</small></span>{workspace === "manager" ? <Icon>check</Icon> : null}</button><button className={styles.menuRow} onClick={() => changeWorkspace("tracker")} type="button"><Icon>table_chart</Icon><span><strong>Tracker / Betting Tools</strong><small>Ledgers and records</small></span>{workspace === "tracker" ? <Icon>check</Icon> : null}</button><button className={styles.menuRow} disabled title="Administration is a future lab preview" type="button"><Icon>admin_panel_settings</Icon><span><strong>Administration</strong><small>Preview only</small></span></button><button className={`${styles.menuRow} ${styles.mobileHelpRow}`} onClick={() => setOverlay("help")} type="button"><Icon>help</Icon><span>Design Lab help</span></button></div> : overlay === "notifications" ? <div className={styles.menuBody}><h2>Notifications</h2><h3>Needs Action</h3><button className={styles.menuRow} onClick={() => { setOverlay(null); go("tasks"); }} type="button"><Icon>account_balance_wallet</Icon><span><strong>Account balance unknown</strong><small>Open Today · synthetic</small></span></button><h3>Offers</h3><button className={styles.menuRow} onClick={() => { setOverlay(null); go("opportunities"); }} type="button"><Icon>local_offer</Icon><span><strong>Offer review</strong><small>Open Opportunities · synthetic</small></span></button><h3>Account</h3><p className={styles.menuEmpty}>No Account updates.</p></div> : overlay === "help" ? <div className={styles.menuBody}><h2>Design Lab help</h2><button className={styles.menuRow} onClick={() => { setOverlay(null); go("home"); }} type="button"><Icon>space_dashboard</Icon><span><strong>Position</strong><small>Return to the synthetic overview</small></span></button><button className={styles.menuRow} onClick={() => { setOverlay(null); go("sportsbook"); }} type="button"><Icon>table_chart</Icon><span><strong>Sportsbook Bets</strong><small>Explore the lab ledger</small></span></button><p className={styles.menuEmpty}>Synthetic data only. No owner financial writes.</p></div> : <div className={styles.menuBody}><div className={styles.menuIdentity}><span aria-hidden="true" className={styles.menuAvatar}>L</span><div><strong>Lab Manager</strong><small>demo@example.invalid</small><button disabled title="Identity management is not simulated" type="button">Manage Account · preview</button></div></div><div className={styles.menuGroup}><button className={styles.menuRow} disabled title="Profile creation is not simulated" type="button"><Icon>person_add</Icon><span>Add Profile · preview</span></button><button className={styles.menuRow} disabled title="Settings are not simulated" type="button"><Icon>settings</Icon><span>Settings · preview</span></button><button aria-checked={theme === "dark"} className={`${styles.menuSwitch} material-switch${theme === "dark" ? " is-selected" : ""}`} data-pd-id="lab.identity.dark-mode" onClick={toggleTheme} role="switch" type="button"><Icon>dark_mode</Icon><span>Dark Mode</span><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span></button></div><div className={styles.menuGroup}><button className={`${styles.menuRow} ${styles.menuDanger}`} disabled title="Sign Out is unavailable in the synthetic lab" type="button"><Icon>logout</Icon><span>Sign Out · lab unavailable</span></button></div></div>}
          </DesignLabHeaderOverlay> : null}
          {search.trim() && searchResultsOpen && !overlay ? <DesignLabHeaderOverlay anchorRef={searchBoxRef} label="Search results" onClose={() => setSearchResultsOpen(false)} preferredWidth={480} returnFocusRef={searchRef} search><div className={styles.searchGroups} onKeyDown={event => { if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return; const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")]; const current = buttons.indexOf(document.activeElement as HTMLButtonElement); const next = event.key === "ArrowDown" ? Math.min(buttons.length - 1, current + 1) : Math.max(0, current - 1); if (buttons[next]) { event.preventDefault(); buttons[next].focus(); } }}>{["Accounts", "Sportsbook", "Free Bets", "Casino Offers", "Extra Place", "Cash Adjustments", "Reports"].map(kind => { const group = searchResults.filter(item => item.kind === kind); return group.length ? <div key={kind}><h2>{kind}</h2>{group.map(item => <button key={item.id} onClick={() => { setSearchResultsOpen(false); selectSearchResult(item); }} type="button"><span><strong>{item.title}</strong><small>{item.context} · {labProfiles.find(profile => profile.id === item.profileId)?.name}</small></span><Icon>arrow_forward</Icon></button>)}</div> : null; })}{!searchResults.length ? <p>No synthetic results.</p> : null}</div></DesignLabHeaderOverlay> : null}
        </header>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}><button onClick={() => go("home")} type="button">Position</button>{section !== "home" || selected || entryMode ? <><Icon>chevron_right</Icon><button onClick={() => go("sportsbook")} type="button">Tracker</button></> : null}{section !== "home" || selected || entryMode ? <><Icon>chevron_right</Icon>{selected || entryMode ? <button onClick={() => go(section)} type="button">{entryMode ? "Sportsbook Bets" : sectionName(section)}</button> : <span aria-current="page">{sectionName(section)}</span>}</> : null}{selected || entryMode ? <><Icon>chevron_right</Icon><span aria-current="page">{selected ? "Record" : "Add Bet"}</span></> : null}<span className={styles.labBadge}>LAB · simulation</span></nav>
        <main className={styles.main} data-pd-id="lab.main" id="lab-main">
          <div className={styles.pageHead}><div><h1 ref={headingRef} tabIndex={-1}>{mainTitle}</h1><p>{entryMode ? "Offer first · prepare and confirm external placement later" : selected ? selected.subtitle : section === "home" ? "Position, tasks and the next decision." : "Synthetic workflow preview"}</p></div><div className={styles.headActions}><DesignLabSelect dataPdId="lab.range" label="Selected Range" onChange={value => guarded(() => setRange(value as LabRange))} options={[{ value: "Last Month", label: "Last Month" }, { value: "This Year", label: "This Year" }]} value={range} /><button className={styles.linkButton} onClick={() => router.push("/")} type="button">Exit Lab</button></div></div>
          {entryMode === "page" ? renderBetEntry("page") : previewEditor ? renderPreviewEditor() : selected ? <section className={styles.surface} data-pd-id="lab.record-detail"><button className={styles.linkButton} onClick={() => { setSelected(null); setScope(returnScope); setSection(returnSection); }} type="button"><Icon>arrow_back</Icon> Back to {sectionName(returnSection)}</button><div className={styles.sectionHead}><h2>{selected.title}</h2><span className={styles.status}>{selected.status}</span></div><p>{selected.subtitle} · {selected.id} · Owner: {labProfiles.find(profile => profile.id === selected.profileId)?.name}</p><p>{selected.previewOnly ? "Representative preview · deeper edits are not simulated." : "Synthetic source record"}</p><dl className={styles.detailGrid}>{labLedgerColumns[selected.section].map((label, index) => <div key={`${label}-${index}`}><dt>{label}</dt><dd>{selected.cells[index] ?? "—"}</dd></div>)}</dl><div className={styles.actionRow}>{selected.previewOnly ? <button className={styles.secondaryButton} onClick={() => setPreviewEditor({ section: selected.section, mode: "Edit" })} type="button">Preview edit layout</button> : null}{selectedAccount ? <button className={styles.primaryButton} onClick={() => { setEditingAccount(selectedAccount); setBalanceDraft(selectedAccount.currentBalance); setAccountError(""); }} type="button">Review balance</button> : null}{selected.relatedId ? <button className={styles.secondaryButton} onClick={() => { const related = records.find(item => item.id === selected.relatedId); if (related) openRecord(related); }} type="button">Open linked {selected.relatedId.startsWith("LAB-FB") ? "Free Bet" : "qualifying bet"}</button> : null}{selectedIsNewBet && betState === "Placed" ? <><button className={styles.primaryButton} onClick={() => settle("Back wins")} type="button">Settle · back wins</button><button className={styles.secondaryButton} onClick={() => settle("Lay wins")} type="button">Settle · lay wins</button><button className={styles.secondaryButton} onClick={() => { setCorrectionMode(true); setCorrectionReason(""); setEntryMode("page"); setStep(2); }} type="button">Correct placed execution</button></> : null}{selectedIsNewBet && betState === "Prospecting" ? <button className={styles.primaryButton} onClick={() => openEntry("page")} type="button">Review for placement</button> : null}{selectedIsNewBet && betState === "Settled" ? <button className={styles.secondaryButton} onClick={() => { setCorrectionMode(true); setCorrectionReason(""); setEntryMode("page"); setStep(0); }} type="button">Correct synthetic details</button> : null}</div>{selected.section === "casino" ? <div className={styles.workflowPreview}><h3>Offer flow · preview only</h3><div className={styles.stageTabs}>{["Offer Setup", "Wagering", "Reward", "Settlement"].map(stage => <button aria-pressed={previewStage === stage} key={stage} onClick={() => setPreviewStage(stage)} type="button">{stage}</button>)}</div><p>{previewStage === "Offer Setup" ? "Offer type, game, qualification and expiry are reviewed first." : previewStage === "Wagering" ? "Qualifying and reward wagering remain separate; progress is not simulated here." : previewStage === "Reward" ? "Reward face value and conversion remain distinct from cash P&L." : "Settlement requires the governed result and explicit confirmation."}</p></div> : null}{selected.section === "freeBets" ? <div className={styles.workflowPreview}><h3>Free Bet lifecycle · preview only</h3><div className={styles.stageTabs}>{["Awarded", "Available", "Placed", "Settled"].map(stage => <button aria-pressed={previewStage === stage} key={stage} onClick={() => setPreviewStage(stage)} type="button">{stage}</button>)}</div><p>{previewStage} is a view of the proposed flow; this sample remains Available and linked to its qualifying bet.</p></div> : null}{selectedIsNewBet ? <>{entryError ? <p className={styles.error} role="alert">{entryError}</p> : null}<h3>Offer source</h3><p>{bet.offerText || "Original text not captured"}</p><h3>Execution</h3><p>Back: {backConfirmed ? "Externally confirmed" : "Not confirmed"} · Lay: {layConfirmed ? layIsPartial ? `Partially matched (${bet.matchedLayStake} of ${bet.requestedLayStake})` : "Fully matched" : "Not confirmed"}</p><h3>History</h3><ol>{audit.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol><button className={styles.linkButton} onClick={() => go("reports")} type="button">View report entry <Icon>arrow_forward</Icon></button></> : null}</section> : section === "home" ? <>
            <section aria-label="Financial position" className={styles.metrics} data-pd-id="lab.metrics"><div><span>Known cash</span><strong>{money(Number(summary.cash.knownSubtotal))}</strong><small>{summary.cashMissingCount ? `Incomplete · ${summary.cashMissingCount} Account balance missing` : "All included balances known"}</small></div><div><span>Realised P&amp;L</span><strong>{money(realisedWithNew.knownValue)}</strong><small>{range} · settled results{realisedWithNew.unknownCount ? ` · ${realisedWithNew.unknownCount} unavailable` : ""}</small></div><div><span>Committed exposure</span><strong>{money(exposureWithNew.knownValue)}</strong><small>Placed positions only; planning excluded{exposureWithNew.unknownCount ? ` · ${exposureWithNew.unknownCount} unavailable` : ""}</small></div></section>
            <div className={styles.dashboardGrid}><section className={styles.surface}><div className={styles.sectionHead}><h2>Next actions</h2><button className={styles.linkButton} onClick={() => go("tasks")} type="button">All tasks <Icon>arrow_forward</Icon></button></div>{summary.actionableAccounts.map(item => <div className={styles.task} key={item.id}><div><strong>Confirm current balance</strong><p>{item.name} · {labProfiles.find(profile => profile.id === item.profileId)?.name}</p></div><button className={styles.primaryButton} onClick={() => openAccount(item)} type="button">Review Account</button></div>)}{!summary.actionableAccounts.length ? <p>No Account balance tasks in this Profile.</p> : null}<div className={styles.task}><div><strong>Review open Sportsbook positions</strong><p>Committed exposure stays separate from planning.</p></div><button className={styles.secondaryButton} onClick={() => go("sportsbook")} type="button">Open Sportsbook</button></div></section><section className={styles.surface}><h2>Continue work</h2><button className={styles.quickLink} onClick={() => go("sportsbook")} type="button"><Icon>sports_soccer</Icon><span>Record and settle a bet</span><Icon>arrow_forward</Icon></button><button className={styles.quickLink} onClick={() => go("reports")} type="button"><Icon>monitoring</Icon><span>Review performance</span><Icon>arrow_forward</Icon></button><button className={styles.quickLink} onClick={() => go("freeBets")} type="button"><Icon>redeem</Icon><span>Inspect linked Free Bets</span><Icon>arrow_forward</Icon></button></section></div>
            <DesignLabPositionTable accounts={accounts} scope={scope} range={range} onOpenReport={profileId => { setScope(profileId); go("reports"); }} />
          </> : section === "opportunities" ? <section className={styles.surface}><h2>Opportunities · advisory preview</h2><p>No live promotion or provider claim is made in this synthetic lab.</p><div className={styles.task}><div><strong>Capture an offer you found</strong><p>Discord, bookmaker or another source · keep the original wording.</p></div><button className={styles.primaryButton} onClick={() => { go("sportsbook"); openEntry("modal"); }} type="button">Quick Capture</button></div><div className={styles.task}><div><strong>Review current Prospecting</strong><p>Planning is separate from committed exposure.</p></div><button className={styles.secondaryButton} onClick={() => go("sportsbook")} type="button">Open Tracker</button></div></section>
          : section === "tasks" ? <DesignLabToday scope={scope} records={[...copiedRows, ...labRecords]} accounts={accounts} done={labDoneTasks} deferred={labDeferredTasks} onDoneChange={setLabDoneTasks} onDeferredChange={setLabDeferredTasks} onOpenSource={id => { const account = accounts.find(item => item.id === id); if (account) { openAccount(account); return; } const source = [...copiedRows, ...labRecords].find(item => item.id === id); if (source) openRecord(source); }} onOpenOffer={() => go("offers")} onInspectHistory={() => go("offers")} />
          : section === "offers" ? <DesignLabOfferWorkflow records={[...copiedRows, ...labRecords]} onCreated={rows => setCopiedRows(current => [...current, ...rows.filter(row => !current.some(existing => existing.id === row.id))])} onOpenRecord={id => { const row = [...copiedRows, ...labRecords].find(item => item.id === id); if (row) openRecord(row); }} onReturn={() => go("tasks")} />
          : section === "profiles" ? <section className={styles.surface}><h2>Profiles</h2>{labProfiles.map(item => <div className={styles.task} key={item.id}><div><strong>{item.name}</strong><p>{item.id}</p></div><button className={styles.secondaryButton} onClick={() => { setScope(item.id); go("home"); }} type="button">Open position</button></div>)}</section>
          : section === "reports" ? <section className={styles.reportGrid} data-pd-id="lab.reports"><div className={styles.metrics}><div><span>Known realised P&amp;L</span><strong>{money(realisedWithNew.knownValue)}</strong><small>Settled sources only · {range}</small></div><div><span>Committed exposure</span><strong>{money(exposureWithNew.knownValue)}</strong><small>Planning excluded{exposureWithNew.unknownCount ? ` · ${exposureWithNew.unknownCount} unavailable` : ""}</small></div><div><span>Known cash</span><strong>{money(Number(summary.cash.knownSubtotal))}</strong><small>{summary.cashMissingCount ? `Incomplete · ${summary.cashMissingCount} unknown` : "Complete"}</small></div></div><section className={styles.surface}><h2>Performance · source points</h2><p>Selected range: {range}. Points are validated synthetic settled records; no interpolation.</p><div className={styles.chart} aria-label="Synthetic settled P and L source values">{reportPoints.map(point => <button aria-label={`Open ${point.date} source record, ${money(point.value)}`} className={styles.chartPoint} key={point.id} onClick={() => { const source = records.find(item => item.id === point.id); if (source) openRecord(source); }} title={`${point.id}: ${money(point.value)}`} type="button"><span className={point.value < 0 ? styles.chartNegative : styles.chartPositive} style={{ height: `${Math.max(12, Math.abs(point.value) / 24.7 * 65)}%` }}/><small>{point.date}</small><strong>{money(point.value)}</strong></button>)}</div></section><section className={styles.surface}><h2>P&amp;L by ledger</h2><dl className={styles.domainBreakdown}><div><dt>Sportsbook · settled</dt><dd>{money(realisedWithNew.knownValue)}</dd></div><div><dt>Free Bets</dt><dd>No settled activity</dd></div><div><dt>Casino Offers</dt><dd>Unavailable · wagering sample is unresolved</dd></div><div><dt>Extra Place</dt><dd>No settled activity</dd></div></dl></section><section className={styles.surface}><h2>Source drilldown</h2><div className={styles.reportRows}>{records.filter(item => item.section === "sportsbook" && item.status === "Settled" && visibleReportIds.has(item.id)).map(item => <button key={item.id} onClick={() => openRecord(item)} type="button"><span><strong>{item.title}</strong><small>{item.id} · Sportsbook · settled</small></span><span>{item.id === "LAB-SB-NEW" ? money(-0.62) : item.cells[8]}</span></button>)}</div></section></section>
          : ledgerSection ? renderLedger(ledgerSection) : null}
          <details className={styles.simControls}><summary>Simulation controls</summary><label><input checked={failedSave} onChange={event => setFailedSave(event.target.checked)} type="checkbox"/> Fail the next simulated save</label><p>Refresh resets synthetic edits.</p></details>
        </main>
      </div>
    </div>
    {entryMode === "modal" ? <ModalBoundary onDismiss={closeEntry}><div className="modal-backdrop"><div aria-labelledby="lab-entry-title" className={styles.entryModal} role="dialog"><div className={styles.modalHead}><h2 id="lab-entry-title">Quick add Sportsbook Bet</h2><button aria-label="Close quick add" className={styles.iconButton} onClick={closeEntry} type="button"><Icon>close</Icon></button></div><div className={styles.modalBody}>{renderBetEntry("modal")}</div></div></div></ModalBoundary> : null}
    {editingAccount ? <ModalBoundary onDismiss={() => guarded(() => setEditingAccount(null))}><div className="modal-backdrop"><form aria-labelledby="lab-account-edit-title" className={styles.editModal} onSubmit={event => { event.preventDefault(); saveAccount(); }} role="dialog"><div className={styles.modalHead}><h2 id="lab-account-edit-title">Review {editingAccount.name}</h2><button aria-label="Close Account review" className={styles.iconButton} onClick={() => guarded(() => setEditingAccount(null))} type="button"><Icon>close</Icon></button></div><dl className={styles.balanceMeta}><div><dt>Last observed balance</dt><dd>{editingAccount.currentBalance ? money(Number(editingAccount.currentBalance)) : "Unknown"}</dd></div><div><dt>Observation time</dt><dd>{accountObservedAt[editingAccount.id] || "No confirmed lab observation"}</dd></div><div><dt>Expected movement</dt><dd>Unavailable in this synthetic sample; never applied to observed cash</dd></div></dl>{accountAudit[editingAccount.id]?.length ? <p>Observation history: {accountAudit[editingAccount.id].join("; ")}</p> : null}<p>Blank is unknown. Enter 0.00 only when zero is confirmed.</p><label>Observed Current Balance <span className={styles.moneyInput}>£ <input aria-invalid={Boolean(accountError)} onChange={event => { setBalanceDraft(event.target.value); setAccountError(""); }} value={balanceDraft}/></span></label>{accountError ? <p className={styles.error} role="alert">{accountError}</p> : null}<div className={styles.actionRow}><button className={styles.secondaryButton} onClick={() => guarded(() => setEditingAccount(null))} type="button">Cancel</button><button className={styles.primaryButton} type="submit">Confirm balance observation · simulation</button></div></form></div></ModalBoundary> : null}
    {dirtyConfirm ? <ModalBoundary onDismiss={() => setDirtyConfirm(false)} returnFocusRef={triggerRef}><div className="modal-backdrop"><div aria-labelledby="lab-dirty-title" className={styles.editModal} role="dialog"><h2 id="lab-dirty-title">Unsaved changes</h2><p>Keep the synthetic draft or discard these edits?</p><div className={styles.actionRow}><button className={styles.secondaryButton} onClick={() => setDirtyConfirm(false)} type="button">Keep editing</button><button className={styles.dangerButton} onClick={() => { setDirtyConfirm(false); setEditingAccount(null); setBet(initialBet); const action = pendingAction.current; pendingAction.current = null; action?.(); }} type="button">Discard changes</button></div></div></div></ModalBoundary> : null}
  </div>;

  function renderLedger(key: LabLedgerKey) {
    const ledgerRows: LabLedgerRow[] = key === "accounts"
      ? accounts.filter(item => scope === "all" || item.profileId === scope).map(item => ({
        id: item.id, profileId: item.profileId, section: "accounts", title: item.name, subtitle: item.type,
        status: item.currentBalance ? "Known" : "Needs attention",
        cells: [item.id,item.name,item.type,item.status,"Yes",item.currentBalance ? money(Number(item.currentBalance)) : "Unknown","—","—","—","—","—","Open"],
        onOpen: () => openAccount(item),
      }))
      : records.filter(item => item.section === key).map(item => ({ ...item, onOpen: () => openRecord(item) }));
    return <DesignLabLedgerGrid ledgerKey={key} rows={ledgerRows} scope={scope} accounts={accounts}
      view={ledgerViews[key] ?? defaultLabLedgerView(key)}
      onViewChange={view => setLedgerViews(current => ({ ...current, [key]: view }))}
      savedView={savedView} onSaveView={setSavedView} onOpenEntry={openEntry}
      onOpenBalance={id => { const account = accounts.find(item => item.id === id); if (account) { setEditingAccount(account); setBalanceDraft(account.currentBalance); setAccountError(""); } }}
      bet={bet} onBetChange={patch => { setBet(current => ({...current,...patch})); setAudit(current => [...current, `Prospecting fields updated in ledger · ${Object.keys(patch).join(", ")} · simulated`]); }} betState={betState}
      onRequestPlacement={() => { openEntry("page"); setEntryError("Placement requires the full external confirmation and required fields."); }}
      scrollPosition={ledgerScroll.current[key] ?? {left:0,top:0}}
      onScrollPosition={position => { ledgerScroll.current[key] = position; }} />;
  }

  function renderPreviewEditor() {
    if (!previewEditor) return null;
    const source = previewEditor.mode === "Edit" && selected?.section === previewEditor.section ? selected : null;
    return <section aria-label={`${previewEditor.mode} ${sectionName(previewEditor.section)} preview`} className={styles.surface} data-pd-id="lab.preview-editor">
      <div className={styles.sectionHead}><div><h2>{previewEditor.mode} layout</h2><p>Representative preview · Save is unavailable in this lab.</p></div><button className={styles.secondaryButton} onClick={() => setPreviewEditor(null)} type="button">Close preview</button></div>
      {previewEditor.section === "casino" ? <div className={styles.stageTabs}>{["Offer Setup", "Wagering", "Reward", "Settlement"].map(stage => <button aria-pressed={previewStage === stage} key={stage} onClick={() => setPreviewStage(stage)} type="button">{stage}</button>)}</div> : null}
      <div className={styles.previewFields}>{labLedgerColumns[previewEditor.section].filter(label => label !== "Actions").map((label, index) => <label key={`${label}-${index}`}>{label}<input defaultValue={source?.cells[index] === "—" ? "" : source?.cells[index] ?? ""} readOnly={/value|liability|profit|loss|rating|signed amount|calc state/i.test(label)} title={/value|liability|profit|loss|rating|signed amount|calc state/i.test(label) ? "Calculated by the existing financial authority" : undefined}/></label>)}</div>
      <div className={styles.actionRow}><button className={styles.secondaryButton} onClick={() => setPreviewEditor(null)} type="button">Return to ledger</button><button className={styles.primaryButton} disabled title="Preview only; this lab does not simulate saving this ledger" type="button">Save · preview only</button></div>
    </section>;
  }

  function renderBetEntry(mode: EntryMode) {
    const update = (key: keyof LabBetDraft, value: string) => { setBet(current => ({...current, [key]: value})); if (["backStake","backOdds"].includes(key)) setBackConfirmed(false); if (["layOdds","commission","requestedLayStake","matchedLayStake"].includes(key)) setLayConfirmed(false); setEntryError(""); };
    const stages = ["Offer", "Requirements", "Matching", "Placement", "Finish / Review"];
    return <div className={styles.entry} data-pd-id={`lab.entry.${mode}`}>
      <div className={styles.entryTop}><div><strong>{mode === "modal" ? "Quick Capture · simulated" : "Bet workbench · simulated"}</strong><p>{betProfile ? labProfiles.find(profile => profile.id === betProfile)?.name : "Choose owning Profile"} · {betState === "Draft" ? "New offer" : betState}</p></div>{scope === "all" && betState === "Draft" ? <DesignLabSelect compact dataPdId="lab.bet.owner" label="Owning Profile" onChange={value => setBetOwnerProfileId(value as LabProfileId)} options={[{value:"",label:"Choose Profile"},...labProfiles.map(profile => ({value:profile.id,label:profile.name}))]} value={betOwnerProfileId ?? ""}/> : null}<button className={styles.linkButton} onClick={() => { setEntryMode(mode === "modal" ? "page" : "modal"); setStep(0); }} type="button">{mode === "modal" ? "Open full workbench" : "Compare Quick Capture"}</button></div>
      {mode === "page" ? <nav aria-label="Bet workbench sections" className={styles.stepper}>{stages.map((label, index) => <button aria-current={step === index ? "step" : undefined} className={step === index ? styles.stepActive : ""} key={label} onClick={() => setStep(index)} type="button"><span>{index + 1}</span>{label}</button>)}</nav> : null}
      <div className={styles.entryGrid}><div className={styles.entryFields}>
        {(mode === "modal" || step === 0) ? <fieldset><legend>Offer</legend><label>Original Offer text <textarea data-pd-id="lab.bet.offer-text" onChange={event => update("offerText", event.target.value)} placeholder="Paste original offer text verbatim" rows={mode === "modal" ? 3 : 5} value={bet.offerText}/></label><div className={styles.fieldPair}><DesignLabSelect dataPdId="lab.bet.bookmaker" label="Bookmaker" onChange={value => update("bookmaker", value)} options={[{ value: "", label: "Choose bookmaker" }, { value: "Bookmaker A", label: "Bookmaker A" }, { value: "Bookmaker C", label: "Bookmaker C" }]} value={bet.bookmaker}/><label>Offer Name <input onChange={event => update("offerName", event.target.value)} value={bet.offerName}/></label><label>Offer Type <input onChange={event => update("offerType", event.target.value)} value={bet.offerType}/></label><label>Bet Type <input onChange={event => update("betType", event.target.value)} value={bet.betType}/></label><label>Fixture Type <input onChange={event => update("fixtureType", event.target.value)} value={bet.fixtureType}/></label><label>Back Stake · if known <input inputMode="decimal" onChange={event => update("backStake", event.target.value)} value={bet.backStake}/></label></div></fieldset> : null}
        {mode === "page" && step === 1 ? <fieldset><legend>Requirements</legend><p>These preparation tasks can be completed in any order. No external account action occurs in this lab.</p><label className={styles.checkRow}><input type="checkbox"/> Opt-in checked externally</label><label className={styles.checkRow}><input type="checkbox"/> Deposit prerequisite checked externally</label><label className={styles.checkRow}><input type="checkbox"/> Promotion requirement reviewed</label><p>Use Matching at any time, even before Event Name is known.</p></fieldset> : null}
        {mode === "page" && step === 2 ? <fieldset><legend>Matching</legend><div className={styles.actionRow}><button className={styles.secondaryButton} data-pd-id="lab.bet.load-fixture" onClick={() => { setBet(current => ({...current,bookmaker:"Bookmaker A",exchange:"Exchange A",backStake:labQualifyingFixture.backStake,backOdds:labQualifyingFixture.backOdds,layOdds:labQualifyingFixture.layOdds,requestedLayStake:labQualifyingFixture.layStake,commission:labQualifyingFixture.commission,strategy:"Standard"})); setBackConfirmed(false); setLayConfirmed(false); setEntryError(""); }} type="button">Load validated CALC-001 example</button></div><button className={styles.secondaryButton} onClick={() => setMatchingOpen(value => !value)} type="button">{matchingOpen ? "Hide" : "Open"} matching</button>{matchingOpen ? <div className={styles.matchPanel}><strong>Fixture match · synthetic Exchange A</strong><p>Match and calculate before entering Event Name. No provider call or placement.</p></div> : null}<div className={styles.fieldPair}><DesignLabSelect dataPdId="lab.bet.exchange" label="Exchange" onChange={value => update("exchange", value)} options={[{ value: "Exchange A", label: "Exchange A" }]} value={bet.exchange}/><DesignLabSelect dataPdId="lab.bet.strategy" label="Strategy" onChange={value => update("strategy", value)} options={["Standard","Underlay","Overlay","Bonus Lock-In","Custom"].map(value => ({value,label:value}))} value={bet.strategy}/><label>Back Odds <input inputMode="decimal" onChange={event => update("backOdds", event.target.value)} value={bet.backOdds}/></label><label>Lay Odds <input inputMode="decimal" onChange={event => update("layOdds", event.target.value)} value={bet.layOdds}/></label><label>Exchange commission <input inputMode="decimal" onChange={event => update("commission", event.target.value)} value={bet.commission}/></label><label>Requested Lay Stake <input inputMode="decimal" onChange={event => update("requestedLayStake", event.target.value)} value={bet.requestedLayStake}/></label></div><p>Underlay, Overlay and Bonus Lock-In remain named strategy previews. Only Standard CALC-001 has validated output in this lab.</p></fieldset> : null}
        {mode === "page" && step === 3 ? <fieldset><legend>Placement · externally confirmed</legend><p>Plum Duff records what you confirm; it does not place a bet.</p><div className={styles.placementRow}><span>Back bet</span><button className={styles.secondaryButton} onClick={() => { const errors = getStandardQualifyingErrors({backStake:bet.backStake,backOdds:bet.backOdds,layOdds:bet.layOdds,exchangeCommission:bet.commission}); if (errors.backStake || errors.backOdds) { setEntryError(errors.backStake || errors.backOdds || "Invalid Back bet"); return; } setBackConfirmed(true); setAudit(current => [...current, "Back confirmed externally · simulated"]); }} type="button">{backConfirmed ? "Back confirmed" : "Confirm external Back"}</button></div><label>Actual matched Lay Stake <input inputMode="decimal" onChange={event => update("matchedLayStake", event.target.value)} placeholder="Enter matched amount" value={bet.matchedLayStake}/></label><div className={styles.placementRow}><span>Lay bet</span><button className={styles.secondaryButton} onClick={() => { const amount = Number(bet.matchedLayStake); if (!hasCompleteDecimalInputSyntax(bet.matchedLayStake) || !hasCompleteDecimalInputSyntax(bet.requestedLayStake) || !Number.isFinite(amount) || amount <= 0 || amount > Number(bet.requestedLayStake)) { setEntryError("Enter a matched Lay Stake greater than zero and no more than requested."); return; } const errors = getStandardQualifyingErrors({backStake:bet.backStake,backOdds:bet.backOdds,layOdds:bet.layOdds,exchangeCommission:bet.commission}); if (errors.layOdds || errors.exchangeCommission) { setEntryError(errors.layOdds || errors.exchangeCommission || "Invalid Lay bet"); return; } setLayConfirmed(true); setAudit(current => [...current, amount < Number(bet.requestedLayStake) ? "Lay partially matched externally · simulated" : "Lay fully matched externally · simulated"]); }} type="button">{layConfirmed ? layIsPartial ? "Partially laid" : "Fully laid" : "Confirm external Lay"}</button></div>{layIsPartial ? <p role="status">Partial hedge: {bet.matchedLayStake} matched of {bet.requestedLayStake} requested; unmatched portion remains exposed. Financial outcome unavailable for this tuple.</p> : null}</fieldset> : null}
        {mode === "page" && step === 4 ? <fieldset><legend>Finish / Review</legend><div className={styles.fieldPair}><label>Event Name <input onChange={event => update("event", event.target.value)} placeholder="Actual market and selection text" value={bet.event}/></label><label>Event date/time <input onChange={event => update("eventDate", event.target.value)} type="datetime-local" value={bet.eventDate}/></label></div><dl className={styles.detailGrid}><div><dt>Offer</dt><dd>{bet.offerName || bet.offerText || "Not captured"}</dd></div><div><dt>Back</dt><dd>{backConfirmed ? "Confirmed externally" : "Not confirmed"}</dd></div><div><dt>Lay</dt><dd>{layConfirmed ? layIsPartial ? "Partially matched" : "Fully matched" : "Not confirmed"}</dd></div></dl>{correctionMode ? <label>Correction reason <textarea onChange={event => setCorrectionReason(event.target.value)} rows={2} value={correctionReason}/></label> : null}</fieldset> : null}
      </div>{mode === "page" ? <aside className={styles.calcSummary}><h3>Outcome comparison</h3><p>{bet.strategy} · synthetic reference</p>{fixtureMatches && !layIsPartial ? <dl><div><dt>Requested Lay Stake</dt><dd>{money(Number(labQualifyingFixture.layStake))}</dd></div><div><dt>Liability</dt><dd>{money(Number(labQualifyingFixture.liability))}</dd></div><div><dt><Icon>chevron_right</Icon> Bookmaker wins</dt><dd>{money(Number(labQualifyingFixture.backWins))}</dd></div><div><dt><Icon>chevron_right</Icon> Exchange wins</dt><dd>{money(Number(labQualifyingFixture.layWins))}</dd></div><div><dt>Conservative</dt><dd>{money(Number(labQualifyingFixture.matchedResult))}</dd></div></dl> : <p role="status">Outcome unavailable for this edited or partial-lay tuple. Only Standard CALC-001 has governed results here.</p>}</aside> : null}</div>
      {entryError ? <p className={styles.error} role="alert">{entryError}</p> : null}
      <div className={styles.entryFooter}><button className={styles.secondaryButton} onClick={closeEntry} type="button">Cancel</button>{correctionMode ? <button className={styles.primaryButton} onClick={saveCorrection} type="button">Save audited correction</button> : <><button className={styles.secondaryButton} onClick={() => saveBet("Prospecting")} type="button">Save Prospecting</button>{mode === "page" ? <button className={styles.primaryButton} onClick={() => saveBet("Placed")} type="button">Finish Placed record</button> : null}</>}</div>
    </div>;
  }
}
