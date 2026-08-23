# Plum Duff Ledger Modal Parity Contract

_Last updated: 2026-08-16_

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
