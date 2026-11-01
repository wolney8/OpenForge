"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { ModalBoundary } from "@/components/modal-boundary";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatFinancialValue } from "@/lib/financial-display";
import {
  initialLabAccounts, labAccountBalanceError, labProfiles,
  saveLabAccountBalance, summarizeDesignLab,
  type LabAccount, type LabRange, type LabScope,
} from "@/lib/design-lab-fixture";
import styles from "./design-lab-journey.module.css";

type LabView = "home" | "tasks" | "profiles" | "accounts" | "account";
type LabScenario = "normal" | "loading" | "failure";

function Icon({ children }: { children: ReactNode }) {
  return <span aria-hidden="true" className="material-symbols-outlined">{children}</span>;
}

function money(value: number): string {
  return value === 0 ? "£0.00" : formatFinancialValue(value);
}

const globalNavigation = [
  { id: "home", label: "Home", icon: "home" },
  { id: "tasks", label: "Today", icon: "task_alt" },
  { id: "profiles", label: "Profiles", icon: "group" },
] as const;

export function DesignLabJourney() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<LabAccount[]>(initialLabAccounts);
  const [scope, setScope] = useState<LabScope>("all");
  const [range, setRange] = useState<LabRange>("Last Month");
  const [view, setView] = useState<LabView>("home");
  const [returnScope, setReturnScope] = useState<LabScope>("all");
  const [accountId, setAccountId] = useState("LAB-ACCOUNT-C");
  const [draftBalance, setDraftBalance] = useState("");
  const [validationError, setValidationError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [failNextSave, setFailNextSave] = useState(false);
  const [scenario, setScenario] = useState<LabScenario>("normal");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingNavigation = useRef<(() => void) | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousView = useRef(view);
  const account = accounts.find((item) => item.id === accountId) ?? accounts[0];
  const isDirty = view === "account" && draftBalance !== account.currentBalance;
  const summary = useMemo(() => summarizeDesignLab(accounts, scope, range), [accounts, scope, range]);
  const profileName = scope === "all" ? "All Profiles" : labProfiles.find((item) => item.id === scope)?.name ?? "Profile";
  const searchMatches = search.trim()
    ? accounts.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()) && (scope === "all" || item.profileId === scope))
    : [];

  useEffect(() => {
    if (!isDirty) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [isDirty]);

  useEffect(() => {
    if (previousView.current !== view) {
      previousView.current = view;
      window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    }
  }, [view]);

  function navigate(action: () => void) {
    if (isDirty) {
      pendingNavigation.current = action;
      setConfirmOpen(true);
      return;
    }
    action();
  }

  function openAccount(nextAccount: LabAccount) {
    navigate(() => {
      setReturnScope(scope);
      setScope(nextAccount.profileId);
      setAccountId(nextAccount.id);
      setDraftBalance(nextAccount.currentBalance);
      setValidationError("");
      setSaveError("");
      setSaveMessage("");
      setView("account");
      setSearch("");
      setSearchOpen(false);
      setMenuOpen(false);
    });
  }

  function returnHome() {
    navigate(() => {
      setScope(returnScope);
      setView("home");
      setMenuOpen(false);
    });
  }

  function saveBalance(): boolean {
    const error = labAccountBalanceError(draftBalance);
    if (error) { setValidationError(error); setSaveError(""); return false; }
    setValidationError("");
    if (failNextSave) {
      setFailNextSave(false);
      setSaveError("Simulated save failed. Your entered value is still here; try again.");
      return false;
    }
    const saved = saveLabAccountBalance(accounts, account.id, draftBalance);
    const canonical = saved.find((item) => item.id === account.id)?.currentBalance ?? draftBalance;
    setAccounts(saved);
    setDraftBalance(canonical);
    setSaveError("");
    setSaveMessage("Simulation saved in this page. Refresh resets it.");
    return true;
  }

  function finishPendingNavigation() {
    const action = pendingNavigation.current;
    pendingNavigation.current = null;
    setConfirmOpen(false);
    action?.();
  }

  const title = view === "home" ? "Your position" : view === "tasks" ? "Today" : view === "profiles" ? "Profiles"
    : view === "accounts" ? "Accounts" : "Account review";
  const activeNav = view === "account" || view === "accounts" ? "accounts" : view;

  return (
    <div className={styles.lab} data-pd-id="design-lab.root">
      <div className={styles.frame}>
        <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`} aria-label="Design Lab navigation">
          <div className={styles.brand}><span className="brand-mark"><BrandLogo priority variant="mark" /></span><span><strong>Plum Duff</strong><small>Design Lab</small></span></div>
          <nav aria-label="Global destinations" className={styles.navGroup}>
            <p className={styles.navCaption}>Workspace</p>
            {globalNavigation.map((item) => (
              <button aria-current={activeNav === item.id ? "page" : undefined} className={`${styles.navItem} ${activeNav === item.id ? styles.navActive : ""}`} data-pd-id={`design-lab.nav.${item.id}`} key={item.id}
                onClick={() => navigate(() => { setView(item.id); setMenuOpen(false); })} type="button">
                <Icon>{item.icon}</Icon><span>{item.label}</span>
              </button>
            ))}
          </nav>
          <nav aria-label="Profile workflows" className={styles.navGroup}>
            <p className={styles.navCaption}>Profile work</p>
            <button aria-current={activeNav === "accounts" ? "page" : undefined} className={`${styles.navItem} ${activeNav === "accounts" ? styles.navActive : ""}`} data-pd-id="design-lab.nav.accounts"
              onClick={() => navigate(() => { setScope(scope === "all" ? "LAB-PROFILE-A" : scope); setView("accounts"); setMenuOpen(false); })} type="button">
              <Icon>account_balance_wallet</Icon><span>Accounts</span>
            </button>
            <span className={styles.navFuture}><Icon>sports_score</Icon><span>Sportsbook <small>Current app</small></span></span>
            <span className={styles.navFuture}><Icon>summarize</Icon><span>Reports <small>Current app</small></span></span>
            <span className={styles.navFuture}><Icon>query_stats</Icon><span>Tools <small>Current app</small></span></span>
          </nav>
          <div className={styles.sidebarFoot}>Synthetic data · no owner writes</div>
        </aside>

        <div className={styles.workspace}>
          <header className={styles.topbar} data-pd-id="design-lab.topbar">
            <button aria-expanded={menuOpen} aria-label={menuOpen ? "Close navigation" : "Open navigation"} className={`${styles.iconButton} ${styles.menuButton}`} onClick={() => setMenuOpen((value) => !value)} ref={menuRef} type="button"><Icon>menu</Icon></button>
            <div className={styles.topTitle}><span>Fund Manager</span><strong>Design Lab</strong></div>
            <label className={styles.contextSelect}><span className="sr-only">Profile context</span><select aria-label="Profile context" data-pd-id="design-lab.profile" onChange={(event) => navigate(() => { setScope(event.target.value as LabScope); if (view === "account") setView("home"); })} value={scope}><option value="all">All Profiles</option>{labProfiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Icon>expand_more</Icon></label>
            <div className={`${styles.searchArea} ${searchOpen ? styles.searchOpen : ""}`} role="search">
              <Icon>search</Icon><input aria-label="Search synthetic Accounts" data-pd-id="design-lab.search" onChange={(event) => setSearch(event.target.value)} placeholder="Search Accounts" ref={searchRef} type="search" value={search} />
            </div>
            <button aria-expanded={searchOpen} aria-label={searchOpen ? "Close search" : "Open search"} className={`${styles.iconButton} ${styles.searchButton}`} onClick={() => { setSearchOpen((value) => !value); if (!searchOpen) window.requestAnimationFrame(() => searchRef.current?.focus()); else setSearch(""); }} type="button"><Icon>{searchOpen ? "close" : "search"}</Icon></button>
            <button aria-label="Show today's tasks" className={styles.iconButton} data-pd-id="design-lab.tasks-action" onClick={() => navigate(() => setView("tasks"))} type="button"><Icon>notifications</Icon>{summary.actionableAccounts.length > 0 ? <span className={styles.notificationDot} /> : null}</button>
            <ThemeToggle />
          </header>
          {search ? <section aria-label="Synthetic search results" className={styles.searchResults} data-pd-id="design-lab.search-results">
            {searchMatches.length ? searchMatches.map((item) => <button key={item.id} onClick={() => openAccount(item)} type="button">{item.name} · {labProfiles.find((profile) => profile.id === item.profileId)?.name} <Icon>arrow_forward</Icon></button>) : <p>No synthetic Accounts match.</p>}
          </section> : null}
          <div className={styles.contextRow}><span>{profileName}</span><span aria-hidden="true">/</span><span>{title}</span><span className={styles.simulationLabel}>Simulation · 1 Nov 2026</span></div>

          <main className={styles.main} id="main-content" data-pd-id="design-lab.main">
            <div className={styles.pageHeader}>
              <div><span className={styles.eyebrow}>Fund Manager workspace</span><h1 ref={headingRef} tabIndex={-1}>{title}</h1><p>{view === "account" ? "Review the Account source, then return to your position." : "See the position, then act on what needs attention."}</p></div>
              <div className={styles.pageActions}>
                <label className={styles.rangeControl}><span>Selected Range</span><select aria-label="Selected Range (simulation)" data-pd-id="design-lab.range" onChange={(event) => navigate(() => setRange(event.target.value as LabRange))} value={range}><option>Last Month</option><option>This Year</option></select></label>
                <button className={styles.exitLink} onClick={() => navigate(() => router.push("/"))} type="button">Exit Lab</button>
              </div>
            </div>

            {scenario === "loading" ? <section aria-busy="true" className={styles.statePanel} data-pd-id="design-lab.loading"><span className="material-linear-progress" aria-hidden="true"><span /></span><p role="status">Loading synthetic position…</p></section>
              : scenario === "failure" ? <section className={styles.statePanel} data-pd-id="design-lab.failure"><h2>Position unavailable</h2><p>The simulated read failed. No financial amount is assumed.</p><button className={styles.secondaryButton} onClick={() => setScenario("normal")} type="button">Retry simulation</button></section>
                : view === "home" ? <>
                  <section aria-label="Financial position" className={styles.metrics} data-pd-id="design-lab.metrics">
                    <article className={styles.metric}><span>Known cash</span><strong>{money(Number(summary.cash.knownSubtotal))}</strong><small>{summary.cashMissingCount ? `Incomplete · ${summary.cashMissingCount} Account balance missing` : "All included balances known"}</small></article>
                    <article className={styles.metric}><span>Realised P&amp;L</span><strong>{money(summary.realised.knownValue)}</strong><small>{range} · settled history</small></article>
                    <article className={styles.metric}><span>Committed exposure</span><strong>{money(summary.exposure.knownValue)}</strong><small>{summary.committedCount} placed open positions · planning excluded</small></article>
                  </section>
                  <div className={styles.mainGrid}>
                    <section aria-labelledby="lab-attention-title" className={styles.attention} data-pd-id="design-lab.attention">
                      <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Next action</span><h2 id="lab-attention-title">Needs attention</h2></div><button className={styles.textButton} onClick={() => setView("tasks")} type="button">All tasks <Icon>arrow_forward</Icon></button></div>
                      {summary.actionableAccounts.length ? summary.actionableAccounts.map((item) => <article className={styles.taskRow} key={item.id}><span className={styles.taskIcon}><Icon>account_balance_wallet</Icon></span><div><strong>Confirm current balance</strong><p>{item.name} · {labProfiles.find((profile) => profile.id === item.profileId)?.name}</p><small>Unknown cash is excluded from the known subtotal.</small></div><button className={styles.primaryButton} data-pd-id="design-lab.review-account" onClick={() => openAccount(item)} type="button">Review Account <Icon>arrow_forward</Icon></button></article>) : <div className={styles.emptyState}><strong>No Account balance review needed</strong><p>This synthetic context has no current task.</p></div>}
                    </section>
                    <details className={styles.detailPanel}><summary>How these figures are sourced</summary><dl><div><dt>Cash</dt><dd>{accounts.filter((item) => scope === "all" || item.profileId === scope).length - summary.cashMissingCount} known Accounts; {summary.cashMissingCount} unknown</dd></div><div><dt>Exposure</dt><dd>Placed positions only</dd></div><div><dt>Performance</dt><dd>Settled results in {range}</dd></div></dl></details>
                  </div>
                </> : view === "tasks" ? <section className={styles.contentPanel}><h2>Account evidence reviews</h2>{summary.actionableAccounts.length ? summary.actionableAccounts.map((item) => <div className={styles.listRow} key={item.id}><div><strong>{item.name}</strong><p>{labProfiles.find((profile) => profile.id === item.profileId)?.name} · Current Balance unknown</p></div><button className={styles.primaryButton} onClick={() => openAccount(item)} type="button">Review Account</button></div>) : <div className={styles.emptyState}>No Account balance review needed for {profileName}.</div>}</section>
                  : view === "profiles" ? <section className={styles.contentPanel}><h2>Synthetic Profiles</h2>{labProfiles.map((item) => <div className={styles.listRow} key={item.id}><div><strong>{item.name}</strong><p>{item.id}</p></div><button className={styles.secondaryButton} onClick={() => { setScope(item.id); setView("home"); }} type="button">Open position</button></div>)}</section>
                    : view === "accounts" ? <section className={styles.contentPanel}><h2>{profileName} Accounts</h2>{accounts.filter((item) => scope === "all" || item.profileId === scope).map((item) => <div className={styles.listRow} key={item.id}><div><strong>{item.name}</strong><p>{item.type} · {item.currentBalance ? money(Number(item.currentBalance)) : "Current Balance unknown"}</p></div><button className={styles.secondaryButton} onClick={() => openAccount(item)} type="button">Open Account</button></div>)}</section>
                      : <section aria-labelledby="lab-account-title" className={styles.accountLayout} data-pd-id="design-lab.account-detail">
                        <div className={styles.accountIntro}><button className={styles.backButton} data-pd-id="design-lab.return" onClick={returnHome} type="button"><Icon>arrow_back</Icon> Return to position</button><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>{labProfiles.find((item) => item.id === account.profileId)?.name} · Account source</span><h2 id="lab-account-title">{account.name}</h2></div><span className={styles.statusChip}>Active</span></div><p>{account.currentBalance ? "This Account has a reviewed Current Balance in the simulation." : "This Account’s Current Balance is unknown. Fund Manager cash remains a known subtotal until it is confirmed."}</p><dl><div><dt>Account identity</dt><dd>{account.id}</dd></div><div><dt>Type</dt><dd>{account.type}</dd></div><div><dt>Current Balance</dt><dd>{account.currentBalance ? money(Number(account.currentBalance)) : "Unknown · requires review"}</dd></div></dl></div>
                        <form className={styles.reviewPanel} onSubmit={(event) => { event.preventDefault(); saveBalance(); }}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Simulated review</span><h2>Confirm balance</h2></div><button aria-label="Close Account review" className={`${styles.iconButton} ${styles.neutralClose}`} data-pd-id="design-lab.close" onClick={returnHome} ref={closeRef} type="button"><Icon>close</Icon></button></div><p>Use the observed amount. Enter 0.00 only when zero is authoritative.</p><label className={styles.balanceField}><span>Current Balance</span><span className={styles.moneyInput}><span aria-hidden="true">£</span><input aria-describedby="lab-balance-help lab-balance-error" aria-invalid={Boolean(validationError)} autoComplete="off" data-pd-id="design-lab.balance" inputMode="decimal" onChange={(event) => { setDraftBalance(event.target.value); setValidationError(""); setSaveError(""); }} placeholder="Unknown" type="text" value={draftBalance} /></span></label><small id="lab-balance-help">Blank stays unknown. Saving is simulated in memory only.</small>{validationError ? <p className={styles.error} id="lab-balance-error" role="alert">{validationError}</p> : <span id="lab-balance-error" />}{saveError ? <p className={styles.error} role="alert">{saveError}</p> : null}{saveMessage ? <p className={styles.success} role="status">{saveMessage}</p> : null}<div className={styles.formActions}><button className={styles.secondaryButton} onClick={returnHome} type="button">Return</button><button className={styles.primaryButton} data-pd-id="design-lab.save" type="submit">Save simulation</button></div></form>
                      </section>}

            <details className={styles.labControls}><summary>Lab scenarios and comparison</summary><div className={styles.labControlsBody}><label>Position read state <select aria-label="Position read state" onChange={(event) => setScenario(event.target.value as LabScenario)} value={scenario}><option value="normal">Normal / partial known</option><option value="loading">Loading</option><option value="failure">Load failure</option></select></label><label><input checked={failNextSave} onChange={(event) => setFailNextSave(event.target.checked)} type="checkbox" /> Fail the next simulated save</label><p>Profile B demonstrates an empty task state. Refresh resets all simulated saves.</p><div className={styles.comparison}><div><strong>Current route sequence</strong><p>Summary Dashboard → Profile context → Profile Operations / Accounts → affected Account → return.</p></div><div><strong>Lab route sequence</strong><p>Position → Account task → source review → return with the prior Profile and range.</p></div></div><small>These are route patterns, not measured usability results.</small></div></details>
          </main>
        </div>
      </div>

      {confirmOpen ? <ModalBoundary onDismiss={() => setConfirmOpen(false)} returnFocusRef={closeRef}><section aria-labelledby="lab-discard-title" className={styles.confirmPanel} role="dialog"><h2 id="lab-discard-title">Unsaved balance review</h2><p>Your entered amount is only in this simulation. Choose what happens before leaving.</p>{saveError ? <p className={styles.error} role="alert">{saveError}</p> : null}{validationError ? <p className={styles.error} role="alert">{validationError}</p> : null}<div className={styles.confirmActions}><button className={styles.secondaryButton} onClick={() => setConfirmOpen(false)} type="button">Keep editing</button><button className={styles.destructiveButton} onClick={() => { setDraftBalance(account.currentBalance); finishPendingNavigation(); }} type="button">Discard changes</button><button className={styles.primaryButton} onClick={() => { if (saveBalance()) finishPendingNavigation(); }} type="button">Save and return</button></div></section></ModalBoundary> : null}
    </div>
  );
}
