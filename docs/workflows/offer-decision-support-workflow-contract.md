# Workflow Contract: Offer Decision Support

_Last updated: 2026-07-14_

## Status and scope

- Status: Deferred draft, human approval required before implementation
- Milestone: M12 Fund Manager Target Engine and Offer Decision Support
- Executes bets or casino play: Never

## User goal

Use target progress, time remaining, eligible account/offer availability, scenario P&L and an explicit risk posture to present explainable options such as standard, underlay, overlay or no recommendation.

## Required inputs

- approved target-progress output
- selected profile and date period
- validated offer/strategy combination
- contract-backed scenario outcomes and current value
- open exposure and bankroll controls
- account eligibility and known future reload availability
- explicit Fund Manager risk posture and maximum acceptable downside

## Decision boundary

- Recommendations are advisory and must show inputs, assumptions, downside and confidence/evidence limits.
- No recommendation may bypass a calculation contract or fixture.
- No auto-confirmation, bookmaker action, exchange action or casino spin action.
- The Fund Manager remains responsible for reviewing odds, eligibility and placement.
- A missing/stale/contradictory input returns `human_review_required`, not a guessed recommendation.

## Optional AI evidence

An AI API may later summarise approved public evidence such as fixture context or published market information. AI output:

- is supplementary evidence, never the calculation engine
- must include source links, retrieval time and uncertainty
- must not use bookmaker credentials, sessions or private profile data
- must not scrape prohibited sites or make an autonomous wagering decision
- must be ignored when unavailable without breaking deterministic target progress

## Recommendation states

- `standard_candidate`
- `underlay_candidate`
- `overlay_candidate`
- `no_lay_candidate`
- `avoid_or_defer`
- `human_review_required`

The scoring/threshold model that selects among these states is `To confirm` and requires a separate approved calculation contract before implementation.

## Audit and tests

Record target version, reporting basis, scenario values, risk limits, account eligibility, recommendation state, evidence timestamp and Fund Manager decision. Tests must cover ahead/on-track/behind periods, early/late period, low/high opportunity availability, missing evidence, stale evidence, exposure breach and profile isolation.

## UI rule

Present recommendation, reasons, possible upside, conservative downside and blocked assumptions together. Avoid celebratory or urgency-inducing gambling language.

