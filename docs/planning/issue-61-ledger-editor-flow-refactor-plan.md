# Issue 61 Ledger Editor Flow Refactor Plan

Status: planned after immediate validation-banner geometry fix.

## Decision

Use a tabbed modal editor as the primary add/edit workflow for complex ledger rows. Keep inline row
editing as a later, limited quick-edit path for safe fields only.

This avoids forcing sportsbook, free-bet and casino calculation workflows into a cramped table row
while still reducing the current nested-panel noise inside the modal.

## Why Not Full Inline Creation First

- Sportsbook rows can require calculator inputs, placement state, partial-lay legs, multi-lay
  outcomes, reminders, settlement, advanced workbook controls and validation.
- Free-bet rows can require award splitting, expiry state, retention mode, bridge defaults and
  settlement.
- Casino rows need a different model again: qualification, reward, spin planning and net result.
- Inline creation is useful for quick changes, but it is not a safe first-class replacement for
  workbook-parity row creation.

## Target Modal Shape

- One bounded platform modal.
- Fixed header with row title, status, accessible close action and no duplicate copy.
- Fixed tab rail directly under the header.
- Scrollable tab body.
- Sticky footer with `Save`, `Revert` and `Close`.
- Save button shows progress while saving and is disabled until meaningful changes exist.
- Browser/system confirm dialogs are not used except unavoidable `beforeunload`.

## Shared Tab Rules

- Tabs are real buttons with accessible names and `aria-selected`.
- Incomplete required tabs show a red count badge and gentle validation glow.
- Warning-only tabs use amber treatment.
- Complete tabs use neutral styling.
- Tab content uses one surface depth, not nested bordered boxes inside bordered boxes.
- Validation banners are rounded, dismissible and aligned with the shared destructive close icon.
- Required-field errors are shown as a banner plus field-level state; never as loose red paragraph
  text.

## Ledger Tab Sets

Sportsbook Bets:
- Setup
- Matching
- Placement
- Settlement
- Advanced

Free Bets:
- Setup
- Award and Expiry
- Matching
- Settlement
- Advanced

Casino Offers:
- Setup
- Qualification
- Reward and Spin Plan
- Settlement
- Advanced

Cash Adjustments:
- Details
- Posting
- Advanced

## Inline Quick-Edit Later

Inline row editing can be added after the tabbed modal shell is stable for:
- status/result/outcome actions;
- reminder actions;
- settlement date edits;
- delete/archive;
- copy-to-free-bet actions;
- small account/status updates.

Inline editing must not become the default place for complex calculator or placement logic until it
has its own contract and tests.

## Visual Consistency Requirements

- Use shared platform fields for every input/select/date control.
- Dropdown arrows must retain padding and not touch edges.
- Focus rings must not be clipped by neighbouring fields, table cells or section borders.
- Destructive actions use the shared red trash or red close treatment.
- Icon-only controls have circular targets, centred Material Symbols and contextual accessible
  names.
- Banners use rounded tokens and do not introduce sharp rectangular edges.
- Headings and subheadings have consistent gutters from borders and content.
- No tab, card, field or button may create page-level horizontal scroll.

## Rollout

1. Immediate shared CSS fix for validation banner geometry and close controls.
2. Add shared `LedgerEditorTabs` primitive and Playwright geometry assertions.
3. Move Sportsbook Bets editor into the tabbed shell first.
4. Mirror the shell into Free Bets, Casino Offers and Cash Adjustments.
5. Add inline quick-edit row actions only after the tabbed shell is signed off.

## Tests Required

- Unit tests for tab validation state mapping.
- Playwright tests for sportsbook tab navigation, validation badge state, no modal overflow and
  save button state.
- Cross-ledger Playwright parity test for close icon geometry, banner radius, heading spacing and
  focus-ring visibility.
- Light mode, dark mode and reduced viewport checks.

