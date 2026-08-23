# GitHub Coverage Audit - 2026-08-21

## Purpose

Record the current alignment between live GitHub issue tracking, local planning notes, workflow
contracts, calculation contracts and fixture specs.

This note is intentionally short. It is a routing aid so future work can see which areas are fully
backed, partially backed or still need first-class contract coverage.

## Strongly covered

- Issue `#61` ledger modal parity and guided access:
  - `docs/agent-contracts/plum-duff-ledger-modal-parity-contract.md`
  - `docs/workflows/guided-entry-focus-workflow-contract.md`
  - `docs/workflows/material-accessible-ledger-editor-workflow-contract.md`
  - `docs/fixture-specs/guided-entry-focus-fixture-spec.md`
  - `docs/fixture-specs/material-accessible-ledger-editor-fixture-spec.md`
  - modal Playwright coverage under `tests/e2e/`

- Notifications consistency and top-bar notification centre:
  - `docs/workflows/fund-manager-notification-centre-workflow-contract.md`
  - `docs/workflows/free-bet-follow-up-reminder-workflow-contract.md`
  - `docs/workflows/partial-lay-follow-up-workflow-contract.md`
  - `docs/fixture-specs/fund-manager-notification-centre-fixture-spec.md`
  - `docs/fixture-specs/free-bet-follow-up-reminder-fixture-spec.md`
  - `tests/fixtures/fund-manager-notification-centre-fixtures.json`

- Casino offer modal and wagering/EV tranche:
  - `docs/workflows/casino-offer-workflow-contract.md`
  - `docs/contracts/casino-offer-resolved-value-contract.md`
  - `docs/contracts/casino-offer-wagering-ev-contract.md`
  - `docs/fixture-specs/casino-offer-import-field-map-fixture-spec.md`
  - `docs/fixture-specs/casino-offer-import-reconciliation-fixture-spec.md`
  - realistic smoke rows in `tests/fixtures/casino-offer-realistic-smoke-rows.json`

- Extra Places groundwork:
  - `docs/contracts/extra-places-contract.md`
  - `docs/contracts/sportsbook-extra-places-current-value-contract.md`
  - `docs/fixture-specs/extra-places-fixture-spec.md`
  - discovery notes in `docs/planning/account-extra-places-fund-manager-discovery.md`

- Subscriber registration, funding review and subscriber mug-bet participation:
  - `docs/contracts/subscriber-registration-and-funding-review-contract.md`
  - `docs/contracts/subscriber-mug-bet-participation-contract.md`
  - `docs/contracts/subscriber-fee-aware-earnings-contract.md`
  - subscriber fixture specs under `docs/fixture-specs/`

- Public offer source ingestion baseline:
  - `docs/contracts/public-offer-source-ingestion-contract.md`
  - `docs/fixture-specs/public-offer-source-ingestion-fixture-spec.md`

## Partial coverage that still needs first-class workflow backing

- Profit Boost full workspace and ledger parity:
  - current backing exists in `docs/calculation-contracts/sportsbook-profit-boost-calculation-contract.md`
  - this is useful, but it is not yet normalized into the main `docs/contracts/` plus
    `docs/fixture-specs/` structure used by the newer work
  - follow-up needed: add canonical contract/fixture pair for displayed-odds and percentage-boost
    modes

- Multi-fixture, outright and long-duration sportsbook support:
  - planning exists in `docs/planning/account-extra-places-fund-manager-discovery.md`
  - issue tracking exists in the next-issue register
  - missing: dedicated workflow contract and fixture spec for route/editor/report behaviour

- Account quick-popup and bookmaker account hygiene workflow:
  - partial support exists via:
    - `docs/contracts/account-health-intelligence-contract.md`
    - `docs/contracts/account-health-review-contract.md`
    - `docs/fixture-specs/account-health-intelligence-fixture-spec.md`
    - `docs/fixture-specs/account-health-review-fixture-spec.md`
  - missing: a dedicated workflow contract for the popup/editor interaction inside ledgers and
    profile/account flows

- Source ingestion beyond the baseline contract:
  - public offer ingestion is covered at the baseline level
  - missing: explicit workflow/addendum for curated sources such as Oddschecker welcome offers,
    reload offer pages and Discord intake/routing

## Coverage gaps that should be treated as next contract work

- Route-guard replacement for browser-native confirms:
  - current UI intent is well understood
  - no dedicated contract/fixture pair yet exists for the in-app route guard pattern

- Standalone calculator variants beyond the main sportsbook/free-bet reuse path:
  - calculator workspace bridge contract exists
  - specialist variants such as sequential lay, full each-way editor behaviour and richer profit
    boost workspace states still need issue-by-issue fixture coverage

## Live-issue alignment note

The live GitHub issue list is broadly aligned with the local planning register. The main risk is not
missing ideas; it is inconsistent depth of supporting contracts.

The practical rule going forward should be:

1. every open money-impacting issue must point at a contract;
2. every workflow-heavy issue must point at a workflow contract;
3. every approved implementation issue must point at at least one fixture spec or test fixture set;
4. planning-only notes must not be mistaken for implementation-ready contract coverage.

## Recommended next documentation moves

- Add a dedicated multi-fixture/outright sportsbook workflow contract.
- Add a dedicated account quick-popup workflow contract.
- Add a source-ingestion addendum covering approved public sources and Discord intake policy.

## Update

The Profit Boost gap is now closed with:

- `docs/contracts/sportsbook-profit-boost-contract.md`
- `docs/fixture-specs/sportsbook-profit-boost-fixture-spec.md`
