# Selected Range Performance async UX

Date: 2026-09-04

Scope: Tranche 2 only. Export and restore work remains explicitly out of scope.

## Corrective batch

| ID | Area | Requested behaviour | Signed-off equivalent | Status |
| --- | --- | --- | --- | --- |
| PD-FIX-225 | Selected Range Performance | Reflect the requested range immediately, localise the pending state to the card, and never label a stale figure as the requested range | `LedgerLoadingIndicator` inside a stable positioned reporting surface | COMPLETE |
| PD-FIX-226 | Range mutation | Permit one settings mutation at a time, disable conflicting controls, commit the recalculated range on success, and restore the previous range with a local error on failure | Existing tracker-settings persistence client plus synchronous mutation guard | COMPLETE |
| PD-FIX-227 | Accessibility and responsive consistency | Preserve keyboard operation, card geometry, `aria-busy`, theme behaviour, narrow-layout containment, and reduced-motion support | Dashboard period pills, visual card shell, shared loading primitive and design tokens | COMPLETE |
| PD-FIX-228 | Regression coverage | Prove local loading, stale-value suppression, request de-duplication, rollback-on-error, keyboard use, theme parity, and narrow viewport geometry | Existing dashboard Playwright route and tracker settings client tests | COMPLETE |

## Reuse inventory

- Card shell: `.dashboard-visual-card.dashboard-performance-card`.
- Range controls: `.dashboard-period-control` and `.dashboard-period-pill`.
- Local progress: `LedgerLoadingIndicator` and `.material-linear-progress`.
- Financial output: `FinancialValue`.
- Error treatment: `.error-text` with an assertive status role at the affected surface.
- Responsive shell: existing dashboard breakpoints at 900px and 760px.

No new visual variant, financial calculation, persistence contract, or server endpoint is introduced.

## Verification

- Light and dark theme loading states use the shared progress primitive and semantic tokens.
- The ready and pending card bounds match at desktop and 390px viewport width.
- The narrow page has no horizontal overflow.
- Enter activates the range button; every competing range control is disabled while pending.
- A programmatic duplicate submission produces no second PUT.
- Failed persistence restores the committed shortcut and value surface and announces a local error.
- Reduced-motion preference uses the shared slower progress treatment.
