# Workflow Contract: Material 3 Accessible Ledger and Editor Experience

_Last updated: 2026-07-14_

## Status and scope

- Status: Draft, ready for UX/accessibility review
- Milestone: M15 Platform Experience
- Applies to: tracker shell, ledger tables, filters, dialogs/editors, settings and reports

## User goal

Review dense financial ledgers and complete editor workflows without excessive visual noise, hidden state, keyboard traps, low contrast or unnecessary motion.

## Layout rules

- Use one clear page surface and one primary task surface; avoid repeated bordered boxes inside bordered boxes.
- Group fields by workflow meaning using headings, spacing and tonal surfaces before adding outlines.
- Keep actions close to their object and use one visually dominant primary action per task region.
- Editors use a wide responsive dialog/sheet where appropriate, with a visible title, close action, sticky action area and no obscured focus.
- At 200% zoom, content must remain usable without loss of controls or meaning; horizontal table scrolling may remain where data density requires it.
- Dense tables retain semantic headers, keyboard focus, visible sort/filter state and text alternatives for icon actions.

## Component and interaction rules

- Follow Material 3 component semantics and state layers while preserving Plum Duff's approved palette.
- Controls have visible hover, focus, pressed, disabled and error states in light and dark mode.
- Pointer targets should normally meet a `44–48px` practical target; exceptions require spacing and accessibility review.
- Dialog focus moves to the dialog, remains trapped while open, returns to the invoking control and supports Escape unless destructive confirmation is required.
- Toasts/status messages do not steal focus and are programmatically announced where required.
- Destructive actions require clear naming and confirmation proportional to risk.

## Contrast and density acceptance

- Text: WCAG AA contrast under every semantic pill/issue state in both themes.
- Meaningful control boundaries/focus indicators: at least `3:1` against adjacent colours.
- Information is never conveyed by red/amber/green alone; text or icon labels remain present.
- Avoid shimmer except for genuine indeterminate loading; decorative animation respects reduced motion.
- Borders should communicate grouping or interaction, not decorate every nested region.

## Required review matrix

- light, dark and high-zoom desktop
- narrow viewport
- keyboard-only
- screen-reader names/roles/status messages
- reduced motion
- ledger with no rows, eight rows, filtered rows, issues and hidden columns
- create, edit, settled-lock and unsaved-change flows

## Tests and Playwright path

- modal focus entry/trap/return
- visible keyboard focus and no obscured focused control
- icon buttons have accessible names
- no contrast token below approved threshold
- reduced motion removes non-essential transforms
- status toast is announced once
- ledger filtering/hidden-column state remains understandable without colour
