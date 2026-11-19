"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { DesignBetWorkbenchContext, DesignBetWorkbenchGrid, DesignBetWorkbenchStageRail, DesignBetWorkbenchSummary } from "@/components/design-bet-workbench-presentation";
import { DesignPageHead } from "@/components/design-ledger-screen";
import { DesignLabSelect } from "@/components/design-lab-select";
import { formatFinancialValue } from "@/lib/financial-display";
import { sportsbookComparisonScenarios } from "@/lib/sportsbook-outcome-comparison";
import { labDestinations } from "@/lib/design-lab-navigation";
import lab from "@/components/design-lab-connected.module.css";
import local from "@/components/design-lab-sportsbook-proposals.module.css";

export type SportsbookProposalId = "protected" | "offer" | "requirements" | "matching" | "finish";

const choices: { id: SportsbookProposalId; label: string; stage: number }[] = [
  { id: "protected", label: "1 · Protected records", stage: 4 },
  { id: "offer", label: "2 · Additional Offer details", stage: 0 },
  { id: "requirements", label: "3 · Requirements and outcomes", stage: 1 },
  { id: "matching", label: "4 · Matching and Placement", stage: 2 },
  { id: "finish", label: "5 · Finish / Review", stage: 4 },
];
const stages = ["Offer", "Requirements", "Matching", "Placement", "Finish / Review"];
function Icon({ children }: { children: string }) { return <span aria-hidden="true" className="material-symbols-outlined">{children}</span>; }
function money(value: string) { return formatFinancialValue(Number(value)); }

/** Separate, synthetic proposal state. The approved /design-lab route is untouched. */
export function DesignLabSportsbookProposals({ initialAmendment }: { initialAmendment: SportsbookProposalId }) {
  const router = useRouter();
  const [amendment, setAmendment] = useState(initialAmendment);
  const [stage, setStage] = useState(choices.find(choice => choice.id === initialAmendment)?.stage ?? 4);
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
  const [fillState, setFillState] = useState<"standard" | "partial">("standard");
  const [placementRecorded, setPlacementRecorded] = useState(false);
  const [linked, setLinked] = useState(true);
  const [notice, setNotice] = useState("");
  const marketRef = useRef<HTMLInputElement>(null);

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
          <DesignPageHead><div><h1>Edit Sportsbook Bet · DEMO-001</h1><p>Offer first · prepare and confirm external placement later</p></div><div className={lab.headActions}><Link className={lab.linkButton} href="/design-lab">Approved Lab</Link></div></DesignPageHead>
          <p className={local.previewNotice}><strong>Five unapproved amendments.</strong> Synthetic records and simulated actions only. The approved Design Lab remains available from the link above.</p>
          <nav aria-label="Choose amendment" className={local.choiceRow}>{choices.map(choice => <a aria-current={amendment === choice.id ? "page" : undefined} href={`?amendment=${choice.id}`} key={choice.id} onClick={event => { event.preventDefault(); selectAmendment(choice.id); }}>{choice.label}</a>)}</nav>
          <div className={lab.entry} data-pd-id="lab.proposal.workbench">
            <DesignBetWorkbenchContext title="Bet Workbench · simulated" context="Profile A · synthetic record" />
            <DesignBetWorkbenchStageRail activeId={String(stage)} onSelect={id => { const next = Number(id); setStage(next); if (next === 0) selectAmendment("offer"); else if (next === 1) selectAmendment("requirements"); else if (next === 2 || next === 3) { selectAmendment("matching"); setStage(next); } else selectAmendment("finish"); }} stages={stages.map((label, index) => ({ id: String(index), label }))} />
            <DesignBetWorkbenchGrid>
              <div className={lab.entryFields}>
                {amendment === "protected" ? <fieldset><legend>Finish / Review</legend>{reviewClosed ? <p role="status">Protected review closed in this simulation. No source record changed.</p> : <><p>Recorded financial fields are read-only. Review a correction to change them.</p><dl className={lab.detailGrid}><div><dt>Status</dt><dd>Settled</dd></div><div><dt>Result</dt><dd>Back won</dd></div><div><dt>Profile</dt><dd>Profile A</dd></div></dl>{correction ? <label>Correction reason<textarea aria-label="Correction reason" placeholder="Record why the value needs correction" rows={2} /></label> : null}</>}</fieldset> : null}
                {amendment === "offer" ? <fieldset><legend>Offer</legend><label>Original Offer text<textarea defaultValue="Synthetic offer wording" rows={5} /></label><div className={lab.fieldPair}><DesignLabSelect dataPdId="lab.proposal.bookmaker" label="Bookmaker" onChange={setBookmaker} options={[{ value: "Bookmaker A", label: "Bookmaker A" }, { value: "Bookmaker B", label: "Bookmaker B" }]} value={bookmaker} /><label>Offer Name<input defaultValue="Demo Offer" /></label><label>Offer Type<input defaultValue="Bet & Get" /></label><label>Bet Type<input defaultValue="Single" /></label></div><details key={String(offerDetailsOpen)} open={offerDetailsOpen} onToggle={event => setOfferDetailsOpen(event.currentTarget.open)}><summary>Additional offer details</summary><div className={lab.fieldPair}><label>Event Name<input defaultValue="Synthetic fixture" /></label><label>Market<input ref={marketRef} aria-invalid={offerError} defaultValue="" placeholder="Choose the recorded market" /></label><label>Promotion Link<input placeholder="Optional recorded URL" /></label><label>Account review<input readOnly value={`${bookmaker} · Profile A`} /></label></div>{offerError ? <p className={local.error} role="alert">Market requires review before continuing.</p> : null}</details><button className={lab.secondaryButton} onClick={() => { setOfferError(true); setOfferDetailsOpen(true); setNotice("Validation opened Additional offer details at the field needing attention."); requestAnimationFrame(() => marketRef.current?.focus()); }} type="button">Trigger validation error</button></fieldset> : null}
                {amendment === "requirements" ? <fieldset><legend>Recorded requirements</legend><div className={local.switchRow}><button className={lab.secondaryButton} onClick={() => setOutcomeState("ordinary")} type="button">Ordinary result</button><button className={lab.secondaryButton} onClick={() => setOutcomeState("exceptional")} type="button">Extra scenarios</button><button className={lab.secondaryButton} onClick={() => setOutcomeState("unavailable")} type="button">Unavailable data</button></div><dl className={lab.detailGrid}><div><dt>Qualifying source</dt><dd>{outcomeState === "unavailable" ? "Unknown" : "Recorded · synthetic"}</dd></div><div><dt>Reward conditions</dt><dd>Unknown</dd></div><div><dt>External placement evidence</dt><dd>{outcomeState === "ordinary" ? "Recorded · synthetic" : "Unknown"}</dd></div></dl><small className={local.fieldHelp}>Unknown means no recorded evidence. This preview does not confirm external activity.</small></fieldset> : null}
                {amendment === "matching" ? <fieldset key={`${stage}-${fillState}`}><legend>{stage === 3 ? "Placement" : "Matching"}</legend><div className={local.switchRow}><button className={lab.secondaryButton} onClick={() => setStage(2)} type="button">Matching</button><button className={lab.secondaryButton} onClick={() => setStage(3)} type="button">Placement</button><button className={lab.secondaryButton} onClick={() => setFillState("standard")} type="button">Standard case</button><button className={lab.secondaryButton} onClick={() => setFillState("partial")} type="button">Partial fill</button></div>{stage === 2 ? <><div className={lab.fieldPair}><label>Back stake<input defaultValue="10.00" inputMode="decimal" /></label><label>Back odds<input defaultValue="2.10" inputMode="decimal" /></label><label>Lay odds<input defaultValue="2.20" inputMode="decimal" /></label><label>Commission<input defaultValue="2.00" inputMode="decimal" /></label></div><details><summary>Advanced calculator options</summary><div className={lab.fieldPair}><label>Calculator Type<input defaultValue={fillState === "partial" ? "Partial lay" : "Standard"} /></label><label>Lay mode<input defaultValue="Reference stake" /></label><label>Back bet<input defaultValue="£10.00 at 2.10" readOnly /></label><label>Lay bet<input defaultValue="Reference 9.54 at 2.20" readOnly /></label><label>Execution choice<input defaultValue={fillState === "partial" ? "Partial match review" : "Standard hedge"} readOnly /></label></div><small className={local.fieldHelp}>Advanced strategy and execution choices are illustrative. Replan uses the native calculator in PD.</small><button className={lab.secondaryButton} onClick={() => setNotice("Replan simulated. No calculation or source record changed.")} type="button">Replan with current references</button></details></> : <><div className={lab.fieldPair}><label>Back placement<input defaultValue="Externally confirmed" /></label><label>Lay placement<input defaultValue={fillState === "partial" ? "Partially matched" : "Fully matched"} /></label><label>Actual back stake<input defaultValue="10.00" inputMode="decimal" /></label><label>Actual matched lay stake<input defaultValue={fillState === "partial" ? "5.00" : "9.54"} inputMode="decimal" /></label></div><details><summary>Actual stakes, partial fills and confirmation</summary><div className={lab.fieldPair}><label>Requested lay stake<input defaultValue="9.54" inputMode="decimal" /></label><label>Remaining unmatched stake<input defaultValue={fillState === "partial" ? "4.54" : "0.00"} inputMode="decimal" /></label><label>Actual lay odds<input defaultValue="2.20" inputMode="decimal" /></label><label>Exchange<input defaultValue="Exchange A" /></label></div><div className={local.switchRow}><button className={lab.secondaryButton} onClick={() => { setPlacementRecorded(true); setNotice("External Back confirmation simulated; no bet was placed."); }} type="button">Confirm external Back</button><button className={lab.secondaryButton} onClick={() => { setPlacementRecorded(true); setNotice("External Lay confirmation simulated; no bet was placed."); }} type="button">Confirm external Lay</button></div>{placementRecorded ? <p role="status">Recorded in this preview only</p> : null}</details></>}</fieldset> : null}
                {amendment === "finish" ? <fieldset><legend>Finish / Review</legend><div className={local.switchRow}><button className={lab.secondaryButton} onClick={() => setLinked(true)} type="button">With linked reward</button><button className={lab.secondaryButton} onClick={() => setLinked(false)} type="button">Without linked reward</button></div><div className={lab.fieldPair}><label>Result<input defaultValue="Pending" /></label><label>Settlement date<input type="date" /></label></div><details><summary>Linked Free Bets</summary>{linked ? <p>One recorded synthetic relationship · Profile A <button className={lab.linkButton} onClick={() => setNotice("Linked Free Bet review simulated. No source record changed.")} type="button">Review linked Free Bet</button></p> : <p>No linked reward is recorded for this synthetic case.</p>}</details><details className={local.moreActions}><summary>More actions</summary><button className={lab.dangerButton} onClick={() => setNotice("Destructive action preview only; no record changed.")} type="button">Delete record · preview</button></details></fieldset> : null}
              </div>
              <DesignBetWorkbenchSummary title="Outcome Comparison"><p>{outcomeState === "exceptional" && amendment === "requirements" ? "Double Delight" : "Standard"} · synthetic signed fixtures</p>{(outcomeState === "unavailable" && amendment === "requirements") || (amendment === "matching" && fillState === "partial") ? <p role="status">{amendment === "matching" ? "Outcome unavailable for this partial-fill proposal; PD retains the native calculation authority." : "Outcome unavailable: required source values are not recorded."}</p> : <dl>{scenarios.map(row => <div data-pd-id={`lab.proposal.outcome.${row.key}`} key={row.key}><dt>{row.label}</dt><dd>{money(String(row.amount))}</dd></div>)}</dl>}</DesignBetWorkbenchSummary>
            </DesignBetWorkbenchGrid>
            {notice ? <p className={local.inlineStatus} role="status">{notice}</p> : null}
            <div className={lab.entryFooter} data-pd-id="lab.proposal.footer">
              <span className={local.footerMessage}>Proposal only · no Save command is connected</span>
              {amendment === "protected" ? reviewClosed ? <button className={lab.secondaryButton} onClick={() => setReviewClosed(false)} type="button">Reopen protected review</button> : correction ? <><button className={lab.secondaryButton} onClick={() => { setCorrection(false); setNotice("Correction draft abandoned; protected review remains open."); }} type="button">Cancel Correction</button><button className={lab.primaryButton} onClick={() => setNotice("Save Audited Correction simulated; no record changed.")} type="button">Save Audited Correction</button></> : <><button className={lab.secondaryButton} onClick={() => { setReviewClosed(true); setNotice("Protected review closed; no record changed."); }} type="button">Cancel</button><button className={lab.primaryButton} onClick={() => { setCorrection(true); setNotice("Correction editor opened; no write was made."); }} type="button">Review Correction</button></> : <><button className={lab.secondaryButton} onClick={() => setNotice("Preview cancelled; no record changed.")} type="button">Cancel</button><button className={lab.primaryButton} onClick={() => setNotice("Primary finish action simulated; no bet was placed or settled.")} type="button">Finish Placed Record</button></>}
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>;
}
