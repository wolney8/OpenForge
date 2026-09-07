# Fixture Spec: Financial Value Presentation

_Last updated: 2026-09-07_

## Contract covered

- `docs/contracts/financial-value-presentation-contract.md`

| ID | Scenario | Expected result |
|---|---|---|
| FVP-001 | Positive GBP resolved value | `£ 10.00`, positive semantic token |
| FVP-002 | Negative GBP resolved value | `£ (1.29)`, negative semantic token |
| FVP-003 | Zero value | `£ -`, neutral semantic token |
| FVP-004 | Open row in a ledger table | `hourglass_top` Material Symbol, accessible `Current value`, green/red/neutral rounded value badge, whole-cell tooltip explaining cash-first open value |
| FVP-005 | Settled row in a ledger table | `done_all` Material Symbol, accessible `Final value`, green/red/neutral rounded value badge, whole-cell tooltip explaining settled result value |
| FVP-006 | Reduced motion, or a platform motion-off setting where available | Immediate static final value; no rolling transform |
| FVP-007 | First resolved positive value | Digits roll up once; one accessible final value |
| FVP-008 | Mixed currencies in aggregate | Aggregate blocked without exchange-rate contract |
| FVP-009 | First resolved negative value | Digits roll down once; one accessible final value |
| FVP-010 | Positive value changes `20 → 10` | Digits roll down because the value decreased |
| FVP-011 | Negative value changes `-20 → -10` | Digits roll up because the value increased |
| FVP-012 | Positive/negative sign transitions | After initial resolution, direction follows numeric increase/decrease |
| FVP-013 | Identical refetch, theme switch or ordinary rerender | No replay; exact final formatted value remains stable |
| FVP-014 | Zero | Neutral `£ -`; clipped placeholder may animate/replay without changing copied or accessible text |
| FVP-015 | Rapid successive updates | Stale motion is cancelled and the newest accessible final value wins |
| FVP-016 | User hovers or clicks an unchanged read-only value, including zero | Current digit/placeholder roll replays once; punctuation remains static |
| FVP-017 | Animated and plain equivalents for `£ 61.12`, `£ (14.01)` and `£ 3,450.50` at table and KPI sizes | Same inherited typography, line height and baseline; width/height differ by no more than rendering tolerance; spaces and punctuation remain natural width |
| FVP-018 | Fund Manager turns Financial motion Off | Preference survives a fresh read; all shared values remain exact and static |
| FVP-019 | Card or row contains multiple financial values | Pointer-enter/click replays every value in that group once; digit cascades remain internal |
| FVP-020 | Rapid replay/update or lost completion event | Previous work is cancelled; bounded fallback settles the newest exact value with no stale motion state |
| FVP-021 | Select/copy standalone value or surrounding sentence | Canonical formatted values appear exactly once; hidden digit strips never enter copied text |
| FVP-022 | Small pill, ledger badge, large KPI and inline sentence | Animated value remains within the existing line box and matches static geometry within rendering tolerance |
| FVP-023 | Hover/click occurs within the configured replay pause (default 1.5 seconds) after automatic or explicit motion | No replay; the cycle remains unchanged until the cooldown expires |
| FVP-024 | Positive or negative animation begins | Currency, accounting sign, punctuation and digit count remain fixed while every digit starts at zero; canonical accessible/selectable text remains the exact destination |
| FVP-025 | Pointer enters a text/non-money cell in a table row containing financial values | Every financial value in that row replays together; adjacent rows and non-money content remain unchanged |
| FVP-026 | Neutral `£ -` is loaded, hovered or clicked | Value remains neutral and static; no monetary origin or replay cycle is invented |
| FVP-027 | Fund Manager changes replay pause, roll duration or digit cascade | Bounded values persist, affect the shared odometer and survive a fresh authenticated read |
| FVP-028 | Pointer enters, stays within, leaves and re-enters a semantic replay group | All registered values/charts replay once per entry; movement between descendants does not restart; re-entry does |
| FVP-029 | A semantic replay group is clicked repeatedly | Every click cancels/restarts all nearest-group values/charts; no cooldown limits explicit container clicks |
| FVP-030 | Target and Module Mix progress bars resolve/replay | Each reveals from zero to its exact width; grouped bars use a short stagger; the leading highlight stops at settlement |
| FVP-031 | Progress ring resolves/replays | Arc sweeps from zero to the exact percentage and is static after settlement; accessible final label is unchanged |
| FVP-032 | Financial motion Off or reduced motion applies to progress charts | Exact final bar/ring state appears immediately with no reveal and no geometry change |
