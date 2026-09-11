# Issue #113 independent calculator verification audit

_Audit date: 2026-09-10. Scope: every calculator family and significant mode exposed by the
Fund Manager Calculator Workspace at commit `1ef9c4e`. This is evidence, not a formula change._

## Method and evidence boundary

- Expected values in `calculator-independent-verification-v1.json` were hand-derived from the
  signed-off equations below. Production calculation functions were used only as the system under
  test. The public preview APIs supplied actual values.
- Current external source artifacts were fetched independently. MBB SHA-256 values were:
  Sequential Lay `f7609f…9da7`, Early Payout `51e9b4…338`, Each Way `a5f931…c56`, Odds Converter
  `99bfd1…dd206`, and Standard `225852…64bed`. The first two exactly match the signed-off source
  artifacts. Outplayed Blackjack `bsc2.js?v=1703159804` is `af5d2c…304e`; its current hard, soft,
  pair, surrender and H17/S17 tables were used directly.
- Current MBB browser black-box checks used synthetic inputs. For £10 @ 4.00, lay 4.20, 2%, MBB
  displayed Standard `9.57 / -0.62 / -0.63`, Underlay `9.37`, Overlay `10.21`; OpenForge's
  workbook-authoritative values differ as recorded below. For Each Way £10 @ 6.00, 1/5, lay
  2.30/4.50 at 0%, MBB displayed stakes `26.09/4.44` and outcomes `10.55/10.55/10.53`.
- `PASS` means the independent expected result and actual API result match the governing OpenForge
  authority. External disagreement cannot override the workbook/approved contract and is explicit.
  `BLOCKED` means no approved deterministic authority exists. `FAIL` means actual presentation does
  not equal the approved expected output.

Current external references: [MBB Bet Calculator](https://matchedbettingblog.com/bet-calculator/),
[MBB Each Way Calculator](https://matchedbettingblog.com/each-way-calculator/),
[MBB Sequential Lay Calculator](https://matchedbettingblog.com/sequential-lay-calculator/),
[MBB Early Payout Calculator](https://matchedbettingblog.com/early-payout-calculator/),
[MBB Odds Converter](https://matchedbettingblog.com/odds-converter/),
[Outplayed Dutching guide](https://outplayed.com/dutching-calculator-guide),
[Outplayed Blackjack calculator](https://outplayed.com/blackjack-strategy-calculator), and
[Outplayed Blackjack guide](https://outplayed.com/blackjack-basic-strategy-calculator-guide).
The follow-up authority pass also used the current
[TeamProfit calculator](https://www.teamprofit.com/calculator),
[TeamProfit refund guide](https://www.teamprofit.com/welcome-offers/refunds-offers-guaranteed-profit-method),
and [MBB matched-betting calculator](https://matchedbettingblog.com/matched-betting-calculator/).

## Independent equations and rounding

- Standard: `L=round2(B×Ob/(Ol-c))`; Underlay `round2(B×(Ob-1)/(Ol-1))`; Overlay
  `round2(B/(1-c))`; explicit Custom/Part Lay uses entered `L`. Liability and branches round half-up
  to pennies after lay-stake placement; current value is the minimum branch.
- Free Bet: SNR base `round2(B×(Ob-1)/(Ol-c))`; SR base `round2(B×Ob/(Ol-c))`; under/overlay
  multiply the rounded base by the approved factor and round again. Explicit strategies use entered
  `L`.
- Cashback adds only its explicit value to the selected trigger branch. Approved back-loses Bonus
  Lock-In uses `R=A×r`, then places `L=round2((B×Ob-R)/(Ol-c))`; liability and both branches derive
  from that placed stake. Reward-if-back-wins remains unapproved.
- Profit Boost: displayed odds are direct; total-return odds are conservatively floored to 2dp;
  profit-only is `1+profit/B`; percentage is `1+(base-1)×(1+pct)` after the explicit money cap.
- Multi-Lay Standard uses `round2(B×Ob/(Oli-c))` per branch. Underlay solves the common allocation
  denominator `Σ((1-c)/(Oli-c))`; placed stakes/liabilities/returns then round to pennies.
- Each Way derives `place odds=1+(Ob-1)×numerator/denominator`, places win/place lay stakes to
  pennies, rounds each component, then sums scenario components.
- Sequential Standard uses `ceil2((B+prior floored liabilities)/(1-ci))`; Lock In replaces the
  final formula with `ceil2((B+rounded back profit)/(Oi-ci))`. Lay wins/liabilities floor to pennies.
- Early Payout consumes each displayed penny result. The signed-off source contract defines the
  piecewise trigger equation, cap, part-back, 0–150% adjustment and 2-way Dutch branch.
- Accumulator multiplies Winner odds, Void by `1`, and Loser by `0`. Dutching uses effective odds
  `1+(odds-1)×(1-c)`, omits returned stake for the first SNR free bet, rounds placed stakes to the
  selected increment, and floors returns to pennies.
- Odds conversions retain exact rational/decimal source precision. Blackjack uses the current
  published lookup cells; no P&L/session outcome is part of strategy correctness.

## Family and mode matrix

| Family | Mode | Authority | Fixture | Expected | Actual | Rounding | External parity | Status | Follow-up |
|---|---|---|---|---|---|---|---|---|---|
| Standard | Standard | Sportsbook workbook contract | AUD-STD-01 | L 9.57; P&L -0.62/-0.62 | exact | half-up penny | MBB lay-win -0.63; documented authority difference | PASS | none |
| Standard | Underlay | Sportsbook workbook contract | AUD-STD-02 | L 9.38; P&L -0.02/-0.81 | exact | stake then components | MBB L 9.37; documented | PASS | none |
| Standard | Overlay | Sportsbook workbook contract | AUD-STD-03 | L 10.20; P&L -2.64/0.00 | exact | half-up penny; rounded zero canonicalised | MBB L 10.21; documented | PASS | #105 delta verified |
| Standard | Custom | Sportsbook contract, explicit actual lay | AUD-STD-04 | L 9.00; P&L 1.20/-1.18 | exact | entered stake, penny branches | UNVERIFIED current MBB | PASS | none |
| Standard | Part Lay (one exposed leg) | Sportsbook contract | AUD-STD-05 | L 4.00; P&L 17.20/-6.08 | exact | entered stake, penny branches | UNVERIFIED current MBB | PASS | multi-part remains outside exposed contract |
| Standard | Free Bet SNR, all exposed strategies | Free Bet workbook contract | AUD-FB-01/03/04 | base 7.18; under 6.66; over 9.33 | exact | rounded base, then factor | UNVERIFIED current external | PASS | none |
| Standard | Free Bet SR, all exposed strategies | Free Bet workbook contract | AUD-FB-02/05/06 | base 9.57; Custom 9.00; Part 4.00 | exact | rounded base/entered actual | UNVERIFIED current external | PASS | none |
| Standard | Bonus Lock-In: Normal, back loses | Outplayed Bonus Lock-In calculator/source + signed M14 contract | AUD-BONUS-LOSE; £5 @ 9.24/10.5, £5 reward, 70%, 0% | Standard 4.07; Underlay 1.50; Overlay 4.34 | exact | selected lay rounded half-up to penny before liability/outcomes | live source controls/formulas and independent branch equations agree at 0% | PASS | nonzero-commission lower endpoint follows exact division, documented against source approximation |
| Standard | Bonus Lock-In: Normal, back wins | Outplayed Bonus Lock-In calculator/source + signed M14 contract | AUD-BONUS-WIN; same fixture | Standard 4.73; branches -0.24/-0.27 | exact | selected lay rounded half-up to penny before liability/outcomes | current source explicitly exposes Wins and independently derived inverse branch agrees | PASS | none |
| Standard | Bonus Lock-In: Free Bet SNR | Outplayed public calculator/source + signed M14 contract | same fixture, loses/wins | loses L 3.59, branches 7.10/7.09; wins L 4.26, branches 4.23/4.26 | exact | same placement order | source explicitly exposes Free Bet SNR | PASS | advanced capital-target endpoints unsupported; SR unsupported |
| Standard | Money Back API compatibility | approved back-loses Bonus Lock-In contract | AUD-MONEY-BACK | exact alias: L 7.89; branches 4.75/4.73 | exact | same governed path | MBB/TeamProfit “money back if loses” semantics | PASS | alias retained; not a separate engine |
| Standard | Cashback | Sportsbook cashback branch | AUD-CB-01 | base -0.62; trigger 4.38 | exact | standard hedge then +5.00 | N/A exact external | PASS | trigger vocabulary remains contract-bounded |
| Standard | Profit Boost: displayed odds | Profit Boost contract | AUD-PB-01 | 3.2000; L 7.66; result -2.51 | exact | odds 4dp; money 2dp | N/A exact external | PASS | none |
| Standard | Profit Boost: total return | Profit Boost/payout contract | AUD-PB-02 | floor(27.86/10)=2.78; result -3.48 | exact | odds floor 2dp before hedge | N/A | PASS | none |
| Standard | Profit Boost: profit-only | Profit Boost contract | AUD-PB-03 | 1+22/10=3.2000 | exact | exact derive then 4dp | N/A | PASS | none |
| Standard | Profit Boost: percentage | Profit Boost contract | AUD-PB-04 | 1+(3-1)×1.10=3.2000 | exact | capped extra profit penny, odds 4dp | N/A | PASS | none |
| Standard | Profit Boost: accepted precedence | Profit Boost contract | existing API fixture | accepted 3.1800 overrides derivation | exact | accepted odds 4dp | N/A | PASS | none |
| Multi-Lay | Standard, 2/3 outcomes | Sportsbook workbook contract | AUD-ML-01 | stakes 16.33/13.56; min 18.38 | exact | per-branch penny placement | N/A exact external | PASS | none |
| Multi-Lay | Underlay, 2/3 outcomes | Sportsbook workbook contract | AUD-ML-02 | stakes 5.75/4.78; min 0.00 | exact | common allocation then penny | N/A | PASS | none |
| Extra Place / Each Way | Each Way | approved EWP fixture/contract | AUD-EW-01 | stakes 26.09/4.44; scenarios 10.54/10.55/10.53 | exact | component-first penny | MBB current first-place 10.55: 1p disagreement | PASS | retain authority difference |
| Extra Place / Each Way | Extra Place | approved EWP fixture/contract | AUD-EP-01 | extra-place 30.53; current 10.53 | exact | component-first penny, conservative min | current bundle/captured source documented | PASS | none |
| Sequential Lay | Standard | current MBB bundle + approved contract | AUD-SL-01 | 10.53/27.15/55.73; all-win 9.20 | exact | ceil stake; floor liability/win | current browser exact; bundle hash exact | PASS | none |
| Sequential Lay | Lock In | current MBB bundle + approved contract | AUD-SL-02 | 10.53/27.15/62.07; 6.02/6.03 | exact | final ceil; floor components | current hash equals black-boxed source | PASS | none |
| Early Payout / 2UP | Exchange Lay, pre-trigger | current MBB bundle + approved contract | AUD-2UP-01 | 49.56; 65.42; -2.92 | exact | displayed pennies consumed | current bundle hash exact | PASS | none |
| Early Payout / 2UP | Triggered, slider/cap/part backs | approved source fixtures | AUD-2UP-02/03/04 | add 95.82/68.73/72.48 | exact | piecewise, half-up pennies | current bundle hash exact | PASS | none |
| Early Payout / 2UP | 2-Way Dutch | approved source fixture | AUD-2UP-05 | 62.50 + 93.75; result 18.75 | exact | displayed pennies consumed | current bundle hash exact | PASS | none |
| Multiples | Accumulator core, Winner/Void/Loser | approved standalone family contract | AUD-ACC-01 | combined 9; settled return 30; profit 20 | exact | exact product, money half-up | UNVERIFIED current reactive MBB UI | PASS | Each Way/Rule 4/folds/bonuses are not exposed and remain blocked extensions |
| Dutching | Normal 2/3-way Simple + rounding | approved standalone family contract | AUD-DUT-01 + rounding fixtures | stakes 10/6.67; profit 3.33/3.34 | exact | stake selected increment; return floor | UNVERIFIED authenticated Outplayed calculator | PASS | Advanced remains unexposed/blocked |
| Dutching | Free Bet SNR 2/3-way Simple | approved standalone family contract | AUD-DUT-02 | stakes 10/10/5; each profit 15 | exact | first returned stake omitted | UNVERIFIED authenticated Outplayed calculator | PASS | none |
| Odds / Probability | Fractional/decimal/American/probability | approved M14 odds contract | AUD-ODDS-01..04 | 5/2↔3.50↔+250↔28.57; other exact cases | exact | retain source precision, display 2dp | current MBB bundle + accepted cases | PASS | none |
| Blackjack | Hard/soft/pair/surrender/H17/S17/Hit/fallback | current Outplayed matrices | AUD-BJ-01..07 | all published moves/fallbacks | exact | discrete lookup; Ace revaluation | current public JS exact | PASS | session/P&L deliberately excluded |

## Validation and result totals

The independent API harness covers expected-output and strict normalisation/rejection cases,
including governed Bonus Lock-In basis/trigger fixtures and one compatibility-equivalence case.
It covers fractional and simple-comma odds, malformed/partial
strings, blank odds, commission boundaries through existing contract fixtures, penny-sensitive
sequential placement, multi-leg states, Winner/Void/Loser, and Blackjack rule branches. The
focused rendered path additionally exercised Accumulator, Dutching and Blackjack auto-calculation,
odds normalisation, copy/reset behaviour, narrow containment and zero ledger writes against the
isolated audit API. Family-wide numerical evidence comes from the independent API harness, not that
representative browser path.

- **PROVEN PASS: 29 representative mode fixtures plus the bounded Bonus Lock-In basis/trigger grid above.** This is fixture evidence, not proof of every exposed strategy/input combination.
- **FAIL: 0 modes**
- **BLOCKED: 0 audited representative modes.** Bonus Lock-In Free Bet SR and SNR advanced capital-target strategies remain unsupported combinations, not silently covered by this count.
- **UNVERIFIED external comparisons: 8 matrix modes**

Assurance correction (2026-09-11): the earlier aggregate PASS count described representative
fixtures only. It did not establish every cross-product of backing basis, reward trigger, strategy,
commission and retention. The bounded grid above now covers Normal/SNR triggers; SR and SNR
advanced strategies remain fail-closed pending authority. Optional Accumulator Each Way/Rule 4/folds/bonuses and
Advanced Dutching remain deliberately unexposed, so they are not counted as exposed failures.
