# Import v7 Void and Analysis Progress Correction

Date: 2026-09-04

Scope: correct imported historical Free Bet Void ordering and make workbook-analysis progress
reflect persisted server work stages without executing an import or mutating Profile data.

| ID | Area | Requested behaviour | Signed-off equivalent | Status |
|---|---|---|---|---|
| PD-FIX-213 | Free Bet historical Void | Normalise a terminal/not-open Void with audited zero before generic manual-override validation | Free Bet Void calculation contract plus Sportsbook imported-historical boundary | COMPLETE |
| PD-FIX-214 | Import regression fixture | Exercise the complete Free Bet row shape, retained matching evidence and genuine non-zero override rejection | Existing synthetic Free Bet import fixture set | COMPLETE |
| PD-FIX-215 | Analysis progress | Persist actual Account, ledger, historical-validation and plan-building stages | Existing import workflow stepper and persisted job status | COMPLETE |
| PD-FIX-216 | Analysis polling | Permit at most one workspace status request at a time and distinguish polling from work progress | Existing bounded import execution monitor | COMPLETE |
| PD-FIX-217 | Regression coverage | Prove honest stage progress, bounded request behaviour and zero import requests | Existing Import Review Playwright path | COMPLETE |

## Constraints

- Preserve generic manual-override reason validation for every genuine discretionary override.
- Preserve financial reconciliation, Account lifecycle/restriction mapping, historical Extra Place
  handling, provider aliases and attempt-scoped recovery.
- Fixtures use anonymised identities while retaining the complete defect-triggering field shape.
- Do not execute an import or alter the hosted Profile's review state during implementation.

## Persisted analysis work units

The analysis job records nine coarse units: prepare workbook, resolve Accounts/providers, map
Sportsbook, map Free Bets, map Casino Offers, map Cash Adjustments, validate historical records,
build the dry-run plan, and save the plan/review. A unit advances only when the prior server step
has completed; browser polls are not counted as work.

The workspace performs one deduplicated initial load of the review plus Account Catalogue. While
analysis remains active it then issues one review-status request at a time, scheduling the next
request 1.5 seconds after the prior response completes. Approval retains its separate 750 ms
serial cadence. The delayed-response browser regression observed three workspace reads and one
catalogue read, with maximum workspace concurrency of one.

## UI/accessibility verification

The active-stage treatment reuses the signed-off Import Review content panel, status chip and
progress primitive; no new visual variant or CSS override was introduced. The progressbar exposes
the persisted completed and total work units, the stage label remains live text, mutation controls
retain their established disabled state, and the focused Playwright path verifies narrow viewport,
light/dark themes and absence of page-level horizontal overflow.
