# Second Import Deterministic Review Regression

Date: 2026-09-04

Scope: remove four repeat review decisions from a fresh Profile dry run without executing the
import or changing Profile data.

| ID | Area | Requested behaviour | Signed-off authority | Status |
|---|---|---|---|---|
| PD-FIX-201 | Account provider resolution | Resolve workbook `BetDragon` to canonical `DragonBet`, retain the source name as import provenance, and do not create a duplicate provider | Account Catalogue plus approved provider-alias pattern | COMPLETE |
| PD-FIX-202 | Historical Void import | Treat terminal Void with an explicit audited zero value as canonical Void evidence, not a discretionary manual override requiring a user reason | Sportsbook Void calculation and import audit contracts | COMPLETE |
| PD-FIX-203 | Historical Extra Places | Route terminal historical EP rows with audited P&L and missing modern calculator inputs to imported-historical EP mode without a repeat decision | Existing imported-historical Extra Places persistence mode | COMPLETE |
| PD-FIX-204 | Review model | Keep deterministic migration rules in the mapping version so a fresh ImportRun does not depend on decisions from an older run | Workbook/import lineage contract | COMPLETE |

The approved implementation boundary excludes import execution and Profile mutation. Raw workbook
bytes and workbook-derived personal or operational values are not committed.

Focused API regressions and the retained private read-only workbook oracle pass the deterministic
mapping gate. The exact September workbook remains a hosted re-upload gate because uploaded raw
bytes are intentionally not retained.
