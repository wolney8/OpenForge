# Issue #113 independent calculator verification audit

_Audit date: 2026-09-10. Scope: every calculator family and significant mode exposed by the
Fund Manager Calculator Workspace at commit `1ef9c4e`. This is evidence, not a formula change._

## Method and evidence boundary

### 2026-09-12 manual checkpoint and Normal planning persistence

Verified baseline: `f7a3b35073ecc87cdf8f8f881129f221ec44d395` (matches fetched `origin/main`).
Protected branch: `manual/calculator-candidate-2026-09-12`.
Pristine worktree: `/Users/will_work/Scripts/Homelab/OpenForge/.worktrees/manual-calculator-baseline`.
Development stays in `.worktrees/multi-lay-normal-parity`, branch
`calculator/multi-lay-normal-parity`, on 3013/8013 with a separate synthetic database.
Do not pull/rebuild the baseline during Will's test session, reuse a mutable database across
revisions, or substitute the daily-use 3010/8010 database. No hosted acceptance evidence is claimed.

### Simple manual access — use this command, not the first-time seed recipe below

```sh
node /Users/will_work/Scripts/Homelab/OpenForge/.worktrees/multi-lay-normal-parity/scripts/open-manual-calculator.mjs
```

This verifies the full protected commit, reuses the existing synthetic fixture/runtime on
3020/8020 and brings an existing manual browser forward without navigating away from its hand.
If the browser was closed, its dedicated browser profile is reopened with the existing signed
synthetic session. Stopped services resume against the same database; no seed/reset runs.
An expired synthetic token is reissued using the existing session implementation without deleting
records or revoking another valid browser. Unknown occupied services fail closed, never get killed.
Current runtime: `/tmp/openforge-manual-f7a3b35.hUMolA/runtime`. Keep it for Monday. `--check`
verifies access without opening a window. No token is printed. No normal service is changed.

Original supplied recording files (private, not committed/copied):

- [HTML capture form](/Users/will_work/Scripts/Homelab/OpenForge/_input/calculator-comparison.html)
- [Excel alternative](/Users/will_work/Scripts/Homelab/OpenForge/_input/calculator-comparison.xlsx)
- [Supplied Markdown guide/worksheet](/Users/will_work/Scripts/Homelab/OpenForge/_input/calculator-manual-comparison-repaired.md)

Choose one capture format; retain parent case ID, tested full commit and date, and never overwrite
observations. The 79-run plan is bounded, not exhaustive. Bonus SR stays separately deferred.

#### Historical first-time provisioning recipe — do not run against the current session

The existing authenticated synthetic acceptance fixture prepared the baseline as follows. The
recipe is retained only for reproducibility on a genuinely new isolated runtime, not repeat access:

```sh
cd /Users/will_work/Scripts/Homelab/OpenForge/.worktrees/manual-calculator-baseline
git rev-parse HEAD
manual_runtime=$(mktemp -d /tmp/openforge-manual-f7a3b35.XXXXXX)
printf '%s\n' "$manual_runtime/runtime"
./scripts/run-python.sh scripts/run_notification_persistence_acceptance_api.py --port 8020 --runtime-directory "$manual_runtime/runtime"
```

```sh
cd /Users/will_work/Scripts/Homelab/OpenForge/.worktrees/manual-calculator-baseline/apps/web
OPENFORGE_AUTH_REQUIRED=true OPENFORGE_AUTH_OWNER_EMAILS=notification-acceptance@example.invalid OPENFORGE_AUTH_SESSION_SECRET=synthetic-notification-acceptance-secret-not-used-in-production OPENFORGE_INTERNAL_API_BASE_URL=http://127.0.0.1:8020 node node_modules/next/dist/bin/next dev --webpack --port 3020
```

In a third terminal, replace `PRINTED-RUNTIME` with the first terminal's printed directory. The
existing Playwright Chromium opens an interactive browser with the synthetic session without
printing/copying a token into this document or using OAuth:

```sh
cd /Users/will_work/Scripts/Homelab/OpenForge/.worktrees/manual-calculator-baseline
MANUAL_TOKEN_FILE=PRINTED-RUNTIME/session-token node --input-type=module -e 'import { chromium } from "@playwright/test"; import { readFileSync } from "node:fs"; const browser=await chromium.launch({headless:false}); const context=await browser.newContext(); await context.addCookies([{name:"pd_session",value:readFileSync(process.env.MANUAL_TOKEN_FILE,"utf8"),url:"http://localhost:3020"}]); const page=await context.newPage(); await page.goto("http://localhost:3020/fund-manager/calculators"); await new Promise(()=>{});'
```

URL: `http://localhost:3020/fund-manager/calculators`; health:
`http://127.0.0.1:8020/healthz`. Fixture `acceptance.sqlite3`, Profile/accounts/session are synthetic
and isolated; no real ledger records are loaded. The fixture's historical notification/reminder row
is test data, not a calculator oracle. Comparisons use existing worksheet inputs and
`tests/fixtures/calculator-independent-verification-v1.json`. Session tokens remain runtime-only
600-mode files and expire under the existing policy. Keep the runtime for the same test session;
use a fresh directory for another revision. No normal auth implementation, OAuth or hosting changes.

Capture files are now linked above from their original `_input` location; no private contents or
observations have been copied into this audit or the development worktree.

New slice: Normal, no boost/reward, Standard/Underlay, 2–20 legs; each leg commission survives
new creation/reopen with `multi-lay-v2` stamped in the existing JSON array. The shared v2 preview
supplies the embedded planning result. Actual placement, settlement and financial overrides fail
closed; v1 rows are not migrated. Source snapshot and retry identity remain unchanged.
Retest parent `MULTI-LAY-001`/`MULTI-LAY-002` on the development revision, including mixed/zero
commission, bridge/save/reopen/copy, and representative v1 embedded placement. Other calculator
mathematics are unchanged. External parity evidence remains the retained MBB 1p mismatch and
Outplayed UNVERIFIED; mathematical/save parity does not change either status or Will acceptance.
Remaining priority gaps include full v2 actual per-leg cash reconciliation, SNR/refund/boost/
Overlay/Custom persistence, and the existing Accumulator specialised bet/Each Way/Rule 4 coverage.

Native opt-in delta PD-FIX-112: Add Row remains v1 by default. In a new Bet & Get Normal
Multi Lay planning row, `Use v2 per-leg commission planning` explicitly selects the existing
versioned reference slice. Compatible draft odds/labels are retained; per-leg commission starts
from the current canonical Exchange setting, including explicit zero. Actual placements/overrides
cannot be opted in or overwritten. Existing rows have no opt-in. Shared v2 controls restrict the
saved strategy to Standard/Underlay; server validation blocks unsupported transitions.
Development retests under parents `MULTI-LAY-001` / `MULTI-LAY-002`: native Add Row default,
explicit opt-in, mixed/zero commissions, every leg, Standard/Underlay preview/copy/save/reopen,
blocked placement and v1 legacy default. Monday's f7 baseline does not contain this delta.

Delta evidence PD-FIX-111–113: 25 focused independent engine/API/v1 tests pass; native API
Standard/Underlay create→preview→save→reopen retains stakes/liabilities/all totals. Three isolated
browser paths pass: native Add Row opt-in→three legs→5%/2%/0%→copy→save→reopen; same-input
standalone/embedded parity; shared dense controls. Geometry is checked at desktop/half-width/
narrow, both themes, focus and reduced motion. Repeated manual launcher reuse retains its browser
tab, services and database, while validating real signed session authority (no mocked manual auth).
These are finite local fixtures/workflows, not external parity or Will acceptance.

Focused evidence: 23 Multi-Lay-related engine/API/v1 regression tests pass, including two
independently derived mixed-commission Standard/Underlay creation/save/reopen fixtures, explicit
zero, retry, no recognised cash and fail-closed placement/version removal/boost. The full existing
bridge family regression file passes 19 tests (no other family engine changed). TypeScript and
scoped Ruff pass. Two real isolated Playwright paths check the shared dense-cell track in
Sequential Lay/Dutching and same-input standalone versus embedded stakes, plus
native creation → embedded shared v2 → commission edit → live result → copy 16.33 → UI Save →
refresh/reopen at 1440/760/390px, light/dark, with no page overflow. This is finite local evidence,
not all-number proof, external parity, hosted verification or Will acceptance.

Branch checkpoints: `7028126732a3ba78f9333cb24de168d5f68637ee` (contract/API) and
`e360cb130015a74ce0b95b9e3ad2575db4c13364` (shared UI/docs), pushed separately from main.
Retest Sequential/Dutching narrow dense geometry alongside MULTI-LAY-001/002; their equations
are unchanged. Current-scope #35/#36/#38/#92/#113 comments are synced; issues remain open.

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
- Cashback adds only its explicit value to the selected trigger branch. Bonus Lock-In first keeps
  backing basis, reward and trigger separate. With retained value `R=A×r`, it solves
  `L=(back-win basis − back-lose basis + reward-on-back − reward-on-lay)/(Ol-c)`. Normal and SNR
  Underlay/Overlay endpoints target their governed zero/face-value branch; invalid non-positive
  endpoints remain unavailable. The selected lay is placed half-up to pennies before liability and
  displayed branch components, and the displayed total is the sum of those placed components.
- Profit Boost: displayed odds are direct; total-return odds are conservatively floored to 2dp;
  profit-only is `1+profit/B`; percentage is `1+(base-1)×(1+pct)` after the explicit money cap.
- Multi-Lay v2 uses effective odds `1+(Ob-1)×(1+boost/100)` and a backing basis of `B×O`
  (Normal), `B×(O-1)` (SNR), or `B×O-retained refund` (Money Back). Each unrounded Standard leg is
  `basis/(Oli-ci)`; source Underlay/Overlay or an explicit Custom multiplier scales all legs before
  stake/liability/return penny placement. The retained reward remains a separate outcome component.
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
| Standard | Bonus Lock-In: Free Bet SNR | Outplayed public calculator/source + signed M14 contract | same fixture, loses/wins | loses Standard/U/O 3.59/1.50/4.34; wins 4.26/4.18/5.00 | exact | exact Decimal stake/component placement | source strategy stakes agree at 0%; source binary liability and negative-sign presentation differences are documented | PASS | SR unsupported; exact `(1-c)` differs from source's nonzero-commission endpoint approximation |
| Standard | Money Back API compatibility | approved back-loses Bonus Lock-In contract | AUD-MONEY-BACK | exact alias: L 7.89; branches 4.75/4.73 | exact | same governed path | MBB/TeamProfit “money back if loses” semantics | PASS | alias retained; not a separate engine |
| Standard | Cashback | Sportsbook cashback branch | AUD-CB-01 | base -0.62; trigger 4.38 | exact | standard hedge then +5.00 | N/A exact external | PASS | trigger vocabulary remains contract-bounded |
| Standard | Profit Boost: displayed odds | Profit Boost contract | AUD-PB-01 | 3.2000; L 7.66; result -2.51 | exact | odds 4dp; money 2dp | N/A exact external | PASS | none |
| Standard | Profit Boost: total return | Profit Boost/payout contract | AUD-PB-02 | floor(27.86/10)=2.78; result -3.48 | exact | odds floor 2dp before hedge | N/A | PASS | none |
| Standard | Profit Boost: profit-only | Profit Boost contract | AUD-PB-03 | 1+22/10=3.2000 | exact | exact derive then 4dp | N/A | PASS | none |
| Standard | Profit Boost: percentage | Profit Boost contract | AUD-PB-04 | 1+(3-1)×1.10=3.2000 | exact | capped extra profit penny, odds 4dp | N/A | PASS | none |
| Standard | Profit Boost: accepted precedence | Profit Boost contract | existing API fixture | accepted 3.1800 overrides derivation | exact | accepted odds 4dp | N/A | PASS | none |
| Multi-Lay | Normal × Standard/Underlay/Overlay/Custom | MBB current bundle + `multi-lay-v2` contract | ML2-N-STD/U/O/C | stakes 16.33/13.56; 5.75/4.78; 42.19/35.04; custom 1.10× 17.96/14.92 | exact | unrounded allocation; stake/component half-up penny | live MBB Standard stakes exact; liability/outcomes/exposure differ 1p at half-penny fixture | PASS | embedded/conversion supports only compatible Standard/Underlay subset |
| Multi-Lay | Free Bet SNR × all four strategies | MBB current bundle + `multi-lay-v2` contract | ML2-SNR-STD/U/O/C | Standard 12.24/10.17; Underlay 0/0; Overlay 42.19/35.04; Custom 13.47/11.19 | exact | SNR stake excluded, then common allocation | MBB control present; exact black-box values pending worksheet | PASS | external exact comparison UNVERIFIED |
| Multi-Lay | Money Back × all four strategies | MBB current bundle + `multi-lay-v2` contract | ML2-MB-STD/U/O/C | retained £7; Standard 13.47/11.19; Underlay 1.73/1.43; Overlay 42.19/35.04; Custom 14.82/12.31 | exact | retained refund penny before allocation | MBB Cashback accepts already-retained £7; exact black-box values pending worksheet | PASS | destination cannot preserve reward provenance |
| Multi-Lay | Profit Boost + per-leg commission + 3/20 legs | MBB current bundle + `multi-lay-v2` contract | ML2-BOOST/VARIED/CAP | 10% makes 4.3000; varied custom stakes 17.74/14.92/7.46; cap 20 accepted/21 rejected | exact | boost before allocation; each commission independent | source controls/bundle verified; exact multi-axis black box UNVERIFIED | PASS | technical cap only |
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

## Configuration-matrix extension — 2026-09-11

`test_standard_calculator_configuration_matrix.py` independently derives, then calls the public
preview API for, these 60 exposed Standard configurations: Normal/SNR/SR × five strategies (15),
Bonus Normal/SNR × two triggers × five strategies (20), Cashback × five strategies (5), and four
Profit Boost sources × five strategies (20). It deliberately does not call production calculation
helpers to construct expected values. The prior independent fixture set supplies 25 non-Standard
family cases, for 85 distinct exercised configuration fixtures in the combined matrix.

The current public Outplayed Bonus calculator (bundle SHA-256
`522ebe7f06386f13c44e0c493609776dbf50a77c86d41750b11b000bcd784124`) black-boxed the required
£5/9.24/10.5/£5/70%/0% Normal case at Standard/Underlay/Overlay `4.07/1.50/4.34`, matching the
independent equations and platform. The same capture matched all six SNR trigger/strategy stakes.
It displayed `34.10` rather than exact half-up `34.11` for one SNR liability because its JavaScript
uses binary `toFixed`, and removes a genuine minus sign from two endpoint P&Ls; these are external
presentation mismatches, not OpenForge parity. Current MBB remains an additional comparison: its
Normal Standard/Underlay/Overlay outputs retain the already documented 1p authority differences.

Ten required Bonus Free Bet SR cells (two triggers × five strategies) remain **BLOCKED**: neither
current Outplayed controls nor an approved product contract defines that backing/reward combination.
Unexposed optional Accumulator Each Way/Rule 4/folds/bonus and Advanced Dutching stay listed below
but are not counted as exposed configuration cells. The editable observation worksheet is
[`calculator-manual-comparison.md`](calculator-manual-comparison.md).

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

- **REQUIRED CONFIGURATION CELLS: 106** (96 supported fixtures plus 10 required blocked SR cells)
- **TESTED: 96; PROVEN PASS: 96; FAIL: 0; BLOCKED: 10**
- **UNVERIFIED external comparisons: 10 matrix modes** (login-only, unavailable control, or no equivalent)

Assurance correction (2026-09-11): the earlier aggregate PASS count described representative
fixtures only. The new bounded matrix establishes the discrete exposed Standard routing cross-product
at its stated fixtures, including commission/retention and penny-edge regressions; it is not proof of
every possible numeric input. Bonus SR remains fail-closed pending authority. Optional Accumulator
Each Way/Rule 4/folds/bonuses and Advanced Dutching remain deliberately unexposed, so they are not
counted as exposed failures.

## Reference feature coverage inventory — Multi-Lay tranche, 2026-09-11

This bounded inventory records reference controls even when Plum Duff does not expose them. It does
not turn representative fixtures into exhaustive numeric proof.

| Feature/configuration | Reference | Status here | Standalone consumer | Embedded consumer | Contract/test | Follow-up issue |
|---|---|---|---|---|---|---|
| Normal/SNR/SR; Simple/Advanced; Custom/Part Lay; commission/copy/reset | MBB Standard + Outplayed | Present; external penny differences documented | Standard | Sportsbook/Free Bet | Standard contracts/config matrix | #35/#113 |
| Bonus Normal/SNR × loses/wins; 70% retention | Outplayed Bonus | Present; Bonus SR blocked | Standard Bonus | Sportsbook subset | Bonus contract/config matrix | #37 |
| Profit Boost four sources/cap/accepted odds | platform #83 + current references | Present | Standard | Sportsbook | Profit Boost contract/tests | #35 |
| Multi-Lay Normal/SNR/Money Back; boost; per-leg commission | MBB; Outplayed Normal/SNR subset | Present in v2 standalone; embedded partial | Multi-Lay + pop-out | Legacy v1; Normal Standard/Underlay v2 planning with per-leg commission | `multi-lay-v2`; ML2 fixtures | #38/#36 |
| Multi-Lay editable labels; 2–20 technical legs; copy/reset/help | MBB (20 source cap); Outplayed 2–4 | Present | Multi-Lay + pop-out | Dynamic v1 planner | API/UI cap and zero-write tests | #38 |
| Multi-Lay Underlay/Standard/Overlay/Custom; editable bounds/live slider | MBB | Present standalone; save/reopen blocked outside v1 subset | Multi-Lay + pop-out | Standard/Underlay only | ML2 strategy matrix/UI routing | #38/#36 |
| Multi-Lay component Outcomes and source exposure convention | MBB | Present standalone; embedded historical presentation retained | Multi-Lay + pop-out | v1 shared Outcomes shell | ML2 scenarios/exposure fixtures | #38/#113 |
| Extra Place/Each Way modes, terms, two commissions, Outcomes/copy/reset | MBB + workbook | Present | Extra Place / Each Way | native ledger | Each Way contract/audit | #35 |
| Sequential Standard/Lock In, per-leg commission, dynamic legs | MBB | Present | Sequential Lay | no equivalent new planner | Sequential contract/source fixtures | #39 |
| Early Payout trigger, lock-in slider, part backs, 2-way Dutch | MBB | Present | Early Payout / 2UP | Sportsbook reference subset | Early Payout contract | #38 |
| Accumulator core Winner/Loser/Void | MBB bet calculator | Present | Multiples | destination missing | Accumulator contract | #38/#36 |
| Accumulator Each Way/Rule 4/folds/acca bonus | MBB | Missing/blocked authority | none | none | no approved fixture | #38 |
| Dutching Normal/SNR Simple + rounding | Outplayed guide | Present | Dutching | destination missing | Dutching contract | #38/#36 |
| Dutching Advanced weighting/breakeven | Outplayed | Missing/blocked exact behaviour | none | none | no approved fixture | #38 |
| Fractional/decimal/American/probability conversion | MBB | Present utility | Odds / Probability | N/A | odds contract/audit | #35 |
| Blackjack hard/soft/pair/surrender/H17/S17/session | Outplayed tables | Present | Blackjack | Casino session destination | matrix/session fixtures | #40/#36 |

Multi-Lay delta totals: **13 required configuration cells; 13 tested; 13 PASS; 0 FAIL;
0 calculation BLOCKED**. Persistence/conversion is separately **PARTIAL**: two compatible Normal
strategies remain supported, while SNR, Money Back, boost, Overlay, Custom and differing per-leg
commission are fail-closed because the current Sportsbook destination cannot retain those fields.
