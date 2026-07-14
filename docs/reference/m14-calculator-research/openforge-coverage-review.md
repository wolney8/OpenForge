# M14 Calculator Research Coverage Review

_Reviewed: 2026-07-14_

## Decision summary

The packets are useful browser observations, but they are not one uniform
fixture pack. OpenForge readiness is assessed independently from each packet's
raw `validation_state`.

| Calculator/mode | Evidence review | Existing OpenForge owner | Fixture state | Next gate |
|---|---|---|---|---|
| TeamProfit Normal | Reactive; standard equation reproduced; live spot-check matched packet | sportsbook current value | Accepted reference | Reconcile provider penny rounding only |
| TeamProfit Free Bet SNR | Reactive; SNR equation reproduced | free-bet current value | Accepted reference | Add standalone M14 UI tests when implemented |
| TeamProfit Refund | Reactive; refund-retention equation reproduced | M14 refund draft | Contract draft | Approve award meaning, retention default, rounding |
| TeamProfit partial match | Control exists but no cases captured | sportsbook partial-lay behaviour | Blocked | Capture one- and two-part-lay cases |
| MBB matched-betting comparison | Normal/SNR values useful only for provider comparison | existing sportsbook/free-bet contracts | Research only | Do not define provider precedence |
| MBB risk-free | All-zero anomaly | refund draft | Blocked | Verify selected mode and required award inputs |
| MBB each-way | Reactive dual-leg outputs; exact equation unresolved | sportsbook each-way draft | Research only | Reconcile formulas, terms, and rounding |
| MBB extra place | No observed mode-specific difference | sportsbook extra-places draft | Blocked | Capture extra-place-only contrasting result |
| MBB sequential lay Standard/Lock In | Values captured; input/leg model and equations unresolved | none | Blocked | Create dedicated contract only after branch derivation |
| MBB early payout / 2-way dutch | Captured values match ordinary equal-profit shape; no 2UP branch evidence | sportsbook 2UP draft | Blocked | Capture advanced trigger/dutch branches |
| MBB accumulator variants | Non-reactive default totals | none | Blocked | Repeat capture with verified reactive inputs |
| MBB odds converter | Reactive; standard transforms reproduced | M14 odds converter draft | Accepted reference | Approve fraction approximation and `+` normalisation |

## Semantic corrections

1. The packet field `validation_state: pass` records a completed browser
   observation. It is not OpenForge financial approval.
2. The accumulator baseline `10.00 -> 160.00` is consistent with four default
   even-money selections, not the changed fractional inputs recorded in later
   cases. Those later cases are therefore not deterministic fixtures.
3. The early-payout packet does not evidence a 2UP trigger branch. Its ordinary
   lay stake and equalised totals cannot validate the OpenForge 2UP contract.
4. The extra-place packet cannot validate an extra-place-only outcome because
   its core outputs match the ordinary each-way observations.
5. The TeamProfit Refund observations support:
   `lay = (back stake * back odds - award * retention) / (lay odds - commission)`.
   This is a future-award reference model, not cash-first current tracker value.
6. The TeamProfit page currently exposes `part_lays_toggle` in its DOM. The
   original limitation is narrowed to “not captured”, rather than “control not
   available”.
7. TeamProfit lay stakes reproduce the candidate equations, while some headline
   profits differ by up to GBP `0.02` depending on whether displayed or hidden
   precision is reused. This is an external reconciliation note, not an
   OpenForge rounding rule.

## Missing calculator-specific coverage

- sequential lay Standard and Lock In calculation contract plus deterministic fixtures
- accumulator standard/each-way/Rule 4 numerical contract plus fixtures
- extra-place mode-specific calculator fixtures
- 2UP/dutch trigger and auxiliary-output calculator fixtures
- TeamProfit partial-match reference cases

These gaps do not block the existing workbook-led Tracker. They block only the
corresponding M14 standalone calculator from entering the calculator registry.
