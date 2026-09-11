# Workflow Contract: Calculator Workspace and Ledger Bridge

_Last updated: 2026-09-11_

## Status and scope

- Status: Draft, implementation-ready by approved calculator family
- Milestone: M14 Calculator Workspace and Ledger Bridge
- Plum Duff issue coverage: GitHub issues `#35`, `#36`, `#37`, `#38`, and `#83`
- Oddsmatcher integration: Deferred
- Implemented families: Fund Manager-owned `Standard` (the existing matched-betting
  contract/API), Multi-Lay, and combined Each Way / Extra Place reference calculators
- Canonical route: `/fund-manager/calculators`; the retired Profile route redirects safely
- Ledger bridge: one #36 adapter now covers Standard/Multi-Lay → Sportsbook Prospecting, Each Way /
  Extra Place → its native Prospecting ledger, and completed Blackjack Free/Live → Casino activity

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

Top-level navigation represents distinct calculation models, not every variation. The user-facing
`Standard` keeps its matched-betting bet and matching modes internally; Each Way contains the Standard Each Way and Extra
Place modes; Multi-Lay contains its Standard and Underlay allocation modes. The family rail pages
through at most three choices without a native scrollbar and retains every family for keyboard use.

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
- Every implemented family recalculates automatically once its active required inputs are valid.
  Invalid/incomplete edits remove stale results, and superseded requests cannot restore them.
- Matching families resolve active Exchanges from the master Account Catalogue. Smarkets is the
  system default with `0` suggested commission; a user-entered commission remains an ephemeral
  override until the Exchange itself changes.
- Every family ends with its contract-backed `Outcomes` presentation; rows vary by economic branch
  rather than being forced into a generic two-outcome shape. Standalone and embedded calculators
  render those scenarios through the shared Extra Places-authority Outcomes shell and row primitive.
- Entering Bonus Lock-In seeds the ephemeral bonus/refund value from Back Stake. It follows stake
  edits only while untouched; a manual override remains authoritative until calculator Reset.
- Reset affects only the selected calculator: it cancels pending preview work, restores calculator
  defaults and canonical Exchange suggestion, clears local result/error/feedback state, and performs
  no ledger or settings mutation.

## Ledger bridge

### Authoritative conversion matrix

This matrix is the conversion boundary for the currently exposed workspace. `Multi` means the
existing #77 flow may create one independent Prospecting row per authorised Profile; completed
activity is always `Single`.

| Source family / mode | Classification | Destination | Profile / Account | Action | Adapter status / blocker |
|---|---|---|---|---|---|
| Standard: Qualifying, Standard / Underlay / Overlay / Custom / one Part Lay | `CONVERTIBLE NOW` | Sportsbook Prospecting | Multi / Bookie + Exchange | Convert to opportunity | Native strategy and explicit custom/part stake fields |
| Standard: Free Bet SNR / SR | `CONVERTIBLE NOW` | Free Bets Prospecting | Multi / Bookie + Exchange | Convert to opportunity | Native retention mode and matching fields |
| Standard: Cashback; Money Back compatibility; Bonus Lock-In when back loses | `CONVERTIBLE NOW` | Sportsbook Prospecting | Multi / Bookie + Exchange | Convert to opportunity | Governed Cashback or Bonus Lock-In destination branches |
| Standard: Bonus Lock-In when back wins | `BLOCKED — SOURCE MODE UNSUPPORTED` | None | None | None | #37/#113 has no approved inverse-trigger equation; server rejects it |
| Standard: Profit Boost, displayed / return-derived / profit-derived / percentage-derived | `CONVERTIBLE NOW` | Sportsbook Prospecting | Multi / Bookie + Exchange | Convert to opportunity | Native displayed/percentage path; temporary return/profit derivation is preserved in source and applied as explicit derived odds |
| Multi-Lay: Standard / Underlay, two or three outcomes | `CONVERTIBLE NOW` | Sportsbook Prospecting | Multi / Bookie + Exchange | Convert to opportunity | Native multi-outcome fields preserve every exposed branch |
| Extra Place / Each Way | `CONVERTIBLE NOW` | Each Way / Extra Place Prospecting | Multi / Bookie + Exchange | Convert to opportunity | Native mode, terms, places and win/place legs |
| Sequential Lay: Standard / Lock In | `BLOCKED — DESTINATION CONTRACT MISSING` | None | None | None | Sportsbook cannot persist ordered conditional legs |
| Early Payout / 2UP: Exchange Lay / 2-Way Dutch | `BLOCKED — DESTINATION CONTRACT MISSING` | None | None | None | Existing Draft contract does not persist modelled trigger, live position, slider and part backs losslessly |
| Multiples / Accumulator | `BLOCKED — DESTINATION CONTRACT MISSING` | None | None | None | No ledger destination preserves selection states and accumulator structure |
| Dutching: Normal / SNR Free Bet | `BLOCKED — DESTINATION CONTRACT MISSING` | None | None | None | No ledger destination preserves multiple bookmaker back positions |
| Odds / Probability | `UTILITY ONLY` | None | None | None | Conversion would invent business identity |
| Blackjack Simulation | `UTILITY ONLY` | None | None | None | Simulation is not real activity |
| Blackjack completed Free / Live Play | `CONVERTIBLE NOW` | Casino settled activity | Single / Casino-capable Bookie | Save as Casino activity | Existing immutable `blackjack-session-v1` adapter |

The shared bridge stores one canonical source envelope and SHA-256 identity per conversion target.
The source remains reference-only: the destination API validates required identity, Account access
and its own calculation contract. A successful `(source, destination kind, Profile, Account)` target
is idempotent; failed independent targets remain retryable and successful targets are not rolled back.

The implemented Standard and Multi-Lay paths permit one or more authorised Profiles. Governed
Sportsbook modes create isolated `Prospecting` Sportsbook rows, while SNR/SR creates its native
`Prospecting` Free Bets row after the same bookmaker/Exchange checks. Multi-Lay preserves every
represented outcome branch. Each Way / Extra Place uses its native destination, preserving mode,
stake, terms, bookmaker/exchange places, exchange/lay inputs and calculator provenance. The Blackjack path
accepts exactly one Profile and Casino Account for a completed Free/Live session, rejects Simulation,
requires promotion identity, maps own cash to `Manual Play / No Offer`, and preserves the exact
`blackjack-session-v1` source checksum. Each successful target produces one durable Notification.

1. User calculates and selects `Convert to opportunity` (or the family-appropriate save action).
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
- canonical decimal calculation/storage; calculator entry also accepts exact fractional odds and
  an unambiguous one- or two-decimal comma, normalising visibly to decimal before calculation;
- bounded tables and result cards with no page-level horizontal scroll;
- copy actions with inline feedback, not editor-modal toasts;
- accessible names and stable `data-pd-id` identifiers.

Any visual change made to the Sportsbook Matching calculator must be assessed for standalone
calculator reuse before handoff.

## Calculator odds entry (`calculator-odds-normalization-v1`)

- Decimal input remains unchanged (`3`, `3.1`, `3.75`).
- Fractional `a/b` becomes `1 + a/b`, rounded half-up to the approved two-decimal odds display
  (`11/4 -> 3.75`, `5/2 -> 3.50`, `10/11 -> 1.91`).
- A complete `digits,digit` or `digits,digits` value uses a decimal comma and becomes a full stop.
- Three or more digits after a comma remain ambiguous (`1,000`) and are rejected, as are mixed
  separators, whitespace, currency, scientific notation, non-finite values and zero denominators.
- This narrowly supersedes the earlier blanket comma rejection for calculator entry only. Existing
  ledger API payloads remain strict decimal until they deliberately adopt the shared normaliser.

## Current calculation boundary

The existing contracts resolve Standard, Underlay, Overlay, Custom and one explicit Partial Lay.
Multiple partial-lay executions remain blocked by the source fixture evidence and must not be
aggregated using invented maths. Back commission is likewise not present in the current canonical
Sportsbook/Free Bet calculation engines.

Multi-Lay accepts two or three mutually exclusive outcomes, matching the current Sportsbook
contract fields. Its standalone response exposes the canonical engine's stake, liability and
scenario value per branch plus the no-selection and conservative matched results. Each Way / Extra
Place delegates to `each-way-extra-place-ledger-contract`; place fraction and explicit place counts
remain separate inputs. Its reference response exposes the canonical bookmaker-win/bookmaker-place
and exchange-win/exchange-place components needed by the shared family outcome matrix. Both
adapters are reference-only and perform no business writes.

Bridge classification is deliberately lossless. Governed Standard modes (including native Free Bet
SNR/SR), Multi-Lay, Each Way / Extra Place and completed Blackjack Free/Live sessions are
convertible now. Bonus Lock-In when the back wins is source-blocked. Odds / Probability is a utility and has
no destination action. Sequential Lay is blocked because Sportsbook cannot persist ordered,
conditional legs; Early Payout / 2UP is blocked because its trigger, live-position and part-back
state remain Draft-only; Multiples is blocked because no destination preserves selections and their
states; Dutching is blocked because no destination preserves multiple bookmaker back positions.
None may be flattened into an ordinary Standard row.

Every standalone family reuses or extracts its nearest same-family ledger presentation. The Each
Way / Extra Place wrappers share Back Bet, Place Terms, Lay Win, Lay Place and Outcomes primitives;
Profile accounts, capability warnings and persistence remain ledger-wrapper responsibilities.

## Blackjack session source contract (`blackjack-session-v1`)

Blackjack strategy remains independent of session mode:

- `simulation` is the default, contains no money fields, remains browser-session-local and is not
  eligible for conversion;
- `free_play` describes actual free chips/credit. `free_credit_value` is not user cash stake, while
  optional `withdrawable_result` records only real cash/value produced;
- `live_play` records optional per-hand starting stake and gross return (including returned stake),
  plus reviewed session starting/ending balances. Ordinary Win returns `2 × committed stake`, Push
  returns committed stake, Loss/Bust returns zero and Surrender returns half the committed stake.
  Natural `Blackjack Win` uses the explicit session payout, defaulting to `1:1`, with common `3:2`,
  `6:5`, `2:1` and validated positive custom profit-multiplier choices. It returns stake plus the
  selected profit multiplier. This selector never changes an ordinary Win's fixed `1:1` return.
  Derived returns round half-up to GBP `0.01`; an
  explicitly entered Actual Return overrides the derived reference and its provenance is retained.
  The authoritative reviewed session result remains exact `ending_balance - starting_balance`.

Only an actually chosen Double doubles committed stake. Each actual split hand carries its own
starting stake and return. Recommendations never change money. Free Play uses the same arithmetic
only as chip/credit accounting and never promotes that return to withdrawable cash. Complete
per-hand returns may be compared with balance movement as informational reconciliation; they never
silently replace the balance result.
Digital/RNG versus Live Dealer is optional delivery provenance and does not alter strategy. It is
independent from the session's optional activity/funding source: `free_credit`, `promotion`, or
`own_cash`. No source is inferred from session mode or table type; an unset source remains `null`.

`buildBlackjackSessionSourceSnapshot` produces canonical sorted JSON and a SHA-256 identity over
calculator/version, mode, timestamps, rules (including payout preset and custom multiplier), activity source,
table type, immutable hand history, last calculator-only deal shortcut, per-hand return provenance/net result, counts and mode-appropriate
cash or credit totals. It strips money and conversion provenance from Simulation. The
additive activity-source input is optional so existing `blackjack-session-v1` callers and stored
browser state continue to load with honest `null` provenance. The later `#36` bridge captures this
snapshot only at reviewed conversion time and remains responsible for Profile/Account authorization,
idempotency, notifications and record creation.

The current Casino ledger string authority needs no database migration: promotional activity keeps
its approved offer type, Free Play maps to `Fixed Spins Or Free Play`, and Live Play maps to the
controlled `Manual Play / No Offer` type. A reviewed activity name may describe the Blackjack
session; it must not masquerade as an offer. Completed Free/Live sessions may later become settled
Casino activity rather than a prospecting Opportunity.

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
