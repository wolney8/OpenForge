# Workflow Contract: Calculator Workspace and Ledger Bridge

_Last updated: 2026-07-14_

## Status and scope

- Status: Draft, ready for human review
- Milestone: M14 Calculator Workspace and Ledger Bridge
- OddsForge integration: Deferred

## User goal

Use contract-backed matched-betting calculators independently, copy suggested lay values, or transfer reviewed calculator inputs into a new profile-scoped ledger draft without retyping them.

## Calculator registry

The workspace may expose a calculator only when its financial contract and deterministic fixtures are approved. Initial registry candidates:

- standard/qualifying sportsbook
- free bet SNR and SR
- refund/bonus lock-in
- cashback
- DDHH
- multi-lay and multi-lay underlay
- 2UP/early payout
- BOG
- each-way and extra places

Sequential lay, dutching, blackjack and other future calculators remain unavailable until their own contracts and fixtures are approved.

## Standalone mode

- Calculator inputs may remain ephemeral with no profile selected.
- Results are reference values, not actual placement or ledger values.
- Copy actions copy a clearly labelled value only.
- No standalone calculation changes profile balances, reports or exposure.

## Ledger bridge

1. User calculates and selects `Create sportsbook row` or `Create free-bet row`.
2. User selects/retains a target profile.
3. OpenForge creates an unsaved bridge payload, not a database row.
4. Map calculator fields into calculator/reference fields.
5. Show mapped fields as reviewed calculator inputs while requiring offer identity, bookmaker/account eligibility, dates, statuses and any missing workflow fields.
6. Re-resolve profile exchange commission and rerun the ledger contract.
7. Allow the user to unlock/edit mapped calculation inputs explicitly.
8. Save only through the normal ledger workflow.

## Field authority

- Suggested lay remains `reference_lay_stake` until the user confirms an actual placed/matched stake.
- Calculator scenario P&L must not become settled/final P&L.
- Profile commission/settings override a stale standalone default and trigger recalculation.
- Strategy/offer mapping must be explicit; an ambiguous calculator family requires user selection.

## Tests and Playwright path

- each registered calculator references an approved contract
- copy action returns the intended standard/underlay/overlay branch
- bridge preserves input precision and calculator family
- profile selection re-resolves exchange commission
- no database row exists before normal ledger save
- ambiguous destination mapping blocks save
- current/projected and settled/final fields remain separate
- UI: calculator -> calculate -> copy value -> bridge -> select profile -> complete required identity -> save ledger draft

