"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { DesignLabSelect } from "@/components/design-lab-select";
import { ModalBoundary } from "@/components/modal-boundary";
import { ThemeToggle } from "@/components/theme-toggle";
import { aggregateFinancialValues } from "@/lib/financial-aggregate";
import { formatFinancialValue } from "@/lib/financial-display";
import { initialLabAccounts, labAccountBalanceError, labProfiles, saveLabAccountBalance, summarizeDesignLab, type LabAccount, type LabProfileId, type LabScope, type LabRange } from "@/lib/design-lab-fixture";
import { labLedgerColumns, labQualifyingFixture, labRecords, labReportPoints, type LabLedgerKey, type LabRecord } from "@/lib/design-lab-connected-data";
import styles from "./design-lab-connected.module.css";

type Section = "home" | "tasks" | "profiles" | "reports" | LabLedgerKey;
type EntryMode = "modal" | "page";
type BetState = "Draft" | "Prospecting" | "Placed" | "Settled";
const nav: { id: Section; label: string; icon: string; group: string }[] = [
  { id: "home", label: "Position", icon: "space_dashboard", group: "Fund Manager" },
  { id: "tasks", label: "Today", icon: "task_alt", group: "Fund Manager" },
  { id: "profiles", label: "Profiles", icon: "group", group: "Fund Manager" },
  { id: "accounts", label: "Accounts", icon: "account_balance_wallet", group: "Profile work" },
  { id: "sportsbook", label: "Sportsbook", icon: "sports_soccer", group: "Profile work" },
  { id: "freeBets", label: "Free Bets", icon: "redeem", group: "Profile work" },
  { id: "casino", label: "Casino Offers", icon: "casino", group: "Profile work" },
  { id: "extraPlace", label: "Extra Place", icon: "emoji_events", group: "Profile work" },
  { id: "cash", label: "Cash Adjustments", icon: "account_balance", group: "Profile work" },
  { id: "reports", label: "Reports", icon: "monitoring", group: "Review" },
];
const sectionName = (section: Section) => nav.find(item => item.id === section)?.label ?? "Position";
const money = (value: number) => value === 0 ? "£0.00" : formatFinancialValue(value);
function Icon({ children }: { children: ReactNode }) { return <span aria-hidden="true" className="material-symbols-outlined">{children}</span>; }

type LabBetDraft = { event: string; bookmaker: string; exchange: string; backStake: string; backOdds: string; layOdds: string; commission: string; strategy: string };
const initialBet: LabBetDraft = { event: "", bookmaker: "Bookmaker A", exchange: "Exchange A", backStake: labQualifyingFixture.backStake, backOdds: labQualifyingFixture.backOdds, layOdds: labQualifyingFixture.layOdds, commission: labQualifyingFixture.commission, strategy: "Standard" };

export function DesignLabConnected() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<LabAccount[]>(initialLabAccounts);
  const [section, setSection] = useState<Section>("home");
  const [scope, setScope] = useState<LabScope>("all");
  const [range, setRange] = useState<LabRange>("Last Month");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [sortAscending, setSortAscending] = useState(true);
  const [selected, setSelected] = useState<LabRecord | null>(null);
  const [previewEditor, setPreviewEditor] = useState<{ section: LabLedgerKey; mode: "Add" | "Edit" } | null>(null);
  const [previewStage, setPreviewStage] = useState("Offer Setup");
  const [returnSection, setReturnSection] = useState<Section>("home");
  const [editingAccount, setEditingAccount] = useState<LabAccount | null>(null);
  const [balanceDraft, setBalanceDraft] = useState("");
  const [accountError, setAccountError] = useState("");
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [correctionMode, setCorrectionMode] = useState(false);
  const [step, setStep] = useState(0);
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
  const searchRef = useRef<HTMLInputElement>(null);
  const navTriggerRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summary = useMemo(() => summarizeDesignLab(accounts, scope, range), [accounts, scope, range]);
  const profileName = scope === "all" ? "All Profiles" : labProfiles.find(item => item.id === scope)?.name ?? "Profile";
  const betProfile = scope === "all" ? "LAB-PROFILE-A" : scope;
  const recordedBetProfile = betOwnerProfileId ?? betProfile;
  const fixtureMatches = bet.bookmaker === "Bookmaker A" && bet.exchange === "Exchange A" && bet.backStake === labQualifyingFixture.backStake && bet.backOdds === labQualifyingFixture.backOdds && bet.layOdds === labQualifyingFixture.layOdds && bet.commission === labQualifyingFixture.commission && bet.strategy === "Standard";
  const newBetInScope = scope === "all" || scope === recordedBetProfile;
  const realisedWithNew = aggregateFinancialValues([summary.realised.knownValue, ...(betState === "Settled" && newBetInScope && range === "This Year" ? [-0.62] : [])]);
  const exposureWithNew = aggregateFinancialValues([summary.exposure.knownValue, ...(betState === "Placed" && newBetInScope ? [Number(labQualifyingFixture.liability)] : [])]);
  const reportPoints = [
    ...labReportPoints.filter(point => (scope === "all" || point.profileId === scope) && (range === "This Year" || point.month === "Oct")),
    ...(betState === "Settled" && newBetInScope && range === "This Year" ? [{ id: "LAB-SB-NEW", date: "1 Nov", value: -0.62 }] : []),
  ].sort((a, b) => ({ "12 Sep": 0, "20 Sep": 1, "8 Oct": 2, "15 Oct": 3, "1 Nov": 4 }[a.date as "12 Sep" | "20 Sep" | "8 Oct" | "15 Oct" | "1 Nov"] - { "12 Sep": 0, "20 Sep": 1, "8 Oct": 2, "15 Oct": 3, "1 Nov": 4 }[b.date as "12 Sep" | "20 Sep" | "8 Oct" | "15 Oct" | "1 Nov"]));
  const betDirty = JSON.stringify(bet) !== JSON.stringify(initialBet) && (betState === "Draft" || correctionMode);
  const accountDirty = editingAccount !== null && balanceDraft !== editingAccount.currentBalance;
  const records = useMemo(() => {
    const listed = labRecords.filter(item => scope === "all" || item.profileId === scope);
    if (betState === "Draft") return listed;
    const added: LabRecord = { id: "LAB-SB-NEW", profileId: recordedBetProfile, section: "sportsbook", title: bet.event || "Event not entered", subtitle: `${bet.bookmaker} · ${bet.strategy}`, status: betState, cells: ["6 Nov 2026", bet.bookmaker, bet.event || "Event not entered", "—", "Synthetic qualifying", bet.strategy, betState === "Prospecting" ? "Not placed" : "Placed", betState === "Prospecting" ? "Not placed" : "Placed", betState === "Settled" ? "£ (0.62)" : "Current £ (0.62)", betState, "Open"] };
    return scope === "all" || scope === recordedBetProfile ? [added, ...listed] : listed;
  }, [scope, betState, recordedBetProfile, bet]);
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
  function go(next: Section) { guarded(() => { setSelected(null); setPreviewEditor(null); setEntryMode(null); setSection(next); setMobileNav(false); setFilter(""); setSearch(""); setSearchOpen(false); }); }
  function openRecord(record: LabRecord) { guarded(() => { setReturnSection(section); setScope(record.profileId); setSelected(record); setPreviewEditor(null); setPreviewStage(record.section === "freeBets" ? "Available" : "Offer Setup"); setSection(record.section); setSearch(""); setSearchOpen(false); }); }
  function openAccount(account: LabAccount) { openRecord({ id: account.id, profileId: account.profileId, section: "accounts", title: account.name, subtitle: account.type, status: account.status, cells: [account.id, account.name, account.type, account.status, "Yes", account.currentBalance ? money(Number(account.currentBalance)) : "Unknown", "—", "—", "—", "—", "—", "Open"] }); }
  function openEntry(mode: EntryMode) { setScope(current => current === "all" ? "LAB-PROFILE-A" : current); setCorrectionMode(false); setEntryError(""); setEntryMode(mode); setStep(0); setSelected(null); setMobileNav(false); }
  function closeEntry() { guarded(() => { setEntryMode(null); setEntryError(""); }); }
  function saveAccount() {
    if (!editingAccount) return;
    const error = labAccountBalanceError(balanceDraft);
    if (error) { setAccountError(error); return; }
    if (failedSave) { setFailedSave(false); setAccountError("Simulated save failed. Your entry is retained."); return; }
    setAccounts(current => saveLabAccountBalance(current, editingAccount.id, balanceDraft));
    setEditingAccount(null); setAccountError("");
    setSelected(null); setSection("accounts");
  }
  function saveBet(next: BetState) {
    if (!bet.event.trim() && next !== "Prospecting") { setEntryError("Enter Event Name before placement."); return; }
    if (!fixtureMatches) { setEntryError("This simulation only has a validated calculation for the displayed fixture values. Restore them before saving."); return; }
    if (failedSave) { setFailedSave(false); setEntryError("Simulated save failed. The draft is retained."); return; }
    if (betState === "Draft") setBetOwnerProfileId(betProfile);
    setBetState(next); setAudit(current => [...current, `${next} · simulated · 1 Nov 2026`]); setEntryError(""); setEntryMode(null); setSection("sportsbook");
  }
  function settle(result: "Back wins" | "Lay wins") {
    setBetState("Settled"); setAudit(current => [...current, `Settled: ${result} · simulated · 1 Nov 2026`]); setSelected(null); setSection("reports");
  }
  function saveCorrection() {
    if (!bet.event.trim() || !fixtureMatches) { setEntryError("Enter Event Name and restore the validated fixture values before correction."); return; }
    if (failedSave) { setFailedSave(false); setEntryError("Simulated save failed. The correction remains editable."); return; }
    setAudit(current => [...current, `Correction: event/details reviewed · simulated · 1 Nov 2026`]);
    setCorrectionMode(false); setEntryMode(null); setEntryError(""); setSelected(null); setSection("sportsbook");
  }
  function selectSearchResult(item: (typeof searchIndex)[number]) {
    if (item.section === "reports") { setScope(item.profileId as LabScope); go("reports"); return; }
    if (item.section === "accounts") { const account = accounts.find(row => row.id === item.id); if (account) openAccount(account); return; }
    const record = records.find(row => row.id === item.id); if (record) openRecord(record);
  }
  const visibleRows = section === "accounts"
    ? accounts.filter(item => (scope === "all" || item.profileId === scope) && [item.name, item.type, item.id].join(" ").toLowerCase().includes(filter.toLowerCase())).map(item => ({ id: item.id, title: item.name, subtitle: item.type, status: item.currentBalance ? "Known" : "Needs attention", cells: [item.id, item.name, item.type, item.status, "Yes", item.currentBalance ? money(Number(item.currentBalance)) : "Unknown", "—", "—", "—", "—", "—", "Open"], onOpen: () => openAccount(item) }))
    : records.filter(item => item.section === section && [item.title, item.subtitle, item.status].join(" ").toLowerCase().includes(filter.toLowerCase())).map(item => ({ ...item, onOpen: () => openRecord(item) }));
  const sortedRows = [...visibleRows].sort((a, b) => sortAscending ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title));
  const ledgerSection = section in labLedgerColumns ? section as LabLedgerKey : null;
  const visibleReportIds = new Set(reportPoints.map(point => point.id));
  const mainTitle = entryMode === "page" ? "Add Sportsbook Bet" : previewEditor ? `${previewEditor.mode} ${sectionName(previewEditor.section)}` : selected ? selected.title : sectionName(section);

  return <div className={styles.lab} data-pd-id="design-lab-connected.root">
    <a className={styles.skip} href="#lab-main">Skip to content</a>
    <div className={`${styles.frame} ${collapsed ? styles.collapsed : ""}`}>
      {mobileNav ? <button aria-label="Dismiss navigation" className={styles.navScrim} onClick={() => { setMobileNav(false); navTriggerRef.current?.focus(); }} tabIndex={-1} type="button" /> : null}
      <aside aria-label="Design Lab navigation" className={`${styles.sidebar} ${mobileNav ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}><BrandLogo variant="mark" /><span>Plum Duff <small>Design Lab</small></span></div>
        {Array.from(new Set(nav.map(item => item.group))).map(group => <div className={styles.navGroup} key={group}><p>{group}</p><nav aria-label={group}>{nav.filter(item => item.group === group).map(item => <button aria-current={section === item.id ? "page" : undefined} className={section === item.id ? styles.navActive : ""} data-pd-id={`lab.nav.${item.id}`} key={item.id} onClick={() => go(item.id)} title={item.label} type="button"><Icon>{item.icon}</Icon><span>{item.label}</span></button>)}</nav></div>)}
        <div className={styles.navFooter}>Synthetic data · no owner writes</div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.header} data-pd-id="lab.header">
          <button aria-label={mobileNav ? "Close navigation" : "Open navigation"} aria-expanded={mobileNav} className={styles.iconButton} onClick={() => setMobileNav(value => !value)} ref={navTriggerRef} type="button"><Icon>menu</Icon></button>
          <button aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} className={`${styles.iconButton} ${styles.collapseButton}`} onClick={() => setCollapsed(value => !value)} type="button"><Icon>{collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}</Icon></button>
          <strong className={styles.headerTitle}>Fund Manager</strong>
          <div className={styles.profileSelect}><DesignLabSelect compact dataPdId="lab.profile" label="Profile" onChange={value => guarded(() => { setScope(value as LabScope); setSelected(null); })} options={[{ value: "all", label: "All Profiles" }, ...labProfiles.map(item => ({ value: item.id, label: item.name }))]} value={scope} /></div>
          <div className={`${styles.searchBox} ${searchOpen ? styles.searchExpanded : ""}`} role="search"><Icon>search</Icon><input aria-label="Search synthetic Plum Duff" data-pd-id="lab.search" onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Escape") { setSearch(""); setSearchOpen(false); event.currentTarget.blur(); } }} placeholder="Search Accounts, bets, offers, reports" ref={searchRef} type="search" value={search} /></div>
          <button aria-label="Open search" className={`${styles.iconButton} ${styles.mobileSearch}`} onClick={() => { setSearchOpen(true); requestAnimationFrame(() => searchRef.current?.focus()); }} type="button"><Icon>search</Icon></button>
          <button aria-label="View tasks" className={styles.iconButton} onClick={() => go("tasks")} type="button"><Icon>notifications</Icon></button>
          <ThemeToggle />
        </header>
        {search.trim() ? <section aria-label="Search results" className={styles.searchResults} data-pd-id="lab.search-results">{["Accounts", "Sportsbook", "Free Bets", "Casino Offers", "Extra Place", "Cash Adjustments", "Reports"].map(kind => {
          const group = searchResults.filter(item => item.kind === kind);
          return group.length ? <div key={kind}><h2>{kind}</h2>{group.map(item => <button key={item.id} onClick={() => selectSearchResult(item)} type="button"><span><strong>{item.title}</strong><small>{item.context} · {labProfiles.find(profile => profile.id === item.profileId)?.name}</small></span><Icon>arrow_forward</Icon></button>)}</div> : null;
        })}{!searchResults.length ? <p>No synthetic results.</p> : null}</section> : null}
        <div className={styles.breadcrumb}><span>{profileName}</span><Icon>chevron_right</Icon><span>{entryMode ? "Sportsbook" : sectionName(section)}</span>{selected || entryMode ? <><Icon>chevron_right</Icon><span>{selected ? "Record" : "Add Bet"}</span></> : null}<span className={styles.labBadge}>LAB · simulation</span></div>
        <main className={styles.main} data-pd-id="lab.main" id="lab-main">
          <div className={styles.pageHead}><div><h1 ref={headingRef} tabIndex={-1}>{mainTitle}</h1><p>{entryMode ? "One synthetic draft, two entry layouts." : selected ? selected.subtitle : section === "home" ? "Position, tasks and the next decision." : "Synthetic workflow preview"}</p></div><div className={styles.headActions}><DesignLabSelect dataPdId="lab.range" label="Selected Range" onChange={value => guarded(() => setRange(value as LabRange))} options={[{ value: "Last Month", label: "Last Month" }, { value: "This Year", label: "This Year" }]} value={range} /><button className={styles.linkButton} onClick={() => router.push("/")} type="button">Exit Lab</button></div></div>
          {entryMode === "page" ? renderBetEntry("page") : previewEditor ? renderPreviewEditor() : selected ? <section className={styles.surface} data-pd-id="lab.record-detail"><button className={styles.linkButton} onClick={() => { setSelected(null); setSection(returnSection); }} type="button"><Icon>arrow_back</Icon> Back to {sectionName(returnSection)}</button><div className={styles.sectionHead}><h2>{selected.title}</h2><span className={styles.status}>{selected.status}</span></div><p>{selected.subtitle} · {selected.id}</p><p>{selected.previewOnly ? "Representative preview · deeper edits are not simulated." : "Synthetic source record"}</p><dl className={styles.detailGrid}>{labLedgerColumns[selected.section].map((label, index) => <div key={`${label}-${index}`}><dt>{label}</dt><dd>{selected.cells[index] ?? "—"}</dd></div>)}</dl><div className={styles.actionRow}>{selected.previewOnly ? <button className={styles.secondaryButton} onClick={() => setPreviewEditor({ section: selected.section, mode: "Edit" })} type="button">Preview edit layout</button> : null}{selectedAccount ? <button className={styles.primaryButton} onClick={() => { setEditingAccount(selectedAccount); setBalanceDraft(selectedAccount.currentBalance); setAccountError(""); }} type="button">Review balance</button> : null}{selected.relatedId ? <button className={styles.secondaryButton} onClick={() => { const related = records.find(item => item.id === selected.relatedId); if (related) openRecord(related); }} type="button">Open linked {selected.relatedId.startsWith("LAB-FB") ? "Free Bet" : "qualifying bet"}</button> : null}{selectedIsNewBet && betState === "Placed" ? <><button className={styles.primaryButton} onClick={() => settle("Back wins")} type="button">Settle · back wins</button><button className={styles.secondaryButton} onClick={() => settle("Lay wins")} type="button">Settle · lay wins</button></> : null}{selectedIsNewBet && betState === "Prospecting" ? <button className={styles.primaryButton} onClick={() => openEntry("page")} type="button">Review for placement</button> : null}{selectedIsNewBet && betState === "Settled" ? <button className={styles.secondaryButton} onClick={() => { setCorrectionMode(true); setEntryMode("page"); setStep(0); }} type="button">Correct synthetic details</button> : null}</div>{selected.section === "casino" ? <div className={styles.workflowPreview}><h3>Offer flow · preview only</h3><div className={styles.stageTabs}>{["Offer Setup", "Wagering", "Reward", "Settlement"].map(stage => <button aria-pressed={previewStage === stage} key={stage} onClick={() => setPreviewStage(stage)} type="button">{stage}</button>)}</div><p>{previewStage === "Offer Setup" ? "Offer type, game, qualification and expiry are reviewed first." : previewStage === "Wagering" ? "Qualifying and reward wagering remain separate; progress is not simulated here." : previewStage === "Reward" ? "Reward face value and conversion remain distinct from cash P&L." : "Settlement requires the governed result and explicit confirmation."}</p></div> : null}{selected.section === "freeBets" ? <div className={styles.workflowPreview}><h3>Free Bet lifecycle · preview only</h3><div className={styles.stageTabs}>{["Awarded", "Available", "Placed", "Settled"].map(stage => <button aria-pressed={previewStage === stage} key={stage} onClick={() => setPreviewStage(stage)} type="button">{stage}</button>)}</div><p>{previewStage} is a view of the proposed flow; this sample remains Available and linked to its qualifying bet.</p></div> : null}{selectedIsNewBet ? <><h3>History</h3><ol>{audit.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol><button className={styles.linkButton} onClick={() => go("reports")} type="button">View report entry <Icon>arrow_forward</Icon></button></> : null}</section> : section === "home" ? <>
            <section aria-label="Financial position" className={styles.metrics} data-pd-id="lab.metrics"><div><span>Known cash</span><strong>{money(Number(summary.cash.knownSubtotal))}</strong><small>{summary.cashMissingCount ? `Incomplete · ${summary.cashMissingCount} Account balance missing` : "All included balances known"}</small></div><div><span>Realised P&amp;L</span><strong>{money(realisedWithNew.knownValue)}</strong><small>{range} · settled results</small></div><div><span>Committed exposure</span><strong>{money(exposureWithNew.knownValue)}</strong><small>Placed positions only; planning excluded</small></div></section>
            <div className={styles.dashboardGrid}><section className={styles.surface}><div className={styles.sectionHead}><h2>Next actions</h2><button className={styles.linkButton} onClick={() => go("tasks")} type="button">All tasks <Icon>arrow_forward</Icon></button></div>{summary.actionableAccounts.map(item => <div className={styles.task} key={item.id}><div><strong>Confirm current balance</strong><p>{item.name} · {labProfiles.find(profile => profile.id === item.profileId)?.name}</p></div><button className={styles.primaryButton} onClick={() => openAccount(item)} type="button">Review Account</button></div>)}{!summary.actionableAccounts.length ? <p>No Account balance tasks in this Profile.</p> : null}<div className={styles.task}><div><strong>Review open Sportsbook positions</strong><p>Committed exposure stays separate from planning.</p></div><button className={styles.secondaryButton} onClick={() => go("sportsbook")} type="button">Open Sportsbook</button></div></section><section className={styles.surface}><h2>Continue work</h2><button className={styles.quickLink} onClick={() => go("sportsbook")} type="button"><Icon>sports_soccer</Icon><span>Record and settle a bet</span><Icon>arrow_forward</Icon></button><button className={styles.quickLink} onClick={() => go("reports")} type="button"><Icon>monitoring</Icon><span>Review performance</span><Icon>arrow_forward</Icon></button><button className={styles.quickLink} onClick={() => go("freeBets")} type="button"><Icon>redeem</Icon><span>Inspect linked Free Bets</span><Icon>arrow_forward</Icon></button></section></div>
          </> : section === "tasks" ? <section className={styles.surface}><h2>Today</h2>{summary.actionableAccounts.map(item => <div className={styles.task} key={item.id}><div><strong>{item.name}</strong><p>Current Balance unknown · {item.profileId}</p></div><button className={styles.primaryButton} onClick={() => openAccount(item)} type="button">Review</button></div>)}<div className={styles.task}><div><strong>Sportsbook review</strong><p>Open positions and settlement</p></div><button className={styles.secondaryButton} onClick={() => go("sportsbook")} type="button">Open ledger</button></div></section>
          : section === "profiles" ? <section className={styles.surface}><h2>Profiles</h2>{labProfiles.map(item => <div className={styles.task} key={item.id}><div><strong>{item.name}</strong><p>{item.id}</p></div><button className={styles.secondaryButton} onClick={() => { setScope(item.id); go("home"); }} type="button">Open position</button></div>)}</section>
          : section === "reports" ? <section className={styles.reportGrid} data-pd-id="lab.reports"><div className={styles.metrics}><div><span>Known realised P&amp;L</span><strong>{money(realisedWithNew.knownValue)}</strong><small>Settled sources only · {range}</small></div><div><span>Committed exposure</span><strong>{money(exposureWithNew.knownValue)}</strong><small>Planning excluded</small></div><div><span>Known cash</span><strong>{money(Number(summary.cash.knownSubtotal))}</strong><small>{summary.cashMissingCount ? `Incomplete · ${summary.cashMissingCount} unknown` : "Complete"}</small></div></div><section className={styles.surface}><h2>Performance · source points</h2><p>Selected range: {range}. Points are validated synthetic settled records; no interpolation.</p><div className={styles.chart} aria-label="Synthetic settled P and L source values">{reportPoints.map(point => <button aria-label={`Open ${point.date} source record, ${money(point.value)}`} className={styles.chartPoint} key={point.id} onClick={() => { const source = records.find(item => item.id === point.id); if (source) openRecord(source); }} title={`${point.id}: ${money(point.value)}`} type="button"><span className={point.value < 0 ? styles.chartNegative : styles.chartPositive} style={{ height: `${Math.max(12, Math.abs(point.value) / 24.7 * 65)}%` }}/><small>{point.date}</small><strong>{money(point.value)}</strong></button>)}</div></section><section className={styles.surface}><h2>P&amp;L by ledger</h2><dl className={styles.domainBreakdown}><div><dt>Sportsbook · settled</dt><dd>{money(realisedWithNew.knownValue)}</dd></div><div><dt>Free Bets</dt><dd>No settled activity</dd></div><div><dt>Casino Offers</dt><dd>Unavailable · wagering sample is unresolved</dd></div><div><dt>Extra Place</dt><dd>No settled activity</dd></div></dl></section><section className={styles.surface}><h2>Source drilldown</h2><div className={styles.reportRows}>{records.filter(item => item.section === "sportsbook" && item.status === "Settled" && visibleReportIds.has(item.id)).map(item => <button key={item.id} onClick={() => openRecord(item)} type="button"><span><strong>{item.title}</strong><small>{item.id} · Sportsbook · settled</small></span><span>{item.id === "LAB-SB-NEW" ? money(-0.62) : item.cells[8]}</span></button>)}</div></section></section>
          : ledgerSection ? <section className={styles.surface} data-pd-id={`lab.ledger.${ledgerSection}`}><div className={styles.sectionHead}><div><h2>{sectionName(section)} ledger</h2><p>Profile-scoped synthetic records</p></div>{ledgerSection === "sportsbook" ? <div className={styles.actionRow}><button className={styles.secondaryButton} data-pd-id="lab.add.modal" onClick={() => openEntry("modal")} type="button">Quick add · modal</button><button className={styles.primaryButton} data-pd-id="lab.add.page" onClick={() => openEntry("page")} type="button">Add Bet · workspace</button></div> : <button className={styles.secondaryButton} onClick={() => setPreviewEditor({ section: ledgerSection, mode: "Add" })} type="button">Preview Add</button>}</div><div className={styles.toolbar}><label><Icon>search</Icon><input aria-label={`Filter ${sectionName(section)} rows`} onChange={event => setFilter(event.target.value)} placeholder={`Filter ${sectionName(section)}`} type="search" value={filter}/></label><button className={styles.secondaryButton} onClick={() => setSortAscending(value => !value)} type="button">Sort {sortAscending ? "A–Z" : "Z–A"} <Icon>sort</Icon></button></div><div aria-label={`${sectionName(section)} table, scroll horizontally for all columns`} className={styles.tableScroll} tabIndex={0}><table><thead><tr>{labLedgerColumns[ledgerSection].map((label, index) => <th key={`${label}-${index}`} scope="col">{label}</th>)}</tr></thead><tbody>{sortedRows.map(row => <tr key={row.id}>{row.cells.map((cell, index) => <td key={`${row.id}-${index}`}>{index === row.cells.length - 1 ? <button aria-label={`View ${row.title}`} className={styles.tableAction} onClick={row.onOpen} type="button">View</button> : cell}</td>)}</tr>)}</tbody></table></div><div className={styles.mobileRows}>{sortedRows.map(row => <article key={row.id}><div><strong>{row.title}</strong><span className={styles.status}>{row.status}</span></div><p>{row.subtitle}</p><button className={styles.secondaryButton} onClick={row.onOpen} type="button">View full record</button></article>)}</div>{!sortedRows.length ? <p>No matching synthetic rows.</p> : null}<p className={styles.tableNote}>Desktop columns follow the current ledger. Narrow rows open a fully labelled record; replacement of required columns in the normal app is not approved.</p></section> : null}
          <details className={styles.simControls}><summary>Simulation controls</summary><label><input checked={failedSave} onChange={event => setFailedSave(event.target.checked)} type="checkbox"/> Fail the next simulated save</label><p>Refresh resets synthetic edits.</p></details>
        </main>
      </div>
    </div>
    {entryMode === "modal" ? <ModalBoundary onDismiss={closeEntry}><div className="modal-backdrop"><div aria-labelledby="lab-entry-title" className={styles.entryModal} role="dialog"><div className={styles.modalHead}><h2 id="lab-entry-title">Quick add Sportsbook Bet</h2><button aria-label="Close quick add" className={styles.iconButton} onClick={closeEntry} type="button"><Icon>close</Icon></button></div><div className={styles.modalBody}>{renderBetEntry("modal")}</div></div></div></ModalBoundary> : null}
    {editingAccount ? <ModalBoundary onDismiss={() => guarded(() => setEditingAccount(null))}><div className="modal-backdrop"><form aria-labelledby="lab-account-edit-title" className={styles.editModal} onSubmit={event => { event.preventDefault(); saveAccount(); }} role="dialog"><div className={styles.modalHead}><h2 id="lab-account-edit-title">Review {editingAccount.name}</h2><button aria-label="Close Account review" className={styles.iconButton} onClick={() => guarded(() => setEditingAccount(null))} type="button"><Icon>close</Icon></button></div><p>Blank is unknown. Enter 0.00 only when zero is confirmed.</p><label>Current Balance <span className={styles.moneyInput}>£ <input aria-invalid={Boolean(accountError)} onChange={event => { setBalanceDraft(event.target.value); setAccountError(""); }} value={balanceDraft}/></span></label>{accountError ? <p className={styles.error} role="alert">{accountError}</p> : null}<div className={styles.actionRow}><button className={styles.secondaryButton} onClick={() => guarded(() => setEditingAccount(null))} type="button">Cancel</button><button className={styles.primaryButton} type="submit">Save simulation</button></div></form></div></ModalBoundary> : null}
    {dirtyConfirm ? <ModalBoundary onDismiss={() => setDirtyConfirm(false)} returnFocusRef={triggerRef}><div className="modal-backdrop"><div aria-labelledby="lab-dirty-title" className={styles.editModal} role="dialog"><h2 id="lab-dirty-title">Unsaved changes</h2><p>Keep the synthetic draft or discard these edits?</p><div className={styles.actionRow}><button className={styles.secondaryButton} onClick={() => setDirtyConfirm(false)} type="button">Keep editing</button><button className={styles.dangerButton} onClick={() => { setDirtyConfirm(false); setEditingAccount(null); setBet(initialBet); const action = pendingAction.current; pendingAction.current = null; action?.(); }} type="button">Discard changes</button></div></div></div></ModalBoundary> : null}
  </div>;

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
    return <div className={styles.entry} data-pd-id={`lab.entry.${mode}`}>
      <div className={styles.entryTop}><div><strong>{mode === "modal" ? "Compact modal" : "Workspace stepper"}</strong><p>Simulation · Profile {betProfile}</p></div><button className={styles.linkButton} onClick={() => setEntryMode(mode === "modal" ? "page" : "modal")} type="button">Switch to {mode === "modal" ? "workspace" : "modal"}</button></div>
      {mode === "page" ? <nav aria-label="Bet entry steps" className={styles.stepper}>{["Bet setup", "Back bet", "Matching / lay", "Review"].map((label, index) => <button aria-current={step === index ? "step" : undefined} className={step === index ? styles.stepActive : ""} key={label} onClick={() => setStep(index)} type="button"><span>{index + 1}</span>{label}</button>)}</nav> : null}
      <div className={styles.entryGrid}><div className={styles.entryFields}>
        {(mode === "modal" || step === 0) ? <fieldset><legend>Bet setup</legend><label>Event Name <input onChange={event => { setBet(current => ({ ...current, event: event.target.value })); setEntryError(""); }} placeholder="Can be completed after Matching" value={bet.event}/></label><div className={styles.fieldPair}><DesignLabSelect dataPdId="lab.bet.bookmaker" label="Bookmaker" onChange={value => setBet(current => ({ ...current, bookmaker: value }))} options={[{ value: "Bookmaker A", label: "Bookmaker A" }, { value: "Bookmaker C", label: "Bookmaker C" }]} value={bet.bookmaker}/><DesignLabSelect dataPdId="lab.bet.exchange" label="Exchange" onChange={value => setBet(current => ({ ...current, exchange: value }))} options={[{ value: "Exchange A", label: "Exchange A" }]} value={bet.exchange}/></div></fieldset> : null}
        {(mode === "modal" || step === 1) ? <fieldset><legend>Back bet</legend><div className={styles.fieldPair}><label>Back stake <input inputMode="decimal" onChange={event => setBet(current => ({ ...current, backStake: event.target.value }))} value={bet.backStake}/></label><label>Back odds <input inputMode="decimal" onChange={event => setBet(current => ({ ...current, backOdds: event.target.value }))} value={bet.backOdds}/></label></div></fieldset> : null}
        {(mode === "modal" || step === 2) ? <fieldset><legend>Matching and lay</legend><button className={styles.secondaryButton} onClick={() => setMatchingOpen(value => !value)} type="button">{matchingOpen ? "Hide" : "Open"} matching</button>{matchingOpen ? <div className={styles.matchPanel}><strong>Fixture match · Exchange A</strong><p>Same event/selection demonstration. Event Name may be entered after matching.</p></div> : null}<div className={styles.fieldPair}><label>Lay odds <input inputMode="decimal" onChange={event => setBet(current => ({ ...current, layOdds: event.target.value }))} value={bet.layOdds}/></label><label>Commission <input inputMode="decimal" onChange={event => setBet(current => ({ ...current, commission: event.target.value }))} value={bet.commission}/></label></div><details><summary>Advanced strategy · preview only</summary><p>Underlay, Overlay, Custom and Multilay require their governed calculation branches; this lab validates only Standard.</p></details></fieldset> : null}
        {(mode === "modal" || step === 3) ? <fieldset><legend>Review and confirm</legend><p>Planning is distinct from committed exposure. Placement is a separate simulated confirmation.</p><dl className={styles.detailGrid}><div><dt>Event</dt><dd>{bet.event || "Not entered"}</dd></div><div><dt>Bookmaker</dt><dd>{bet.bookmaker}</dd></div><div><dt>Exchange</dt><dd>{bet.exchange}</dd></div><div><dt>Back</dt><dd>£{bet.backStake} @ {bet.backOdds}</dd></div><div><dt>Lay</dt><dd>@ {bet.layOdds} · commission {bet.commission}</dd></div></dl></fieldset> : null}
      </div><aside className={styles.calcSummary}><h3>Qualifying reference</h3>{fixtureMatches ? <><p>Validated fixture CALC-001</p><dl><div><dt>Lay stake</dt><dd>{money(Number(labQualifyingFixture.layStake))}</dd></div><div><dt>Liability</dt><dd>{money(Number(labQualifyingFixture.liability))}</dd></div><div><dt>Back wins</dt><dd>{money(Number(labQualifyingFixture.backWins))}</dd></div><div><dt>Lay wins</dt><dd>{money(Number(labQualifyingFixture.layWins))}</dd></div><div><dt>Conservative</dt><dd>{money(Number(labQualifyingFixture.matchedResult))}</dd></div></dl></> : <p role="status">Calculation unavailable for edited inputs. The lab has no validated result for this tuple; restore the displayed fixture values.</p>}</aside></div>
      {entryError ? <p className={styles.error} role="alert">{entryError}</p> : null}
      <div className={styles.entryFooter}>{mode === "page" && step > 0 ? <button className={styles.secondaryButton} onClick={() => setStep(current => current - 1)} type="button">Back</button> : null}<button className={styles.secondaryButton} onClick={closeEntry} type="button">Cancel</button>{mode === "page" && step < 3 ? <button className={styles.primaryButton} onClick={() => setStep(current => current + 1)} type="button">Continue</button> : <>{correctionMode ? <button className={styles.primaryButton} onClick={saveCorrection} type="button">Save correction</button> : <><button className={styles.secondaryButton} onClick={() => saveBet("Prospecting")} type="button">Save Prospecting</button><button className={styles.primaryButton} onClick={() => saveBet("Placed")} type="button">Confirm simulated placement</button></>}</>}</div>
    </div>;
  }
}
