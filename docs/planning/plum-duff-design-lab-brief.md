# Plum Duff Design Lab — initial baseline brief

**Status:** owner-provided direction recorded 2026-11-01; first lab journey awaits separate owner approval. This is the **initial** Design Lab brief. No earlier repository brief or approval history is claimed. Provenance: the owner's CP-110 kickoff and subsequent clarification in the current conversation, reconciled with existing Plum Duff contracts and requests. [CP-110 scenario matrix](../audits/platform-quality-audit.md#linked-scenario-coverage) · [canonical request register](plum-duff-next-issue-tracking-register.md#cp-110-fund-manager-design-lab-discovery--2026-11-01).

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

**Owner review required:** approve or revise that first journey before its lab build. A proposed
presentation exception is marked lab-only before experimentation and needs a separate integration
decision after comparison. The brief records direction; it is not approval to build or integrate
the lab. Current authenticated Coinbase UI, actual DJList runtime behaviour,
owner task-time observations and VoiceOver spoken output remain unverified.
