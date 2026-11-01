# Plum Duff Design Lab — initial baseline brief

**Status:** initial owner-sourced brief; the first lab journey was approved and built in CP-111, then **OWNER REJECTED / REVISION REQUIRED** visually. CP-112 revises that same isolated journey for owner review. No earlier repository brief or approval history is claimed. Provenance: the owner's CP-110 kickoff and subsequent clarification, reconciled with existing Plum Duff contracts and requests. [CP-110 scenario matrix](../audits/platform-quality-audit.md#linked-scenario-coverage) · [canonical request register](plum-duff-next-issue-tracking-register.md#cp-110-fund-manager-design-lab-discovery--2026-11-01).

## CP-113 connected experience proposals — 2026-11-01

CP-112 is sufficient to continue lab exploration, **not** approved for normal integration. The following are `PROPOSED — LAB ONLY` before implementation. They preserve the same localhost-only, authenticated, synthetic Design Lab boundary.

| Proposal | Existing rule/purpose | Lab treatment and retained safeguard | Owner review |
| --- | --- | --- | --- |
| Connected shell and site search | CP-112 has Account-only search and one task route. | Group synthetic Accounts, bets, Free Bets, offers and Reports; maintain Profile context and back-to-source navigation. Search opens on typing, not focus. No owner data/API writes. | Judge navigation and information hierarchy. |
| Ledger table and narrow list | Normal ledgers have required table columns and row actions. | Desktop preview retains each domain's required columns in contained table overflow; narrow lab lists expose key summary plus full labelled detail. This **does not amend** required displayed-column contracts. | Decide separately whether narrow lists may replace columns in normal UI. |
| Bet-entry alternatives | Normal Sportsbook editor is governed by field, calculation and lifecycle contracts. | Compare compact modal and page stepper on one synthetic draft. Both share input/validation/state; fixture-backed money output is shown only for its validated input tuple. No live calculation engine is copied or inferred. | Judge entry design; any arbitrary-input simulation needs a separately approved calculation reuse path. |
| Other ledger previews and Reports | Existing ledgers and reports require source identity and known/unknown money distinctions. | Interactive synthetic row/detail previews, linked parent/child navigation and a fixture-backed report drilldown; preview-only actions explicitly labelled. | Judge connected presentation, not financial acceptance. |

Reference adaptations: [CDS NavigationBar](https://cds.coinbase.com/components/navigation/NavigationBar/), [Sidebar](https://cds.coinbase.com/components/navigation/Sidebar/) and [NavigationTitleSelect](https://cds.coinbase.com/components/navigation/NavigationTitleSelect/) inform shell/context; [SearchInput](https://cds.coinbase.com/components/inputs/SearchInput/) informs typed grouped search; [Table](https://cds.coinbase.com/components/data-display/Table/) informs desktop scan/sort and explicit mobile list distinction; [Stepper](https://cds.coinbase.com/components/navigation/Stepper/) informs page entry progress; [Modal](https://cds.coinbase.com/components/overlay/Modal/) informs bounded quick entry. DJList's compact toolbars are secondary; no reference styling or assets are copied.

**Required-column preservation map (lab desktop):** `design-lab-connected-data.ts` mirrors current default column labels from the named normal ledger shells. The table has a contained horizontal viewport and pinned Actions; narrow summaries link to a fully labelled record. Narrow replacement of the normal ledger's required columns remains an owner decision.

| Domain | Current authority | Lab treatment |
| --- | --- | --- |
| Accounts | `accounts-workflow-shell.tsx` table columns | Account ID, identity/type/status, cash membership/balance/withdrawal, update/channel/group/platform, Actions. |
| Sportsbook | `sportsbook-workflow-first-shell.tsx` default columns | Settles, bookmaker, event, campaign/offer, strategy, lay/back state, value, status, Actions. |
| Free Bets | `free-bet-workflow-shell.tsx` default columns | Settles/expiry, bookmaker, campaign/event/offer, strategy, lay/back state, value, status, Actions. |
| Casino Offers | `casino-offer-workflow-shell.tsx` default columns | Settles/expiry, bookmaker, offer/game/type, status/result/value, Actions. |
| Extra Place | `each-way-extra-place-workflow-shell.tsx` column authority | Date, runner/race, bookmaker, E/W stake, back/place odds and terms, both lay legs and liabilities, rating/implied odds, qualifying loss, extra-place potential and Actions. Status appears in row/detail treatment, not a duplicate table column. |
| Cash Adjustments | `cash-adjustment-workflow-shell.tsx` default columns | ID/date/direction/type, amount/signed amount, investment/cash scope, linked Account, description/week/calculation state, Actions. |

**Fidelity boundary:** Account balance and one CALC-001 Sportsbook bet have working synthetic state. The Sportsbook modal and page share a draft, matching precedes Event Name, and Prospecting → Placed → Settled → correction/history → report is simulated. The new bet retains its creation Profile across context switches. Only the CALC-001 input tuple has validated financial output; changed inputs show unavailable and block financial Save. Free Bet, Casino, Extra Place and Cash Adjustment Add/Edit are interactive representative previews; their Save is disabled. The report chart uses exact synthetic settled-point values, filters source drilldown by range/Profile and links each visible point to a source record. It does not imply owner reporting acceptance.

The original CP-112 private capture directory was not found in this worktree during CP-113. Its source baseline remains at `/design-lab?baseline=cp112`; baseline light/dark browser captures were regenerated under `data/private/evidence/cp113-design-lab/`. The original capture files are not claimed as recovered.

## Purpose and problem

The owner finds the Fund Manager experience clunky, inconsistent and overloaded. Header, menu,
navigation, styling, dense pages, long forms, warning repetition and awkward modal journeys make
related work harder to follow. The aim is one coherent end-to-end Fund Manager experience that
handles complexity for the user while retaining required financial and operational detail.
Continuous isolated control tweaks are not the design strategy. Coinbase is the **primary UX
reference** for clarity despite financial complexity; the owner's DJList implementation is a
**secondary reference** for compact controls and responsive organisation, not a visual template.
Plum Duff retains its own Material 3 tokens, components and identity. No proprietary source,
assets, CSS, branding or trade dress are copied.

## Authority and approval boundary

| Requirement class | Current treatment |
| --- | --- |
| Essential business/data | Protect required ledger inputs and displayed columns, workbook parity, calculations, current/projected versus settled/final meaning, historical identity, permissions and Profile isolation. No hiding, combining or reinterpretation without explicit owner approval. |
| Interaction/accessibility safeguard | Retain draft protection, reliable explicit saving, validation, recovery, keyboard/focus and WCAG 2.2 AA outcomes. Compare alternate interactions only when these outcomes remain demonstrable. |
| Presentation convention | Assess header/navigation placement, density, spacing, colour roles, modal/drawer/full-page choice and responsive behaviour against the complete journey. A prior convention alone is not proof of optimal UX. |
| Historical workaround or uncertain rule | Trace original purpose and current evidence. Do not discard a workaround until its safety or data dependency is understood. |

For each material proposed rule change record: current rule/purpose; demonstrated problem;
recommended replacement; working synthetic lab example; retained business/safety behaviour;
affected workflows/contracts/checks; and precise owner decision. Label an exception
`PROPOSED — LAB ONLY` before lab implementation. Change authoritative application contracts only
after owner approval, retaining earlier decisions. Example: compare the current red Close icon
with a neutral Close treatment while preserving the identical dirty-form Save/Discard/Cancel
guard, keyboard focus and accessible name. This is a visual-semantics proposal, not an approved
normal-app change.

## Scenario discovery and traceability

The [linked CP-110 matrix](../audits/platform-quality-audit.md#linked-scenario-coverage) maps
requirement → scenario → current evidence → proposed treatment → acceptance check → status.
It spans daily work, management, reporting, administration, exceptions and recovery: position,
task triage, Profiles/onboarding/ranges, Accounts/balances/commission, opportunities,
calculators, Sportsbook, Free Bets, Casino, Extra Place, Cash Adjustments, offer/reward lineage,
open positions, Reports, imported history/workbook, settings/permissions, backup and restore.
The canonical request register retains all earlier IDs and detail. This brief does not replace it.

Status must distinguish implemented, code-verified, owner-accepted, defect, unverified and
planned/deferred. CP-108's **core** Sportsbook lifecycle and the accepted Reports/P&L boundary
remain accepted in their recorded scope. CP-109's broader visual/interaction acceptance remains
pending. No test count grants owner acceptance.

## Observable reference patterns — inspected 2026-11-01

| Source and evidence | Candidate lab use | Guard / uncertainty |
| --- | --- | --- |
| [Coinbase CDS NavigationBar](https://cds.coinbase.com/components/navigation/NavigationBar/) documents flexible start/centre/end regions, optional tabs and a responsive search that becomes an icon on mobile. | Test one legible global header and intentional search reflow. | Adapt behaviour with Plum Duff components; actual authenticated Coinbase header remains unverified. |
| [Coinbase CDS Sidebar](https://cds.coinbase.com/components/navigation/Sidebar/) documents labelled default, condensed and collapsed variants with overflow access. | Compare fewer stable global destinations against the current drawer and Profile menu. | Do not assume an icon-only rail is discoverable for every Plum Duff task; test labels, focus and zoom. |
| [Coinbase CDS NavigationTitleSelect](https://cds.coinbase.com/components/navigation/NavigationTitleSelect/) is a title-level context switcher backed by a dropdown and accessible label. | Compare a clear Fund Manager/Profile switch that preserves route and identity. | No Profile data may leak; current universal range authority stays unchanged. |
| [Coinbase CDS Table](https://cds.coinbase.com/components/data-display/Table/) documents compact cell spacing, sortable headers, contained height and mobile List View for complex tables. | Keep desktop financial columns comparable while testing usable narrow detail. | Required ledger columns must remain accessible; never silently remove them. |
| [Coinbase CDS Accordion](https://cds.coinbase.com/components/layout/Accordion/) documents auxiliary disclosure. | Reveal advanced controls or explanatory detail when relevant. | Do not bury required values, validation, recovery or safety warnings. |
| [Coinbase performance help](https://help.coinbase.com/en-ca/coinbase/trading-and-funding/sending-or-receiving-cryptocurrency/my-investment-performance) describes balance → range → detail; [Exchange history help](https://help.coinbase.com/en/exchange/managing-my-account/account-history-and-reports) separates open and filled orders. | Prioritise current position, then source detail; separate committed exposure from realised history. | These are public workflow descriptions, not a verified current UK authenticated product screen. Plum Duff's cash-first semantics govern. |
| [DJList `web/index.html`](https://github.com/wolney8/DJList/blob/5376d0cec713d2b993631553fed9557d104d17f1/web/index.html) has grouped sidebar views/counts, a breadcrumb top bar, search/filter/action rows and paginated table. | Compare navigation grouping and compact task toolbars. | Music-library taxonomy does not transfer directly to financial workflows. |
| [DJList `web/styles.css`](https://github.com/wolney8/DJList/blob/5376d0cec713d2b993631553fed9557d104d17f1/web/styles.css) changes labelled sidebar to icon rail around 1020px and removes it around 520px; toolbar wraps and table columns/actions are hidden at narrow widths. | Test deliberate shell reflow and no crush/overflow. | Hiding a financial column or correction action would conflict with protected information; use an accessible detail/list representation instead. |
| [DJList `web/library-workspace.css`](https://github.com/wolney8/DJList/blob/5376d0cec713d2b993631553fed9557d104d17f1/web/library-workspace.css) reflows five metrics to two, wraps search/controls and keeps actions reachable; [`web/library-tools.css`](https://github.com/wolney8/DJList/blob/5376d0cec713d2b993631553fed9557d104d17f1/web/library-tools.css) collapses a three-column control grid; [`web/activity.css`](https://github.com/wolney8/DJList/blob/5376d0cec713d2b993631553fed9557d104d17f1/web/activity.css) contains background status in a compact panel. | Compare summary density, action wrapping and bounded process feedback. | Reuse ideas, not CSS, dimensions or music-specific structures. Static source inspection does not prove browser behaviour. |

## Proposed shared design direction

- **Shell/page organisation:** clear global destinations; Profile context and route hierarchy
  visible without competing menus; task-level actions near the relevant work. Search should occupy
  space only when useful. Compare current and lab navigation by real task steps.
- **Financial hierarchy:** show current position, completeness and required action first; preserve
  traceable source details and current/projected versus realised distinctions. Unknown never becomes
  zero. Alerts are concise but actionable.
- **Density/reflow:** use consistent typography, spacing and semantic colours without forcing
  dashboards, ledgers and calculators into one layout. Test desktop, tablet, narrow and 200% zoom,
  both themes, keyboard/focus and reduced motion; no page overflow or clipped required actions.
- **Editing/review:** choose inline, drawer, modal or full page by task length and context; keep
  explicit Save/Discard, validation, audit, recovery and Profile authority intact. Progressive
  disclosure applies to auxiliary complexity, not mandatory fields or evidence.
- **States:** loading, no activity, partial known, unavailable, error and dirty state must have
  distinct concise content and deterministic action. Avoid repeated explanatory copy.

## Isolation and first design gate

The lab stays unavailable in normal production, uses synthetic/mocked data, makes no owner
financial write or real provider call, and does not alter normal routes or shared styling. It
must be removable without affecting the normal application. No full replacement app or migration
of current financial data is authorised. Integrating a lab outcome requires separate owner
approval and updated contracts/checks.

**Recommended first working journey, `PROPOSED — LAB ONLY`:** Fund Manager opens the app → sees
current position and the most important actionable task → follows that task to the correct
Profile/Account or open position → returns with Profile/range context intact. This tests the
owner's highest-impact shell/navigation complaint across overview and daily work without
rewriting a ledger. Compare the current and lab routes using task completion, visible financial
meaning, step count, focus/keyboard, responsive/zoom and partial/error states. One coherent
working journey and comparison is the next tranche; no disconnected prototype series.

**Historical CP-110 gate (approved for CP-111 lab only):** approve or revise that first journey before its lab build. A proposed
presentation exception is marked lab-only before experimentation and needs a separate integration
decision after comparison. The brief records direction; it is not approval to build or integrate
the lab. Current authenticated Coinbase UI, actual DJList runtime behaviour,
owner task-time observations and VoiceOver spoken output remain unverified.

## CP-111 first journey decision — 2026-11-01

The owner approved building the first **isolated lab** journey described above, from Fund Manager
position and task to a Profile Account review and back. This does not approve normal integration,
contract changes, owner-data use or a replacement app. The following exceptions are recorded
before lab implementation; each remains `PROPOSED — LAB ONLY`:

| Proposal | Existing rule/purpose and demonstrated problem | Lab replacement and retained behaviour | Affected checks / later owner decision |
| --- | --- | --- | --- |
| Alternative shell and navigation | Current `AppChrome` top bar, drawer and Profile menu give access to global and Profile routes, but place several hierarchies in one journey; owner reports clutter and difficult movement. | One global sidebar/header and one explicit Profile context area, with task action leading to Account detail; all important destinations stay discoverable. Authentication, route identity and Profile isolation remain protected. | Compare task steps, return context, keyboard, 390–desktop and zoom. Owner decides whether any part merits normal integration. |
| Compact financial/action hierarchy | Current dashboard panels preserve source meaning but owner reports excessive panels and explanation. | Put known cash/incompleteness, realised P&L, committed exposure and one actionable task first; reveal source detail on demand. No unknown-to-zero, planned-as-exposure or current-as-realised conversion. | Contract-backed synthetic values and source links; owner evaluates clarity before integration. |
| Neutral Close in Account review | Current UI contract makes `close` red for consistent visibility; owner asked that convention be assessed. | Compare a neutral Close inside this lab Account editor while retaining accessible label, target/focus geometry and the identical unsaved Save/Discard/Keep editing protection. | Dirty navigation, Escape, focus return, mobile containment; owner later decides visual semantics. |
| In-memory simulated review | Normal Account editor saves governed values/audit to the owner database. | Lab Save updates only synthetic in-memory state and is visibly marked simulated; validation, failure recovery and dirty protection remain. No normal API mutation. | Verify no network writes, no persistence after refresh and correct known/unknown distinction. This is an isolation choice, not a proposed normal saving contract. |

**Working lab comparison, owner review pending.** Current source route sequence:
`/` summary → Profile selector → Profile Operations/Accounts → affected Account → return.
Lab sequence: `/design-lab` position → named Account task → synthetic Account source/review →
return with prior Profile and range. These are route steps, not measured owner task time or proof
of superior usability. The lab's header/sidebar adapts Coinbase CDS NavigationBar, Sidebar and
NavigationTitleSelect; compact search and responsive workspace draw on the DJList files cited
above. Unknown cash, committed-only exposure, settled P&L, validation and dirty protection stay
governed.

**Lab verification:** synthetic financial tests, proxy/local-production gate tests and headless
journey checks cover partial cash, explicit zero, Profile/range return, validation, failed save,
dirty Escape/focus, loading/error/empty states, responsive containment at
1440/900/768/430/390, light/dark and a 200% CSS-zoom approximation. Private captures:
`data/private/evidence/cp111-design-lab/`. Actual owner task time, authenticated Coinbase UI,
VoiceOver spoken output, native browser zoom and owner visual acceptance remain unverified.

## CP-112 visual revision — 2026-11-01

CP-111 is functionally verified but **OWNER REJECTED / REVISION REQUIRED** visually. Its source and private captures remain the comparison baseline. The owner reports competing focus rings, native dropdown menus, undersized metadata and an incoherent shell. The following treatments are `PROPOSED — LAB ONLY`; they do not amend normal UI contracts or authorise integration.

| Lab treatment | Current purpose/problem | Replacement and retained safeguard | Reference / acceptance decision |
| --- | --- | --- | --- |
| One composed money-field focus ring | Outer money wrapper and inner input both show focus; this obscures the editing state. | One visible wrapper `:focus-within` ring; input keeps native editing, selection, error and unknown/zero semantics. | [CDS TextInput](https://cds.coinbase.com/components/inputs/TextInput/) labels, sizes and input states. Owner judges visual quality after keyboard/zoom checks. |
| Explicit Profile/Range selection | Native selects preserve keyboard support but opened menus appear platform-default and can overlap nearby controls. | Reuse one accessible lab selection pattern: explicit trigger, selected option, anchored/collision-aware panel, keyboard, Escape, outside dismissal and focus return. No change to Profile or range data authority. | [CDS Select Alpha](https://cds.coinbase.com/components/inputs/SelectAlpha/) single-select and [PopoverPanel](https://cds.coinbase.com/components/overlay/PopoverPanel/) trigger/focus model. Owner judges composition. |
| Coherent shell/type rhythm | CP-111 authored independent control sizes and metadata as small as ~11–12px; owner finds the whole journey visually inconsistent. | One lab type/spacing scale, fewer repeated explanations, clearer context and task hierarchy, responsive grouping. Preserve all financial meaning, source detail, task access and dirty-form protection. | [CDS NavigationBar](https://cds.coinbase.com/components/navigation/NavigationBar/), [Sidebar](https://cds.coinbase.com/components/navigation/Sidebar/), [NavigationTitleSelect](https://cds.coinbase.com/components/navigation/NavigationTitleSelect/), [Text](https://cds.coinbase.com/components/typography/Text/), [Button](https://cds.coinbase.com/components/inputs/Button/) and [IconButton](https://cds.coinbase.com/components/inputs/IconButton/). Owner decides whether the revised first journey merits further lab work. |
| Financial-summary grouping | Three equal CP-111 stat cards give known cash, realised P&L and exposure the same weight and add repeated card chrome. | One grouped position surface makes known cash primary and keeps P&L/exposure visible with their distinct labels and metadata. It stacks as one grouped readout on narrow screens. No calculation or membership changes. | [CDS Text](https://cds.coinbase.com/components/typography/Text/) hierarchy and public [performance workflow](https://help.coinbase.com/en-ca/coinbase/trading-and-funding/sending-or-receiving-cryptocurrency/my-investment-performance). Owner judges clarity; no normal-app integration. |

Current public CDS examples describe interaction and component roles, not a verified authenticated Coinbase product screen. No Coinbase code, CSS, assets or branding is used. CP-112 retains the same synthetic journey and the CP-111 neutral Close proposal with its Save/Discard/Keep editing guard. Owner visual acceptance remains pending.

**CP-112 evidence:** 11 synthetic browser paths pass at 1440/900/768/430/390 in light/dark, with opened Profile/Range lists, one money-field focus ring, keyboard/Tab/Escape/outside dismissal, dirty-range return focus, 44px task target and metadata contrast. A temporary Chromium extension set **actual tab zoom to 200%** (`devicePixelRatio=2`, CSS viewport 720 from physical 1440) and verified contained layout/menu; it was removed after the test. Four lab source/access unit tests, web typecheck, production build and focused source lint pass. Private before/after and opened-state captures: `data/private/evidence/cp111-design-lab/` and `data/private/evidence/cp112-design-lab/`. The CDS PopoverPanel documents an optional mobile modal; this lab retains an anchored panel because its bounded 2–3 options fit at 390px and 200% zoom. Exact Coinbase component dimensions, authenticated product UI, VoiceOver spoken output, owner task time and owner visual acceptance remain unverified.
