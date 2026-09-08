# Sequential Lay calculation contract

Status: verified against the live source calculator on 2026-09-08. Applies to the Fund Manager reference-only calculator; it creates no ledger record.

Source authority: the current [Sequential Lay calculator](https://matchedbettingblog.com/sequential-lay-calculator/) and its versioned implementation, interpreted with the [worked lifecycle guide](https://matchedbettingblog.com/sequential-laying/).

## Inputs and lifecycle

- Cash back stake and decimal back odds; optional bookmaker commission.
- At least two lay legs. Each leg has decimal lay odds and its own commission.
- `Standard`: each leg breaks even when it is the first losing selection; all winners retain the remaining result.
- `Lock In`: earlier legs use Standard; the final leg equalises the final-leg-loss and all-win branches subject to penny placement.
- A later leg is placed only if every prior selection wins. A first loss ends the sequence.

## Exact arithmetic and rounding

All arithmetic uses decimal values. `Cᵢ` is a fraction (5% = 0.05).

- Bookmaker all-win profit: `stake × (back odds - 1) × (1 - back commission)`, nearest penny.
- Standard leg: `ceil₂((stake + sum(prior liabilities))/(1-Cᵢ))`.
- Lock In final leg: `ceil₂((stake + rounded bookmaker profit)/(lay oddsᵢ-Cᵢ))`.
- Lay win: `floor₂(lay stake × (1-Cᵢ))`.
- Liability: `floor₂(lay stake × (lay oddsᵢ-1))`.
- Each floored liability is fed into the next Standard recurrence. Scenario totals display nearest penny.

The current source calculator is the black-box authority for directional penny placement. Its 3-leg live output is £9.20 all-win and £6.02/£6.03 Lock In; the older guide's approximate £9.18 and £6.01/£6.02 narrative is retained as historical evidence, not substituted for the current implementation.

There is no source-backed business maximum leg count. The API requires a minimum of two and imposes no calculator-domain maximum.

## Outcomes

Rows are `Leg 1 loses` through `Leg N loses`, followed by `All legs win`. Each exposes bookmaker, applicable exchange-leg components, and total through the shared Outcomes presentation. Values are references, not evidence that a lay was placed.
