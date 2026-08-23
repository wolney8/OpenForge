# Workflow Contract: Calculator Workspace and Ledger Bridge

_Last updated: 2026-08-16_

## Status and scope

- Status: Draft, implementation-ready by approved calculator family
- Milestone: M14 Calculator Workspace and Ledger Bridge
- Plum Duff issue coverage: GitHub issues `#35`, `#36`, `#37`, `#38`, and `#83`
- Oddsmatcher integration: Deferred

## User goal

Use contract-backed matched-betting calculators independently, copy suggested lay values, or transfer reviewed calculator inputs into a new profile-scoped ledger draft without retyping them.

## Calculator registry

The workspace may expose a calculator only when its financial contract and deterministic fixtures are approved. Initial registry candidates:

- standard/qualifying sportsbook
- advanced sportsbook single-lay:
  - standard
  - underlay
  - overlay
  - custom lay
- multi-lay
- multi-lay underlay
- profit boost:
  - bookmaker shows boosted odds
  - bookmaker shows base odds plus boost percentage
  - reverse calculation from base odds, stake and boost percentage into reference boosted odds
- free bet SNR and SR
- refund/bonus lock-in
- cashback
- DDHH
- 2UP/early payout
- BOG
- each-way and extra places

Sequential lay, dutching, blackjack and other future calculators remain unavailable until their own contracts and fixtures are approved.

The first implementation slice should reuse the Sportsbook Matching calculator component as the
standalone calculator MVP. Free Bets should reuse the same calculator shell where the underlying
contract is SNR/SR matched betting. Casino calculators must remain separate because casino wagering,
reward conversion and RTP/EV planning use different contracts and are not lay calculators.

## Standalone mode

- Calculator inputs may remain ephemeral with no profile selected.
- Results are reference values, not actual placement or ledger values.
- Copy actions copy a clearly labelled value only.
- No standalone calculation changes profile balances, reports or exposure.
- Standalone calculator mode must not mark a back bet, lay bet, free bet, reward or casino result as
  placed.
- Profit Boost standalone mode must clearly label calculated boosted odds as `Reference`, not
  bookmaker-confirmed odds.

## Ledger bridge

1. User calculates and selects `Create sportsbook row` or `Create free-bet row`.
2. User selects/retains a target profile.
3. Plum Duff creates an unsaved bridge payload, not a database row.
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
- Advanced sportsbook copy actions may preselect a workbook-compatible strategy branch, but the
  ledger row still owns actual placement state.
- Multi-lay standalone calculations persist no branch placement state unless bridged into a profile
  row and completed in the normal ledger editor.

## UI parity

Standalone calculators must use the same calculator shell rules as ledger modal calculators:

- Outplayed-inspired back/lay/result structure;
- Plum Duff financial formatting and positive/negative/zero semantics;
- numeric-only decimal inputs with no comma coercion;
- bounded tables and result cards with no page-level horizontal scroll;
- copy actions with inline feedback, not editor-modal toasts;
- accessible names and stable `data-pd-id` identifiers.

Any visual change made to the Sportsbook Matching calculator must be assessed for standalone
calculator reuse before handoff.

## Tests and Playwright path

- each registered calculator references an approved contract
- copy action returns the intended standard/underlay/overlay branch
- bridge preserves input precision and calculator family
- profile selection re-resolves exchange commission
- no database row exists before normal ledger save
- ambiguous destination mapping blocks save
- current/projected and settled/final fields remain separate
- UI: calculator -> calculate -> copy value -> bridge -> select profile -> complete required identity -> save ledger draft

## Open implementation issue bodies

The live GitHub roadmap already contains the core M14 issues:

- `#35 Calculator Workspace: Add profile-scoped standalone calculators surface`
- `#36 Calculator Workspace: Create sportsbook draft row from calculator state`
- `#37 Calculator Contracts and Fixtures: Standalone calculator families`
- `#38 Advanced Calculator Backlog: Each-way, dutching, sequential lay, and later sportsbook expansions`
- `#83 Implement Profit Boost Offer Type and Calculator Flow`

If a new issue is needed after `#61`, use:

```markdown
## Title
Implement M14 standalone matched-betting calculator workspace MVP

## Body
Build the first Plum Duff standalone calculator workspace using the approved Sportsbook Matching
calculator shell.

Scope:
- Add a calculator route/surface reachable from the profile command menu and/or Fund Manager global
  navigation.
- Support Standard, Underlay, Overlay, Custom Lay, Multi Lay, and Profit Boost displayed/percentage
  modes where contracts and fixtures are approved.
- Keep standalone results ephemeral and reference-only.
- Copy lay stake or reference boosted odds with inline feedback.
- Bridge to unsaved sportsbook/free-bet drafts only through the existing ledger editor workflow.
- Reuse Plum Duff calculator, financial value, button, field, table and modal primitives.

Out of scope:
- Autonomous bet placement.
- Settled ledger writes from standalone calculator results.
- Casino EV/wagering calculators except as a separate contract-backed family.
- Unapproved advanced families such as each-way, sequential lay, 2UP, BOG and extra places.

Tests:
- Unit coverage for calculator-family availability and branch outputs.
- Playwright coverage for standalone calculate/copy/bridge.
- No horizontal overflow, clipped focus rings, or theme/accessibility regressions.
```
