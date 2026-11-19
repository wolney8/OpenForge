# Plum Duff Ledger Modal Parity Contract

_Last updated: 2026-08-16_

## CP-117 V2 Sportsbook precedence and open Lab amendment — 2026-11-18

The owner's approved connected Design Lab Sportsbook workbench at `ad51ef215e49f8774e2ad3d291613e678896f462` supersedes the older **modal presentation** clauses below when the V2 flag is on. The approved reference is `design-lab-connected.tsx` `renderBetEntry` with `design-lab-connected.module.css` `.entry`, `.entryTop`, `.entryGrid`, `.entryFields`, `.stepper`, `.calcSummary` and `.entryFooter`. The source blobs are `2ad22d5c` and `af232602`; the approved Lab must not be changed to fit PD. The older modal header, capped body scroll, tick-mark rail, docked footer and Previous/Next presentation remains available only under flag OFF.

For V2 Sportsbook, parity verification must compare the **complete rendered page and shell**, including sidebar, header, breadcrumb, page heading, five numbered stages, fieldsets, outcome card and footer. Equivalent synthetic state, viewport, zoom and theme are required. Assert computed geometry, typography, surfaces and control order; inspect paired images. Matching classes alone cannot close Design Acceptance. The native Save, validation, placement, settlement, correction, audit and Profile permissions remain authoritative. Do not copy Lab fixture calculations or confirmation checkboxes into those commands.

The following is a **proposal, not an approved Lab amendment**. Required production states have no complete approved Lab equivalent and remain open in PD-FIX-613. Proposed review state uses the existing Lab page workbench, not a new modal:

1. **Protected settled/void/cancelled records.** Retain the five numbered stages and approved card geometry. Immediately below the rail, show `Protected record · Settled financial fields remain read-only. Review a correction to change recorded values.` Keep field values legible and read-only. Before correction, the footer contains one `Cancel` (closes the workbench) and `Review Correction` (enters the governed correction editor without writing). During correction, it contains one `Cancel Correction` (abandons only the correction draft and returns to protected review) and `Save Audited Correction` (validates and invokes the existing audited command). Remove the standalone circular X and top-right `EDIT` chip. Decision requested: approve both exact states and footer effects, or specify a different approved Lab state. Consequence: the native settled gate stays in force either way.
2. **Additional required offer and account fields.** The approved `Offer Name` is bound to `offer_name` beside `Bookmaker`; `Offer Type` precedes `Bet Type`. After the Lab's original offer, bookmaker, offer name/type, bet type, fixture type and back-stake fields, place `Additional offer details` as a Lab-style disclosure inside the Offer card. It contains existing event/market, promotion link, combo and account-review controls in the same two-column field grid; the disclosure opens automatically on required-field validation. The former `Campaign tag` label also wrote `offer_name`. No distinct campaign input is proposed until a separate backing field is identified and approved. The owning Profile and Account commands remain unchanged. Decision requested: approve this disclosure/field ordering. Consequence: no required input is removed or made optional.
3. **Recorded requirements and exceptional outcomes.** Replace Lab-only simulated checkboxes with an uneditable `Recorded requirements` summary of genuine source fields, with `Unknown` where evidence is absent. Keep `Outcome Comparison` and its Lab card layout; use governed scenario amounts, honest unavailable values and a `Detailed outcomes` disclosure for multi-lay, boosts and partial matches. Never label a reference stake as an actual requested or placed stake. Decision requested: approve these production extensions to Requirements and Outcome Comparison. Consequence: calculation and placement authorities do not change.
4. **Matching and Placement detail.** Keep the approved two-column Matching input grid and Outcome Comparison aside for fields with equivalent meanings. Below that grid, add a closed `Detailed matching and actual lay evidence` disclosure using the Lab fieldset border, input dimensions and 12px field gap. It contains the existing native hedge calculator, multiple/partial lay branches and externally confirmed placement fields; open it automatically only when the active record or validation requires those fields. In Placement, show a compact `Recorded placement` card before the disclosure, with explicit `Not recorded` values rather than a synthetic completion tick. Decision requested: approve this location and disclosure behaviour. Consequence: existing calculator, placement and audit commands remain unchanged, and the Lab fixture's simplified control set is not treated as financial authority.
5. **Linked rewards and restricted actions.** In Finish / Review, provide `Linked Free Bets` as a secondary disclosure with the existing authorised action; place destructive or rarely used commands under `More actions` in the Lab footer hierarchy. Decision requested: approve these placements; the linked reward and correction commands continue to use their existing Profile-owned authority.

Until the owner decides these points, synthetic functional evidence can establish Integration Acceptance, but the protected and extended screens cannot be marked Design COMPLETE. The private paired Lab/PD renders and the five-amendment `visual-decision-sheet.md` with separate synthetic images belong in the existing CP-117 evidence index; no owner records or private images are committed. These proposals do not modify the approved Lab source or activate new PD controls.

## Status and authority

This contract defines the required add/edit modal pattern for all current and future Plum Duff
ledgers.

It supplements:

- `docs/agent-contracts/plum-duff-ui-accessibility-contract.md`
- `docs/agent-contracts/plum-duff-ui-implementation-checklist.md`
- `docs/agent-contracts/plum-duff-known-ui-pitfalls.md`
- `.skills/plum-duff-ui-consistency-enforcer/SKILL.md`

If a ledger editor differs from this contract, the difference must be justified by a workflow
contract, a financial calculation contract, or a documented accessibility requirement.

## Canonical editor shell

The Sportsbook tabbed editor is the current reference implementation. Free Bets, Casino Offers,
Cash Adjustments and future ledgers must reuse the same structural rules:

- one modal surface only;
- no modal-on-modal workflows;
- background page scrolling is locked while the modal is open;
- header and footer align to the same modal gutter;
- header sits flush with the modal top when sticky;
- body owns the scroll;
- footer remains visible and flush with the modal bottom;
- stepper rail sits in the header flow and must not overlap title, compact chips or navigation;
- no page-level horizontal scroll;
- no clipped focus rings, dropdown arrows, icons, helper pills or action buttons.

## Header

Every ledger modal header uses:

- ledger/action eyebrow, for example `Edit Sportsbook Row`;
- workflow title built from the ledger's primary row identity;
- compact table chips above or parallel to the title, limited to actionable state;
- top-right compact close/cancel control for unsaved add/edit escape where the workflow requires it;
- Previous and Next controls aligned with the matching footer controls.

Compact chips should be short. Do not turn the header into a stat-card strip.

## Stepper rail

Every complex ledger uses the connected M3-style stepper rail:

- completed steps show a tick marker;
- active and next-required steps use distinctive state colour and accessible name;
- locked steps show a lock marker, not a misleading step number;
- notification/action-required dots are dots, not extra step numbers;
- borders remain visible on inactive steps at reduced opacity;
- watermarks, where used, are clipped inside the step pill and must not reduce text contrast.

Guided access must reference the relevant step marker, for example:

`Go to (2) Matching and enter the Lay odds.`

Only the relevant field words should receive semantic highlight, such as `Back`, `Lay`, `Offer
Name`, `Settlement Date` or `Outcome`.

## Guided access

Guided access is required for complex ledgers. It must:

- appear below the stepper rail;
- use rounded Material-style surfaces;
- animate only enough to signal a new instruction;
- route focus to the target tab and field when clicked;
- be user-controllable through profile or user settings;
- remain suitable for later subscriber-facing reduced guidance;
- replace noisy paragraphs and repeated red text.

Do not use loose explanatory copy where guided access, field validation or a concise banner can do
the job.

## Footer and save semantics

Footer controls stay single-purpose:

- `Save` saves current edits and then follows the ledger-specific close/stay rule. While a save is
  in flight, the button shows the shared spinner plus `Saving`, all conflicting destructive,
  revert and close actions are disabled or blocked, and the saved server payload becomes the new
  pristine row state before the modal closes.
- `Revert` undoes unsaved edits for the current row.
- `Delete` uses the shared destructive action treatment.
- `Close` closes without creating extra save semantics.
- settled/read-only rows expose `Edit` through a local section/header lock action, not by changing
  Close into Save.

Previous and Next appear in the footer in the same right-aligned slot as the header controls.

## Calculator and matching parity

All lay-capable ledger calculators use the same Outplayed-inspired Plum Duff calculator system:

- top selection row for bet/calculator type and lay mode;
- back-themed input band;
- lay-themed input band;
- bounded result cards/tables;
- consistent financial value formatting;
- consistent copy action geometry;
- contained tables with no white wrapper borders unless explicitly part of the approved card style.

Different calculator modes may change fields and result cards, but they must not invent unrelated
spacing, colours, table surfaces, icon sizes or action geometry.

## Wide ledger table controls

Wide ledger tables retain their native horizontal scrollbar and expose contained, keyboard-accessible
left/right scroll controls at the visible table edges. Controls are disabled at the respective edge,
use smooth motion only when motion is allowed, and must not obscure row actions or escape the table
viewport. Column resizing and action popovers must remain contained or portalled above the scroll
region so no control is clipped by table overflow.

The calculator system must be reusable outside ledgers for M14 Calculator Workspace. Ledger mode may
add placement side effects such as marking a lay as placed. Standalone mode must not. If a
calculator change cannot run in both modes, the implementation must explain why and add a bridge
adapter rather than forking the visual system.

Sportsbook is the current calculator reference. Free Bets must reuse the same calculator shell for
SNR/SR lay-calculation flows. Casino Offers may reuse shell geometry and financial-value primitives,
but casino wagering/reward calculators are separate because they use casino EV/wagering contracts
rather than lay-placement contracts.

## Lay mode and partial matching decision

Partial matching is a placement state, not a primary lay mode.

Visible lay modes should answer, "Which calculator shape am I using?":

- `No Lay`
- `Standard`
- `Advanced`
- `Multi Lay`

`Advanced` exposes Underlay, Standard, Overlay and Custom result paths inside the calculator.
Copying one of those result paths may persist the corresponding workbook-compatible strategy.

Partial matching should be available inside every lay-capable mode:

- single-lay Standard/Advanced rows expose a partial-match control beside the lay stake or matched
  stake field;
- Custom lay uses the same partial-match control after the custom stake is chosen;
- Multi Lay exposes the same control per outcome branch;
- resetting a partial match restores the calculated target stake and removes the `Part Laid` chip;
- the visible `Part Laid` chip appears only when a placed matched stake is lower than the relevant
  calculated target, not merely because a branch is incomplete.

Legacy and workbook-imported `Partial Lay` rows remain readable. They must load as a standard
single-lay calculator with the partial-match placement state enabled or inferred from actual matched
stake fields. No migration is required.

## Ledger-specific step sets

Sportsbook:

- `Bet Setup`
- `Matching`
- `Settlement`
- optional `Free Bet`

Free Bets:

- `Bet Setup`
- `Matching`
- `Settlement`

Casino Offers:

- `Offer Setup`
- offer-type-driven `Wagering` and/or `Reward`
- `Settlement`
- `Advanced` only when it has relevant audit/manual fields

Cash Adjustments:

- `Adjustment`
- `Posting`
- `Review`

Future ledgers must start from this pattern and document any intentionally different step set.

## Toast and notification policy

Do not show ordinary row-open, field-change or draft-save toasts while an editor modal is open.
Inline feedback belongs inside the modal. Durable tasks and reminders belong in the notification
bell.

## Explicit ledger draft contract

Sportsbook, Free Bet, Extra Place, Casino and Cash Adjustment field edits remain client drafts until
the user explicitly saves. Blur, debounce, step changes and close/unmount must not persist them.
Save is enabled only for a valid dirty draft; Revert restores the last confirmed response without a
write. Closing, record navigation or in-app navigation with a dirty draft uses the shared “You have
unsaved changes” decision: Keep editing, Discard changes, or Save and close. Browser refresh/tab close
uses the native unload warning. Only a confirmed successful save advances the saved baseline; a
failure retains the draft and never closes the editor.

Non-financial draft fields such as Notes must not participate in a calculation-preview identity.
Typing them keeps the confirmed settled value mounted and must not issue preview or persistence
requests. A financial draft may request a proposed recalculation, but it must remain distinct from
the saved settled result.

When the user deliberately opens a collapsible editor section, the shared disclosure reveals the
section heading and first useful control inside `.workflow-editor-body` where the available space
permits. It accounts for the sticky action footer, retains focus on the trigger, uses immediate
positioning for reduced motion, and must not repeat the scroll during typing, rendering or restored
open state.

## Required parity checks

Before handoff, verify:

- modal shell dimensions match the current ledger editor reference;
- header/footer gutters align;
- body scroll is local;
- stepper rail and guided access are present where required;
- equivalent buttons/icons use shared geometry and semantic colours;
- calculator table/card surfaces match across lay modes;
- calculator shell changes have been checked against Sportsbook, Free Bets, Casino where relevant,
  and the future standalone Calculator Workspace reuse path;
- light and dark mode keep contrast and focus visibility;
- route guards use in-app confirmation, not browser confirm, except unavoidable unload fallback.

Regression coverage should include the MVP reference ledger and every migrated ledger in the same
parity suite.

## CP-117 V2 Sportsbook approved-reference boundary

The preceding modal and three-step guidance documents the older ledger editor. For V2 Sportsbook,
the frozen Design Lab workbench at source `ad51ef215e49f8774e2ad3d291613e678896f462`
is the presentation reference: page-flow scrolling, its five visible stage names, Offer field
ordering, Outcome Comparison and footer hierarchy. The older modal remains for flag-OFF rollback.
Native draft, validation, calculation, placement, settlement, correction and audit commands remain
authoritative. The five proposed additions are isolated at
`/design-lab/sportsbook-proposals?amendment=protected|offer|requirements|matching|finish`;
they are synthetic and require individual owner approval before production adoption. The
approved `/design-lab` route must not be changed to match an unapproved proposal.

V2 Outcome Comparison must pair each available signed source amount with its own governed
scenario label. Standard, No Lay (including “Back loses”), Cashback, Double Delight and all
available multi-lay branches may have different outcome counts; do not collapse them into a
generic two-row matrix or recompute values in the presentation. A clean `?record=` report/task
entry must return through the Sportsbook Bets breadcrumb to a query-free ledger URL and stay
there on refresh. Dirty drafts retain the existing Keep editing / Discard guard, and combined
returns retain their local filters.

Whole-editor Design and Interaction Acceptance remain **REJECTED** until the owner decides the
five amendments and the resulting production composition is independently compared with the
approved reference. Proposal screenshots and passing synthetic tests do not grant that approval.
