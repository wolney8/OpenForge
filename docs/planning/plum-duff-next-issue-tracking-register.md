# Plum Duff Next Issue Tracking Register

_Last updated: 2026-08-26_

## Purpose

Record the next high-value GitHub issues, milestones, contracts and fixture references while live
authenticated GitHub mutation access is unavailable in this Codex environment.

Use the GitHub verification fallback in `AGENTS.md`: browser access can verify public issue state,
but authenticated issue mutation must remain pending until a secure client is available.

## Coverage matrix

| Area | Recommended milestone | Local contract evidence | Fixture evidence | GitHub state |
|---|---|---|---|---|
| Ledger modal parity and guided access | M15 Platform Experience | `docs/agent-contracts/plum-duff-ledger-modal-parity-contract.md`, `docs/workflows/guided-entry-focus-workflow-contract.md` | `tests/fixtures/guided-entry-focus-fixtures.json`, modal Playwright specs | #61 implementation, automated checks and Fund Manager smoke test passed 2026-08-23; public issue remains open pending authenticated closure |
| Notification consistency | M15 Platform Experience | `docs/workflows/fund-manager-notification-centre-workflow-contract.md` | `tests/fixtures/fund-manager-notification-centre-fixtures.json` | Fund Manager source timing, preferences, action routing and security-tag filtering merged in `865807e` on 2026-08-23. Re-audited 2026-08-27: API (3), unit (13) and focused Playwright (4) checks pass. Current sources are `fund_manager_only`; subscriber delivery needs a separate authenticated issue with server-enforced sessions. Live public GitHub checked 2026-08-26: no dedicated issue; #39 only mentions notifications within Sequential Lay. Pending authenticated issue sync only; do not create a duplicate. |
| Full financial report review | M7 Reporting and Import/Export, M10 Fee Visibility | `docs/contracts/cross-profile-reporting-contract.md`, `docs/contracts/dashboard-selected-range-pnl-contract.md`, `docs/contracts/retained-profit-reporting-contract.md`, `docs/contracts/fund-manager-fee-calculation-and-withdrawal-contract.md` | reporting and fee fixture packs under `tests/fixtures/` | Needs issue verification |
| Standalone calculator workspace | M14 Calculator Workspace | `docs/workflows/calculator-workspace-ledger-bridge-workflow-contract.md`, sportsbook/free-bet/casino calculation contracts | `tests/fixtures/calculator-workspace-ledger-bridge-fixtures.json`, calculator fixture packs | Needs issue verification |
| Subscriber registration and funding review | M9 Subscriber Access | `docs/contracts/subscriber-registration-and-funding-review-contract.md` | `tests/fixtures/subscriber-registration-and-funding-review-fixtures.json` | Needs issue verification |
| Subscriber account self-management | M9 Subscriber Access | `docs/workflows/subscriber-access-and-visibility-workflow-contract.md`, `docs/contracts/subscriber-fee-aware-earnings-contract.md` | `docs/fixture-specs/subscriber-access-control-fixture-spec.md`, `docs/fixture-specs/subscriber-fee-aware-earnings-fixture-spec.md` | Needs issue verification |
| Platform billing and Fund Manager finance | M10 Fee Visibility or later Billing milestone | `docs/contracts/fund-manager-platform-finance-contract.md` | `tests/fixtures/fund-manager-platform-finance-fixtures.json` | Needs issue verification |
| Fund Manager OAuth and account self-management | M5 Login Profiles Tracker Shell | `docs/contracts/fund-manager-authentication-contract.md` | `tests/fixtures/fund-manager-authentication-fixtures.json` | Existing M5 issue noted as #62 in readiness doc; verify |
| Neon cutover and local-first backup hardening | M5 Login Profiles Tracker Shell or deployment milestone | `docs/contracts/local-database-cloud-backup-contract.md`, `docs/fund-managers/neon-local-first-cutover-and-recovery.md`, `docs/deployment/vercel-neon-dev-target.md`, `docs/deployment/neon-runtime-tranche-01.md` | `tests/fixtures/local-database-cloud-backup-fixtures.json` | User-created later issue; verify |
| Public offer source ingestion | Future sourcing/intelligence milestone | `docs/contracts/public-offer-source-ingestion-contract.md` | `docs/fixture-specs/public-offer-source-ingestion-fixture-spec.md` | Needs issue verification |
| Profit Boost workflow parity | M14 Calculator Workspace or sportsbook enhancement milestone | `docs/contracts/sportsbook-profit-boost-contract.md`, `docs/calculation-contracts/sportsbook-profit-boost-calculation-contract.md` | `docs/fixture-specs/sportsbook-profit-boost-fixture-spec.md` | Needs issue verification |
| Multi-fixture, outright and long-duration sportsbook workflow | M14 Calculator Workspace or later sportsbook expansion | `docs/workflows/sportsbook-multi-fixture-and-outright-workflow-contract.md` | `docs/fixture-specs/sportsbook-multi-fixture-and-outright-fixture-spec.md` | Needs issue verification |
| Account quick popup and bookmaker hygiene | M6 Account Intelligence or future account-management milestone | `docs/workflows/account-quick-popup-workflow-contract.md`, `docs/contracts/account-health-intelligence-contract.md` | `docs/fixture-specs/account-quick-popup-fixture-spec.md` | Needs issue verification |
| In-app route guards and unsaved-state handling | M15 Platform Experience | `docs/workflows/in-app-route-guard-and-unsaved-state-workflow-contract.md` | `docs/fixture-specs/in-app-route-guard-and-unsaved-state-fixture-spec.md` | Needs issue verification |
| Template-driven ledger Quick Add | M13 Common Bet Combos, M15 Platform Experience | `docs/workflows/ledger-quick-add-workflow-contract.md`, `docs/workflows/casino-offer-workflow-contract.md` | `docs/fixture-specs/ledger-quick-add-fixture-spec.md` | Live public GitHub checked 2026-08-23: no dedicated issue found. Pending authenticated issue sync; do not duplicate if the user has since created one. |

## Recommended issue bodies

### Template-driven ledger Quick Add

Title:

`Add Template-Driven Ledger Quick Add Starting With Casino Free Spins`

Milestone:

`M13 Common Bet Combos` with `M15 Platform Experience` UX dependency

Body:

```md
## Objective

Add a compact, template-driven quick-add path beside ledger Add Row actions, starting with a
no-deposit Casino Free Spins record.

## Scope

- Add a Quick Add entry beside Casino Offers Add Row.
- Free Spins template: profile-valid bookmaker, optional offer/game, spin count, spin stake and
  confirmed converted win amount.
- Persist the confirmed converted win as the explicit Casino final net result for this zero-own-
  cash template.
- Provide a no-return `£ 0.00` shortcut and a More details path into the normal editor.
- Reuse Common Bet Combos as the Fund Manager-owned template authority; do not add a second
  template store.
- Define later candidate templates without implementing uncontracted casino EV/wager logic.

## Exclusions

- No wagering, RTP, EV, cashback, refund or deposit-bonus calculation changes.
- No bookmaker automation or account creation.

## Contract and fixtures

- `docs/workflows/ledger-quick-add-workflow-contract.md`
- `docs/fixture-specs/ledger-quick-add-fixture-spec.md`
- `docs/contracts/casino-offer-resolved-value-contract.md`

## Acceptance criteria

- Quick Add uses profile account authorities and preserves normal ledger persistence.
- Converted win is visibly confirmed before save and produces the expected resolved value.
- More details pre-fills but does not save.
- Save/loading/error/keyboard/dialog geometry follow the ledger modal parity contract.
- Focused unit and Playwright tests cover valid, zero and invalid paths.
```

### Notification consistency and preferences

Title:

`Standardise Fund Manager Notifications, Preferences and Action Routing`

Milestone:

`M15 Platform Experience`

Body:

```md
## Objective

Make Fund Manager notifications behave like a consistent web-app notification system across all
routes.

## Scope

- Review all current notification triggers.
- Confirm timings for reminder stages: created, due day, 4 hours before, 2 hours before.
- Ensure notifications use consistent card templates, context copy, unread dots, done/new states and
  profile-scoped links.
- Add Fund Manager settings for enabling/disabling individual notification sources.
- Ensure task notifications route to the correct profile, ledger, row and filtered context.
- Ensure notification read/done/clear behaviour matches the contract.

## Contract and fixtures

- `docs/workflows/fund-manager-notification-centre-workflow-contract.md`
- `docs/fixture-specs/fund-manager-notification-centre-fixture-spec.md`
- `tests/fixtures/fund-manager-notification-centre-fixtures.json`

## Acceptance criteria

- Notifications are available from the top bar on all Fund Manager routes.
- Reminder threshold behaviour does not duplicate notification cards.
- Read notifications keep the active bell without a red badge.
- Done tasks remain in Done until their related lifecycle cutoff.
- Preferences hide disabled notification sources without mutating source ledger data.
- Playwright coverage confirms routing, unread badge, Done/New toggle, preferences and viewport fit.
```

### Role-scoped notification security and subscriber delivery

Title:

`Deliver Role-Scoped Notifications to Subscriber Profiles`

Milestone:

`M9 Subscriber Access`

Body:

```md
## Objective

Add subscriber-safe notifications without exposing Fund Manager operational work or another
profile's records.

## Scope

- Add authenticated subscriber notification delivery scoped to the signed-in profile only.
- Enforce `audience` and `security_tag` server-side for every notification source.
- Permit a subscriber item only when it is `subscriber_allowed` and belongs to that profile.
- Add subscriber notification preferences separate from Fund Manager preferences.
- Define subscriber-safe source copy and links; Fund Manager-only tasks such as backup and
  partial-lay management remain excluded.

## Contract and fixtures

- `docs/workflows/fund-manager-notification-centre-workflow-contract.md`
- `docs/fixture-specs/fund-manager-notification-centre-fixture-spec.md`
- `tests/fixtures/fund-manager-notification-centre-fixtures.json`

## Acceptance criteria

- Cross-profile and Fund Manager-only notifications cannot be returned by any subscriber endpoint.
- Server-side authorization is tested; client filtering is not the authorization mechanism.
- Subscriber preferences do not affect Fund Manager notifications or source ledger data.
- Notification templates disclose only subscriber-approved fields.
```

### Full financial reports review

Title:

`Audit Financial Reporting Values Across Dashboards, Reports and Profile Summaries`

Milestone:

`M7 Reporting and Import/Export`

Body:

```md
## Objective

Perform a full financial review so dashboard, ledger stat cards, top-bar summaries, formal reports
and profile summaries use the same date-range and cash-first source logic.

## Scope

- Verify selected-range P&L, resolved value, current value, final value, liability, account cash,
  retained profit and fee fields.
- Confirm when date ranges affect displayed rows versus all-date issue views.
- Ensure profile summary values match the same ledger summary engine.
- Reconcile weekly, monthly and yearly reports with the same row inclusion rules.
- Document any intentional difference between tracker dashboard values and formal reports.

## Contract and fixtures

- `docs/contracts/cross-profile-reporting-contract.md`
- `docs/contracts/dashboard-selected-range-pnl-contract.md`
- `docs/contracts/retained-profit-reporting-contract.md`
- `docs/contracts/fund-manager-fee-calculation-and-withdrawal-contract.md`
- relevant reporting fixtures in `tests/fixtures/`

## Acceptance criteria

- Changing tracker range updates ledger stat cards, profile dashboard, top bar and reports consistently.
- Report totals reconcile to deterministic fixtures.
- Issue-filter views clearly show when they are all-date operational views.
- No user-visible financial value exists without a contract-backed source and test.
```

### Standalone calculator workspace

Title:

`Build Standalone Calculator Workspace From Ledger Calculator Components`

Milestone:

`M14 Calculator Workspace`

Body:

```md
## Objective

Expose Plum Duff calculators outside ledger edit modals while reusing the same contract-backed
calculator components.

## Scope

- Add standalone calculators for Standard, Underlay, Overlay, Custom Lay and Multi Lay.
- Add Profit Boost modes for percentage boost and displayed boosted odds.
- Reuse ledger calculator formula helpers and financial formatting.
- Add bridge actions that can create draft sportsbook/free-bet rows only after required profile and
  account context is supplied.
- Keep specialist calculators such as Extra Places, Each Way, 2UP, Sequential Lay and Accumulator
  behind their own contract gates.

## Contract and fixtures

- `docs/workflows/calculator-workspace-ledger-bridge-workflow-contract.md`
- `docs/fixture-specs/calculator-workspace-ledger-bridge-fixture-spec.md`
- `tests/fixtures/calculator-workspace-ledger-bridge-fixtures.json`
- `docs/calculation-contracts/sportsbook-profit-boost-calculation-contract.md`
- sportsbook/free-bet current-value fixture packs

## Acceptance criteria

- Standalone outputs match ledger calculator outputs for the same inputs.
- Calculator workspace cannot silently place bets.
- Bridge creates drafts only and preserves profile/account validation.
- All financial outputs use Plum Duff accounting formatting and colour rules.
```

### Subscriber registration and funding review

Title:

`Implement Subscriber Registration, Document Review and Funding Request Workflow`

Milestone:

`M9 Subscriber Access`

Body:

```md
## Objective

Allow prospective subscribers to submit registration information for Fund Manager review without
creating active profiles automatically.

## Scope

- Add registration form and Fund Manager review queue.
- Capture demographics, contact details, safe document metadata and self-funding amount.
- Support optional Fund-Manager-provided float request as a checkbox and requested amount.
- Keep funding approval, recovery policy and profile activation Fund Manager-controlled.
- Keep uploaded document storage private and out of public assets.

## Contract and fixtures

- `docs/contracts/subscriber-registration-and-funding-review-contract.md`
- `docs/fixture-specs/subscriber-registration-and-funding-review-fixture-spec.md`
- `tests/fixtures/subscriber-registration-and-funding-review-fixtures.json`

## Acceptance criteria

- Subscriber cannot self-activate a profile.
- Fund Manager can approve, decline or request more information.
- Funding model is explicit and auditable.
- Document fixtures contain metadata only, never raw files.
```

### Subscriber account self-management

Title:

`Add Subscriber Account Self-Management and Visibility Controls`

Milestone:

`M9 Subscriber Access`

Body:

```md
## Objective

Prepare subscriber-facing account areas without exposing Fund Manager-only analytics, fees,
platform finance or cross-profile data.

## Scope

- Define subscriber account settings, profile visibility and self-service boundaries.
- Allow subscriber-safe updates only where contract-approved.
- Add visibility controls for reports, fees, notifications and profile details.
- Keep Fund Manager-only fields default hidden.

## Contract and fixtures

- `docs/workflows/subscriber-access-and-visibility-workflow-contract.md`
- `docs/contracts/subscriber-fee-aware-earnings-contract.md`
- `docs/fixture-specs/subscriber-access-control-fixture-spec.md`
- `docs/fixture-specs/subscriber-fee-aware-earnings-fixture-spec.md`

## Acceptance criteria

- Subscriber routes are profile-scoped and default-deny cross-profile data.
- Subscriber-visible earnings are fee-aware where applicable.
- Fund Manager-only notes, platform finance and internal controls remain hidden.
```

### Platform billing and Fund Manager finance

Title:

`Implement Fund Manager Platform Finance and Billing Records`

Milestone:

`M10 Fee Visibility` or new `Platform Billing`

Body:

```md
## Objective

Track platform-level billing and finance without changing profile tracker P&L.

## Scope

- Add Fund Manager-only platform finance records.
- Support subscription payments, discounts, refunds, chargebacks, processor fees, owner drawings,
  owner contributions, expenses and reconciliation states.
- Keep platform finance separate from profile cash-first tracker values.
- Defer live payment-provider integration until provider and security policy are approved.

## Contract and fixtures

- `docs/contracts/fund-manager-platform-finance-contract.md`
- `docs/fixture-specs/fund-manager-platform-finance-fixture-spec.md`
- `tests/fixtures/fund-manager-platform-finance-fixtures.json`

## Acceptance criteria

- Platform finance entries do not alter sportsbook, free-bet, casino or cash-adjustment P&L.
- Subscriber cannot access platform finance.
- Refunds, chargebacks and corrections are audited.
- Annual subscriptions support deferred recognition.
```

### Fund Manager OAuth and self-management

Title:

`Add Optional Fund Manager Google OAuth and Account Self-Management`

Milestone:

`M5 Login Profiles Tracker Shell`

Body:

```md
## Objective

Add optional Google OIDC login and basic Fund Manager account self-management while preserving
local-first recovery login.

## Scope

- Add optional Google OIDC sign-in for linked Fund Manager identities.
- Keep local login available as the recovery path.
- Add account self-management for name, email display, linked identity status and logout.
- Do not add public sign-up in this issue.

## Contract and fixtures

- `docs/contracts/fund-manager-authentication-contract.md`
- `docs/fixture-specs/fund-manager-authentication-fixture-spec.md`
- `tests/fixtures/fund-manager-authentication-fixtures.json`

## Acceptance criteria

- Unlinked Google identity is denied.
- Local login remains usable when Google is unavailable.
- Logout clears the Plum Duff session.
- Tests use a stub OIDC provider, not live Google.
```

## Additional draft issues from the 2026-08-20 outage handover

These are intentionally deferred unless another task explicitly reprioritises them.

### Extra Places ledger and calculator

Title:

`Implement Each Way / Extra Places Ledger, Calculator and Settlement Workflow`

Milestone:

`M14 Calculator Workspace` or future advanced sportsbook milestone

Body:

```md
## Objective

Add a dedicated Each Way / Extra Places ledger flow, calculator and settlement vocabulary.

## Scope

- Implemented on `feature/casino-quick-add` on 2026-08-24: profile-scoped API, SQLite persistence,
  three-step ledger editor, calculation engine and deterministic MBB/EP Catcher fixtures.
- Remaining: account-authority defaults, historical importer mapping, authentication-gated hosted
  persistence and a dedicated standalone calculator workspace. Selected-range reporting, dashboards,
  formal reports, bookmaker breakdowns and cross-profile reporting were integrated on 2026-08-24.

## Contract and fixtures

- `docs/contracts/each-way-extra-place-ledger-contract.md`
- `tests/fixtures/each-way-extra-place-fixtures.json`

## Acceptance criteria

- The ledger/editor follows the established modal system and requires a later parity smoke test.
- Current value and settlement branches match deterministic fixtures.
- Each Way and Extra Place use one cash-first calculation engine.
```

### Sportsbook multi-fixture, outright and long-duration offers

Title:

`Support Multi-Fixture, Outright and Long-Duration Sportsbook Offers`

Milestone:

`M14 Calculator Workspace` or future sportsbook expansion milestone

Body:

```md
## Objective

Track sportsbook offers that span multiple fixtures, outright markets or uncertain end dates
without forcing them into single-fixture assumptions.

## Scope

- Add setup support for multi-fixture, outright and tournament-long offers.
- Support start date plus estimated finish where a single settle datetime is not yet known.
- Preserve overdue/unsettled operational visibility when a bookmaker delays settlement.
- Support free-bet urgency for same-day festival chains where a returned or voided free bet must be
  reused quickly.

## Contract requirement

Contract and fixtures now exist:

- `docs/workflows/sportsbook-multi-fixture-and-outright-workflow-contract.md`
- `docs/fixture-specs/sportsbook-multi-fixture-and-outright-fixture-spec.md`

Follow-up implementation still needs:

- row setup shape wired into the editor
- current-value rules while long-duration exposure remains open
- settlement and void/returned branches
- overdue and reminder behaviour
```

### Profile account quick-management popup

Title:

`Add Profile Account Quick-Management Popup and Bookmaker Reconciliation Workflow`

Milestone:

`M6 Account Intelligence` or future account-management milestone

Body:

```md
## Objective

Let the Fund Manager inspect and update a profile-specific bookmaker/exchange account from the
ledger context without leaving the workflow.

## Scope

- Open an account quick panel from bookmaker references in ledgers and row modals.
- Show current balance, promo status, support/live-chat status, bet counts and offer counts for the
  selected range.
- Allow fast balance confirmation/update and account-status edits.
- Add a related quick-settle path for multiple overdue rows from the same bookmaker.

## Contract requirement

Contract and fixture coverage now exists:

- `docs/workflows/account-quick-popup-workflow-contract.md`
- `docs/fixture-specs/account-quick-popup-fixture-spec.md`

Implementation still needs:

- safe editable fields wired into the popup
- balance adjustment rules
- profile isolation checks
- quick-settle action boundaries
```

### Fund Manager decision-support task deck

Title:

`Add Fund Manager Decision-Support Task Deck for Recurring Operational Work`

Milestone:

`M12 Target Decision Engine`

Body:

```md
## Objective

Surface recurring matched-betting operational tasks for the Fund Manager based on profile history,
seasonality and current ledger state.

## Scope

- Suggest daily and weekly operational tasks such as balance confirmation, expiry checks, reload
  review and account-health follow-up.
- Keep all suggestions advisory only.
- Integrate with reminders and notification routing where contract-approved.

## Contract requirement

No implementation until an explicit decision-support contract defines:
- allowed signals
- recommendation boundaries
- no-autonomy guarantees
- notification and task presentation rules
```

### Public offer ingestion and Discord sources

Title:

`Expand Public Offer Source Ingestion for Reload Sites and Discord Feeds`

Milestone:

`Future sourcing/intelligence milestone`

Body:

```md
## Objective

Expand the approved source-ingestion system so Plum Duff can safely catalogue public reload/welcome
offers and optional community feed inputs.

## Scope

- Extend approved source ingestion beyond the initial public-offer contract.
- Consider Oddschecker reload/welcome pages and Discord feed intake only after source, legal and
  operational approval.
- Tag related risk-team/group relationships for bookmaker families without exposing unsafe scraping.

## Contract and fixtures

- `docs/contracts/public-offer-source-ingestion-contract.md`
- `docs/fixture-specs/public-offer-source-ingestion-fixture-spec.md`
- `docs/workflows/public-offer-source-ingestion-addendum.md`
- `docs/fixture-specs/public-offer-source-ingestion-addendum-fixture-spec.md`

## Acceptance criteria

- No live source is consumed without an approved ingestion contract.
- Source records retain provenance, freshness and manual-review state.
- Discord or community feed intake remains advisory and non-autonomous.
```
